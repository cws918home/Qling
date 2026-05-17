# Qling Design Reference Package

이 폴더는 앱 구현이 아니라 pixel-perfect 비교를 위한 정적 reference package다. 실제 앱 UI, 라우팅, Firebase, 서버, 도메인 로직의 source of truth가 아니며, 디자인 정합성 확인을 위한 기준 자료만 포함한다.

기준 캔버스는 `393px x 852px`다.

## Package Contents

- `src/screens/*`: Figma/export 기반 reference component다. 각 폴더의 `Component.tsx`와 로컬 asset은 PNG 판독이 애매할 때 보조 기준으로만 사용한다.
- `pngs/screens/*`: screen별 기준 PNG다. 20개 screen slug 중 확실히 1:1 매칭되는 PNG만 둔다.
- `pngs/extra/*`: 특정 screen과 1:1 대응하지 않는 보조 reference다.
- `pngs/unmatched/*`: 이름만으로 source screen과 대응을 확정하기 어려운 PNG를 두는 위치다. 현재는 비어 있다.
- `screen-registry.json`: Codex/자동화용 source of truth다.
- `screen-registry.md`: 사람이 검토하기 위한 registry 표다.
- `validate-reference.mjs`: registry와 PNG 배치를 검증하는 Node.js 스크립트다.

`loading`은 `src/screens/loading` source screen은 있지만 기준 PNG가 없다. `screen-registry.json`에는 `referencePng: null`, `matchStatus: "missing-png"`로 기록한다.

`wire_frame.css`는 삭제된 파일이며 이 reference package에서는 사용하지 않는다. 복구하거나 새 reference로 연결하지 않는다.

## Pixel-Perfect Comparison Workflow

1. `screen-registry.json`에서 screen id와 reference PNG를 확인한다.
2. `referencePng`가 있으면 PNG를 1차 기준으로 삼는다.
3. `componentPath`의 reference component와 local assets를 보조 기준으로 확인한다.
4. 실제 앱의 대응 화면을 캡처한다.
5. viewport, spacing, typography, color, radius, shadow, asset 위치 차이를 기록한다.
6. 차이를 앱 구현에 반영한다.

## Screen Registry Summary

| order | id | Korean reference name | source folder | reference PNG | match status |
| ---: | --- | --- | --- | --- | --- |
| 1 | `splash` | Splash | `src/screens/splash` | `pngs/screens/01-splash.png` | `matched` |
| 2 | `login` | 로그인 화면 | `src/screens/login` | `pngs/screens/02-login.png` | `matched` |
| 3 | `onboarding-basic` | 온보딩 - 기본정보 | `src/screens/onboarding-basic` | `pngs/screens/03-onboarding-basic.png` | `matched` |
| 4 | `onboarding-duplicate` | 온보딩 - 중복확인 | `src/screens/onboarding-duplicate` | `pngs/screens/04-onboarding-duplicate.png` | `matched` |
| 5 | `onboarding-interests` | 온보딩 - 주요 관심사 | `src/screens/onboarding-interests` | `pngs/screens/05-onboarding-interests.png` | `matched` |
| 6 | `received-worries` | 메인 화면 - 받은 고민 | `src/screens/received-worries` | `pngs/screens/06-received-worries.png` | `matched` |
| 7 | `question-write-a` | 고민 작성1 | `src/screens/question-write-a` | `pngs/screens/07-question-write-a.png` | `matched` |
| 8 | `answer-check` | 답변 상세 확인 | `src/screens/answer-check` | `pngs/screens/08-answer-check.png` | `matched` |
| 9 | `question-write-b` | 고민 작성2 | `src/screens/question-write-b` | `pngs/screens/09-question-write-b.png` | `matched` |
| 10 | `my-page` | 마이페이지 | `src/screens/my-page` | `pngs/screens/10-my-page.png` | `matched` |
| 11 | `loading` | 로딩화면 | `src/screens/loading` |  | `missing-png` |
| 12 | `edit-interests` | 관심분야 수정 | `src/screens/edit-interests` | `pngs/screens/12-edit-interests.png` | `matched` |
| 13 | `my-answers` | 내가 쓴 답변 | `src/screens/my-answers` | `pngs/screens/13-my-answers.png` | `matched` |
| 14 | `privacy-policy` | 개인정보처리방침 | `src/screens/privacy-policy` | `pngs/screens/14-privacy-policy.png` | `matched` |
| 15 | `logout` | 로그아웃 | `src/screens/logout` | `pngs/screens/15-logout.png` | `matched` |
| 16 | `account-deletion` | 회원 탈퇴 | `src/screens/account-deletion` | `pngs/screens/16-account-deletion.png` | `matched` |
| 17 | `answer-write-1` | 답변 작성1 | `src/screens/answer-write-1` | `pngs/screens/17-answer-write-1.png` | `matched` |
| 18 | `answer-write-2` | 답변 작성2 | `src/screens/answer-write-2` | `pngs/screens/18-answer-write-2.png` | `matched` |
| 19 | `answer-write-3` | 답변 작성3 | `src/screens/answer-write-3` | `pngs/screens/19-answer-write-3.png` | `matched` |
| 20 | `my-worries` | 내가 쓴 고민 | `src/screens/my-worries` | `pngs/screens/20-my-worries.png` | `matched` |

## Not Directly Matched

- `와이어프레임.png` -> `pngs/extra/wireframe.png`: 특정 screen slug와 1:1 대응하지 않는 전체 wireframe reference다.
- `온보딩 - 서비스 접근.png` -> `pngs/extra/onboarding-service-access.png`: README/source folder 기준 20개 screen slug 중 명확한 source folder가 없어 extra reference로 둔다.

## Commands

```bash
npm install --no-package-lock
npm run build
npm run validate:reference
```
