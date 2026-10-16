# IT 수다 모임 아카이브

당근 IT 소모임의 **IT 수다 모임**에서 나눈 트렌드·노하우·정보를 기록하는 사이트입니다.
React + Vite + TypeScript, Vercel 배포.

## 새 회차 기록 추가하기

```bash
npm run new -- "회차 제목" ai-tools
```

→ `content/sessions/오늘날짜-ai-tools.md` 가 템플릿으로 만들어지고, 회차 번호와 **랜덤 태양계 시드**가 자동으로 들어가요.

1. 만들어진 파일의 태그·요약을 채우고, 본문에 `## 토픽` 단위로 내용 작성
2. 커밋 & 푸시 → Vercel이 자동으로 다시 배포

직접 만들려면 `content/sessions/_template.md` 를 복사해 `YYYY-MM-DD-slug.md` 로 저장하면 돼요 (GitHub 웹의 **Add file → Create new file** 도 가능).
파일명이 URL이 됩니다 (`/sessions/2026-10-12-ai-tools`). `_`로 시작하는 파일은 사이트에 안 보여요.

### 우주 규칙

- 회차 하나 = **태양계**, `## 토픽` 하나 = **행성** (`/sessions/2026-10-12-ai-tools/1`)
- 태양계 모양은 frontmatter의 `seed` 로 정해지고, 행성은 그 시드와 토픽 순서로 정해져요. 같은 시드 = 항상 같은 우주.
- 행성 하나만 다시 뽑고 싶으면 `npm run seed` 로 숫자를 얻어서 그 토픽 헤딩 바로 아래에 `<!-- seed: 123456 -->` 를 적어요.
- 토픽 안의 소제목은 `###` 부터 써요 (`##` 는 행성 경계). 따로 써 둔 토픽 문서를 옮겨 올 땐 헤딩을 한 단계씩 내리면 돼요.
- 다른 행성을 가리키는 링크는 `/sessions/<회차 파일명>/<토픽 번호>` 처럼 사이트 주소로 쓰면 새 탭 대신 그 자리에서 날아가요.
- `**굵게(괄호)**는` 처럼 굵은 글씨 뒤에 조사가 바로 붙어도 괜찮아요 (remark-cjk-friendly).
- 디자인 규칙은 [design.md](design.md) 참고.

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
`npm run build` 는 마지막에 `scripts/prerender.tsx` 로 회차·행성별 링크 미리보기(HTML + 이미지)를 만들어요.
