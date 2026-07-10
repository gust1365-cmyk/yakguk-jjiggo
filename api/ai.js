export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // GEMINI_API_KEY 또는 GEMINI_API_KEY_1 ~ _10 지원
  function getKeys() {
    const keys = [];
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    for (let i = 1; i <= 10; i++) {
      const k = process.env['GEMINI_API_KEY_' + i];
      if (k) keys.push(k);
    }
    return keys;
  }

  const { action, b64, mime } = req.body || {};

  // 연결 테스트
  if (action === 'test') {
    const keys = getKeys();
    return res.status(200).json({
      ok: true,
      results: [keys.length > 0 ? `✅ API Key ${keys.length}개 설정됨` : '❌ API Key 없음']
    });
  }

  // 이미지 분석
  if (action === 'analyze') {
    const keys = getKeys();
    if (keys.length === 0) return res.status(500).json({ ok: false, error: 'API Key가 서버에 설정되지 않았습니다' });
    if (!b64 || !mime) return res.status(400).json({ ok: false, error: '이미지 데이터가 없습니다' });

    const prompt = `이 이미지는 한국 약국의 약 봉투 또는 처방전 사진입니다.
이미지에서 읽을 수 있는 모든 약 정보를 분석하여 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 마크다운을 절대 포함하지 마세요.

{
  "drugs":[
    {
      "name":"약품 제품명",
      "genericName":"성분명 (있으면)",
      "dosage":"1회 복용량 (예: 1정, 5ml)",
      "frequency":"복용 횟수 (예: 하루 3회)",
      "timing":"복용 시점 (예: 식후 30분, 취침 전)",
      "duration":"복용 기간 (예: 3일, 7일)",
      "purpose":"이 약의 용도/효능 (1~2문장)",
      "warnings":["주의사항1","주의사항2"],
      "sideEffects":["부작용1","부작용2"],
      "storage":"보관 방법",
      "interactions":"다른 약과의 상호작용 (있으면)",
      "tips":"복용 팁 또는 참고사항"
    }
  ],
  "prescription":{
    "patient":"환자명 (있으면, 없으면 null)",
    "doctor":"의사명 (있으면, 없으면 null)",
    "hospital":"병원명 (있으면, 없으면 null)",
    "date":"처방일 (있으면, 없으면 null)"
  },
  "summary":"전체 복용 지침 2~3문장 요약",
  "urgent_warning":"가장 중요한 주의사항 (없으면 null)",
  "next_refill_date":"다음 약 수령일 예상 (복용 기간 기반, 없으면 null)"
}

읽을 수 없는 항목은 null 또는 빈 배열로 처리하세요.
약 봉투나 처방전이 아닌 경우 {"error":"약 봉투 또는 처방전이 아닙니다"}를 반환하세요.`;

    const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    let lastError = 'UNKNOWN';

    // 모델 × 키 순회: flash-lite로 모든 키 시도 → 안 되면 flash로
    for (const model of models) {
      for (const key of keys) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inline_data: { mime_type: mime, data: b64 } },
                    { text: prompt }
                  ]
                }],
                generationConfig: { maxOutputTokens: 4000, temperature: 0.1 }
              })
            }
          );

          if (response.status === 429) { lastError = 'QUOTA'; continue; }   // 할당량 초과 → 다음 키
          if (response.status === 401 || response.status === 403) { lastError = 'AUTH_FAIL'; continue; }
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            lastError = err.error?.message || `HTTP ${response.status}`;
            continue;
          }

          const data = await response.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!raw) { lastError = 'EMPTY_RESPONSE'; continue; }
          return res.status(200).json({ ok: true, raw });

        } catch (e) {
          lastError = e.message;
          continue;
        }
      }
    }

    // 전부 실패
    const status = lastError === 'QUOTA' ? 429 : lastError === 'AUTH_FAIL' ? 401 : 500;
    return res.status(status).json({ ok: false, error: lastError });
  }

  return res.status(400).json({ ok: false, error: 'Unknown action' });
}
