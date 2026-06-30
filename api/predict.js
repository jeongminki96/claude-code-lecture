// Vercel 서버리스 함수 — 다음 토큰 확률 분포(logprobs)
// ------------------------------------------------------------
// · OPENAI_API_KEY 는 'Vercel 환경변수(서버)' 에서만 사용 → 브라우저로 절대 노출 안 됨
// · 로컬 개발: .env(gitignore) 사용 / 프로덕션: Vercel 대시보드 환경변수 주입
// · 경로: /api/predict  (index.html 의 fetch('/api/predict') 와 같은 출처에서 동작)
// · 가드: ① POST 만 ② 같은 출처만(다른 사이트 브라우저 호출 차단) ③ 입력 길이 제한
//
// ⚠️ 공개 엔드포인트이므로 OpenAI 계정에 '월 사용 한도(Usage limit)'를 꼭 걸어두세요.

const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  // 가벼운 출처 검사: 다른 웹사이트의 브라우저에서 우리 키를 빌려 쓰는 것을 막음.
  // (같은 출처 호출은 origin 이 host 로 끝남. 로컬 개발은 허용.)
  const host = req.headers.host || '';
  const origin = req.headers.origin || '';
  if (origin && host && !origin.endsWith(host) && !/localhost|127\.0\.0\.1/.test(origin)) {
    res.status(403).json({ error: 'forbidden_origin' }); return;
  }

  if (!API_KEY) { res.status(503).json({ error: 'NO_KEY' }); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const text = ((body && body.text) || '').toString().trim();
    if (!text) { res.status(400).json({ error: 'empty' }); return; }
    if (text.length > 200) { res.status(413).json({ error: 'too_long' }); return; }

    const out = await predictNextToken(text);
    res.status(200).json(out);
  } catch (e) {
    const msg = String((e && e.message) || e);
    res.status(msg === 'NO_KEY' ? 503 : 502).json({ error: msg });
  }
};

/* ---------- OpenAI 호출: 다음 토큰 확률 분포 ---------- */
async function predictNextToken(text) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      // 자동완성 엔진처럼 동작시켜 '이어질 다음 한 토큰'의 후보 분포를 얻는다.
      // few-shot 으로 "답변이 아니라 이어쓰기"임을 학습시켜 사과/거절을 막는다.
      messages: [
        { role: 'system', content: "너는 '문장 이어쓰기' 게임 엔진이다. 사용자가 '미완성 문장 조각'을 주면, 그 뒤에 바로 이어질 가장 자연스러운 한국어 한두 글자를 출력한다. 이것은 질문이 아니라 받아쓰기/이어쓰기다. 절대 사과·인사·설명·거절을 하지 말고, '죄송'으로 시작하지 말고, 따옴표 없이 이어질 말만 출력한다." },
        { role: 'user', content: '나는 아침에 일어나서' },
        { role: 'assistant', content: ' 세수를 했다.' },
        { role: 'user', content: '비가 와서 우산을' },
        { role: 'assistant', content: ' 챙겨 나갔다.' },
        { role: 'user', content: '오늘 날씨가 너무' },
        { role: 'assistant', content: ' 더워서' },
        { role: 'user', content: '주말에 친구랑 영화를' },
        { role: 'assistant', content: ' 봤다.' },
        { role: 'user', content: text },
      ],
      max_tokens: 8,        // 막대는 첫 토큰만 쓰지만, 본문은 여러 토큰을 이어 '완성된 구'로
      temperature: 0,       // 그리디 → 완성 구의 첫 토큰이 막대 1위와 일치
      logprobs: true,
      top_logprobs: 12,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error('OpenAI ' + resp.status + ': ' + t.slice(0, 200));
  }
  const data = await resp.json();
  const lp = (data && data.choices && data.choices[0] && data.choices[0].logprobs
    && data.choices[0].logprobs.content && data.choices[0].logprobs.content[0]
    && data.choices[0].logprobs.content[0].top_logprobs) || [];

  // 후처리: ① 깨진 바이트 조각 토큰 제거 ② 표시어가 같은 토큰(앞 공백 차이 등) 확률 합산
  const merged = new Map();
  for (const o of lp) {
    const raw = o.token;
    if (/�/.test(raw) || /\\x[0-9a-f]{2}/i.test(raw)) continue;  // 디코딩 안 된 멀티바이트 제외
    let w = raw.replace(/\n/g, '⏎').trim();
    if (w === '') w = '␣';
    const p = Math.exp(o.logprob) * 100;
    merged.set(w, (merged.get(w) || 0) + p);
  }
  const cands = [...merged.entries()]
    .map(([word, p]) => ({ word, pct: +p.toFixed(1) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  let completion = ((data && data.choices && data.choices[0] && data.choices[0].message
    && data.choices[0].message.content) || '').split('\n')[0].trim();
  if (completion.length > 20) completion = completion.slice(0, 20) + '…';

  return { model: MODEL, candidates: cands, picked: (cands[0] && cands[0].word) || '', completion };
}
