const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const start=js.indexOf('function safeUrl('),end=js.indexOf('function validLink(');
const safeUrl=vm.runInNewContext(js.slice(start,end)+';safeUrl',{URL});

test('허용한 HTTPS 웹앱 주소만 연결한다',()=>{
  for(const url of ['https://example.org/','https://example.org/my-app/','https://script.google.com/macros/s/example/exec'])assert.equal(safeUrl(url),url);
  for(const url of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','file:///C:/test','http://example.org/','https://name:secret@example.org/','https://example.org/?token=secret','https://example.org/#secret','https://example.org/?student=001','not a url'])assert.throws(()=>safeUrl(url),url);
});
test('외부 전송·인라인 코드·폼 전송을 브라우저 정책에서 제한한다',()=>{
  for(const rule of ["default-src 'none'","script-src 'self'","style-src 'self'","connect-src 'none'","form-action 'none'","base-uri 'none'","object-src 'none'"])assert.ok(html.includes(rule),rule);
  assert.match(html,/<meta name="referrer" content="no-referrer">/);
  assert.doesNotMatch(html,/<script[^>]*>\s*[^<\s]/i);
  assert.doesNotMatch(html,/\bon(?:click|load|error|submit)\s*=/i);
  assert.doesNotMatch(js,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|eval)\s*\(/);
  assert.match(js,/window\.open\(safeUrl\(url\),'_blank','noopener,noreferrer'\)/);
});
test('배포 폴더에는 공개 화면 파일만 포함한다',()=>{
  assert.deepEqual(fs.readdirSync(path.join(root,'dist')).sort(),['.nojekyll','app.js','icon.svg','index.html','style.css'].sort());
  for(const name of ['app.js','icon.svg','index.html','style.css']){
    const source=fs.readFileSync(path.join(root,'dist',name),'utf8');
    assert.doesNotMatch(source,/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
    assert.doesNotMatch(source,/appgprj_|appgdep_|C:\\Users\\|@(?:gmail|naver)\.com|(?:010)[- ]?\d{4}[- ]?\d{4}/i);
  }
});
