/*
 * 기관별 강의 자료 생성기
 * 사용법: node build-org.js org-configs/<기관>.json
 *
 * llm-trends-template.html 의 {{토큰}} 자리를 config 값으로 채워
 * llm-trends-<기관>.html 을 만든다.
 *
 * config 형식은 org-configs/hanyang.json 참고.
 *  - tokens: {토큰명: 값} — 템플릿의 {{토큰명}} 치환
 *  - logoImages: [{file, height, alt}] — LOGO_HTML 토큰을 base64 img 태그로 자동 생성
 *  - output: 출력 파일명
 */
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2];
if(!configPath){ console.error('사용법: node build-org.js org-configs/<기관>.json'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

let h = fs.readFileSync(path.join(__dirname, 'llm-trends-template.html'), 'utf8');

/* 로고 → base64 img 태그 */
if(cfg.logoImages){
  const mime = { '.png':'image/png', '.gif':'image/gif', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.jpeg':'image/jpeg' };
  cfg.tokens.LOGO_HTML = cfg.logoImages.map(function(img, i){
    const b64 = fs.readFileSync(path.join(__dirname, img.file)).toString('base64');
    const m = mime[path.extname(img.file).toLowerCase()] || 'image/png';
    const cls = i === 0 ? ' class="logo"' : '';
    const style = img.height ? ' style="height:' + img.height + 'px; width:auto; display:block;"' : '';
    return '<img' + cls + ' alt="' + (img.alt || '') + '" src="data:' + m + ';base64,' + b64 + '"' + style + ' />';
  }).join('');
}
if(!('LANG_TOGGLE_HTML' in cfg.tokens)) cfg.tokens.LANG_TOGGLE_HTML = '';

/* 긴 HTML 조각은 별도 파일로 관리: tokenFiles: {토큰명: 파일경로} */
if(cfg.tokenFiles){
  for(const [name, file] of Object.entries(cfg.tokenFiles)){
    cfg.tokens[name] = fs.readFileSync(path.join(__dirname, file), 'utf8');
  }
}

/* 토큰 치환 */
const unresolved = [];
h = h.replace(/\{\{([A-Z0-9_]+)\}\}/g, function(_, name){
  if(name in cfg.tokens) return cfg.tokens[name];
  unresolved.push(name);
  return '{{' + name + '}}';
});

if(unresolved.length){
  console.error('⚠️ 값이 없는 토큰:', [...new Set(unresolved)].join(', '));
  process.exit(1);
}

fs.writeFileSync(path.join(__dirname, cfg.output), h);
console.log('✅', cfg.output, '(' + h.length + ' bytes)');
