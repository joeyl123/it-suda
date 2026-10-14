# IT 수다 모임 아카이브

당근 IT 소모임의 **IT 수다 모임**에서 나눈 트렌드·노하우·정보를 기록하는 사이트입니다.
React + Vite + TypeScript, Vercel 배포.

## 새 회차 기록 추가하기

1. `content/sessions/_template.md` 를 복사해서 `content/sessions/YYYY-MM-DD-slug.md` 로 저장
2. 위쪽 frontmatter(제목·날짜·회차·태그·요약)를 채우고, 본문에 `## 토픽` 단위로 내용 작성
3. 커밋 & 푸시 → Vercel이 자동으로 다시 배포

파일명이 URL이 됩니다 (`/sessions/2026-10-12-ai-tools`). `_`로 시작하는 파일은 사이트에 안 보여요.
사이트에서 회차 하나는 **태양계**, `
GitHub 웹에서 **Add file → Create new file** 로 바로 작성해도 됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## Vercel 배포

1. GitHub에 이 저장소를 올리기
2. [vercel.com/new](https://vercel.com/new) 에서 저장소 Import → 프레임워크 **Vite** 자동 인식 → Deploy
3. 이후 `main` 브랜치에 푸시할 때마다 자동 배포

`vercel.json` 은 새로고침 시 404가 나지 않도록 모든 경로를 `index.html` 로 연결합니다.
