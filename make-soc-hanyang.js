/* SoC워크샵(IEIE) 발표 자료 → 한양대학교병원 테마 변환 */
const fs = require('fs');
let h = fs.readFileSync('soc-draft-source.html', 'utf8');
const miss = [];
function rep(from, to, label, all){
  if(h.indexOf(from) === -1){ miss.push(label); return; }
  h = all ? h.split(from).join(to) : h.replace(from, to);
}

/* 1. 타이틀 */
rep('<title>AI 코딩 에이전트 활용 역량의 구조와 측정 — 2026 SoC워크샵</title>',
    '<title>AI 코딩 에이전트 활용 역량의 구조와 측정 — 한양대학교병원 AI EXPERT BOOTCAMP</title>', 'title');

/* 2. CI 컬러 + 주석 */
rep('--ci-navy:#123466;', '--ci-navy:#004483;', 'ci-navy');
rep('--ci-red:#970F07;', '--ci-red:#1E5FA8;', 'ci-red');
rep('/* 주최기관 CI — 대한전자공학회(IEIE) 로고 원본에서 추출한 값 */',
    '/* 주최기관 CI — 한양대학교병원(한양 블루 계열) */', 'ci-comment1');
rep('대한전자공학회(IEIE)', '한양대학교병원', 'ci-comment2', true);

/* 3. 헤더 로고 교체 */
const logo = fs.readFileSync('brand-assets/hyumc-logo.png').toString('base64');
const re = /<img class="logo" alt="대한전자공학회 The Institute of Electronics and Information Engineers" src="data:image\/png;base64,[^"]*"/;
if(!re.test(h)) miss.push('logo');
else h = h.replace(re, '<img class="logo" alt="한양대학교병원 HANYANG UNIVERSITY SEOUL HOSPITAL" src="data:image/png;base64,' + logo + '"');

/* 4. 예문·토큰 데모 문장 (HTML 2곳 + JS 1곳) */
rep('대한전자공학회는 오늘 SoC워크샵 일정을', '한양대학교병원은 오늘 외래 진료 지침을', 'sentence', true);

/* 5. 연사 → 강사 */
rep('연사 소개', '강사 소개', 'speaker', true);

/* 6. 강사 연혁 — 세그먼트 통합 + 한양대병원 항목 제거 + IEIE 강연 추가 */
const dlStart = h.indexOf('<dl class="cv">');
const dlEnd = h.indexOf('</dl>', dlStart) + '</dl>'.length;
if(dlStart === -1){ miss.push('cv-block'); }
else {
  const flat = `<dl class="cv">
      <div>
        <dt>연혁</dt>
        <dd>
          <span>서울과학종합대학원 「AI공학 박사 과정」</span>
          <span>KAIST 「CAIO(Chief AI Officer)」 수료</span>
          <span>국가정보원·KAIST 「사이버안보 최고위 정책과정(K-CSPP)」 수료</span>
          <span>연세대학교 「AI리더십 최고위 과정」 수료</span>
          <span>재정경제부 부총리실 인공지능자문관</span>
          <span>세종특별자치시 AI정책특별보좌관</span>
          <span>대전광역시 AI(인공지능)특별보좌관</span>
          <span>InnocurveAI CEO</span>
          <span>재정경제부 교육훈련심의위원회 위원(AI윤리)</span>
          <span>세종특별자치시 AI 혁신 TF 부단장</span>
          <span>세종특별자치시 가장 먼저, 가장 빠른 세종 구현 TF AI 자문</span>
          <span>(재)세종창조경제혁신센터 AX위원회 위원</span>
          <span>(재)대전창조경제혁신센터 AX위원회 위원 / 기술·학계 분과장</span>
          <span>대한전자공학회 「2026 SoC워크샵」 AI 코딩 에이전트 강연</span>
          <span>재정경제부 「AI 전사 육성 프로젝트」</span>
          <span>기획예산처 「AI 교육 프로젝트」</span>
          <span>과학기술정보통신부 「AI 역량 강화」</span>
          <span>ㅇㅇ원 「AI-Ready Data Pipeline Raw to RAG &amp; Ontology」</span>
          <span>삼성전자 DX 신임부사장 「AI Agent 실습」</span>
          <span>SK 하이닉스 「AI 역량 강화」</span>
          <span>KAIST OverEdge 「창업인 100명 육성 교육」</span>
          <span>고려대학교 「Hands-on AI Training, Research and Service Development」</span>
          <span>AI 기반 전자명함 제작 방법 및 AI 명함 기술 특허</span>
          <span>디지털 월렛 기능이 통합된 AI 명함 기술 특허 출원</span>
          <span>NVIDIA GTC (2025, 2026) with KAIST — 미국 산호세</span>
          <span>Singapore Fintech Festival 2025 with Visa — 싱가포르</span>
          <span>Manufacturing World Fukuoka with Yonsei — 일본</span>
          <span>ASEAN AI 정부혁신 비교 조사 해외출장 with MOFE — 싱가포르 <span class="cv-soon">Scheduled</span></span>
        </dd>
      </div>
    </dl>`;
  h = h.slice(0, dlStart) + flat + h.slice(dlEnd);
}

fs.writeFileSync('soc-hanyang.html', h);
const leftIeie = (h.match(/대한전자공학회/g) || []).length;
const leftSoc  = (h.match(/SoC워크샵/g) || []).length;
const leftSpk  = (h.match(/연사/g) || []).length;
const leftHyu  = (h.match(/한양대학교병원 「/g) || []).length;
console.log(JSON.stringify({miss, bytes: h.length,
  남은_대한전자공학회: leftIeie, 남은_SoC워크샵: leftSoc, 남은_연사: leftSpk, 남은_병원부트캠프이력: leftHyu}));
