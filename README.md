# 약국찍go

약 봉투 · 처방전을 찍으면 AI가 복용법과 주의사항을 정리해주는 PWA 앱

## 배포 (Vercel)

1. GitHub에 이 저장소 push
2. [vercel.com](https://vercel.com) → Import Project → GitHub 저장소 선택
3. **Environment Variables** 에 추가:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-...` (Anthropic Console에서 발급)
4. Deploy

## 기능

- 📷 약 봉투 / 처방전 촬영 또는 갤러리 선택
- 🤖 Claude claude-sonnet-4-6 Vision API로 자동 분석
- 💊 약품명 · 복용법 · 주의사항 · 부작용 · 보관법 정리
- 📋 분석 이력 저장 (최대 100건) · 검색
- 💊 약장 — 복용 중인 약 D-day 관리
- 📅 복용관리 — 복용알림 설정 · 이번주 복용률 차트

## 기술 스택

- 단일 HTML 파일 PWA (vanilla JS)
- Vercel Serverless Function (`/api/ai.js`) — API Key 서버 보관
- Claude claude-sonnet-4-6 Vision API

by. s치서
