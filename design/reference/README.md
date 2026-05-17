# Qling Design Delivery

This folder is a self-contained delivery package for the Qling React screen designs currently shown in the ngrok preview. It includes the preview app, the screen source files, and local SVG path/image assets.

## Run

```bash
cd delivery
npm install --no-package-lock
npm run dev
```

Open the Vite URL and use the left navigation to inspect each screen.

## Build

```bash
npm run build
```

## Screen Map

| Slug | Original screen name | Source folder |
| --- | --- | --- |
| `splash` | `Splash` | `src/screens/splash` |
| `login` | `로그인화면` | `src/screens/login` |
| `onboarding-basic` | `온보딩기본정보` | `src/screens/onboarding-basic` |
| `onboarding-duplicate` | `온보딩중복확인` | `src/screens/onboarding-duplicate` |
| `onboarding-interests` | `온보딩주요관심사` | `src/screens/onboarding-interests` |
| `received-worries` | `받은고민` | `src/screens/received-worries` |
| `question-write-a` | `질문작성` | `src/screens/question-write-a` |
| `answer-check` | `답변확인` | `src/screens/answer-check` |
| `question-write-b` | `질문작성` | `src/screens/question-write-b` |
| `my-page` | `마이페이지` | `src/screens/my-page` |
| `loading` | `로딩화면` | `src/screens/loading` |
| `edit-interests` | `관심분야수정` | `src/screens/edit-interests` |
| `my-answers` | `내가쓴답변` | `src/screens/my-answers` |
| `privacy-policy` | `개인정보처리방침` | `src/screens/privacy-policy` |
| `logout` | `로그아웃` | `src/screens/logout` |
| `account-deletion` | `회원탈퇴` | `src/screens/account-deletion` |
| `answer-write-1` | `답변작성1` | `src/screens/answer-write-1` |
| `answer-write-2` | `답변작성2` | `src/screens/answer-write-2` |
| `answer-write-3` | `답변작성3` | `src/screens/answer-write-3` |
| `my-worries` | `내가쓴고민` | `src/screens/my-worries` |

## Applying to Another React Project

Copy the target screen folder from `src/screens/` into the receiving React project. Keep the files inside that folder together because many screens import local `svg-*.ts` or image assets.

Import a screen like this:

```tsx
import LoginScreen from "./screens/login/Component";

export function Page() {
  return <LoginScreen />;
}
```

Also bring over the relevant global styling from `src/styles/index.css` or make sure the receiving app provides equivalent Tailwind v4 setup and font loading:

```css
@import url("https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css");
@import "tailwindcss";
```

The designs were authored for a `393px x 852px` mobile canvas. The preview app wraps each screen in that fixed frame for visual inspection.

## Notes

- This package intentionally excludes `node_modules`, `dist`, and the original Figma-export project folders.
- It reproduces the current static design screens. App routing, form state, API integration, and full UX flows are outside this delivery package.
- A new lockfile is intentionally not included.
