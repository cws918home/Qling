# Qling Design Reference Package

이 폴더는 앱 구현이 아니라 pixel-perfect 비교를 위한 정적 reference package다. 실제 앱 UI, 라우팅, Firebase, 서버, 도메인 로직의 source of truth가 아니며, 디자인 정합성 확인을 위한 기준 자료만 포함한다.

현재 `design/reference`만으로 실제 앱을 pixel-perfect하게 수정할 수 있는 것은 아니다. 이 패키지는 reference source of truth이며, 실제 앱 비교를 위해서는 다음 phase에서 `design/current` 또는 app screenshot mapping이 필요하다.

기준 캔버스는 `393px x 852px`다. 단, 각 PNG의 실제 width/height는 `screen-registry.json`의 `referencePngDimensions`를 확인한다.

## Source Of Truth Policy

- PNG가 존재하는 screen은 PNG가 1차 기준이다.
- `referencePriority`는 모든 screen에서 `png-first`다.
- reference component는 PNG와 불일치할 수 있으므로 구조, asset, 대략적 CSS 확인용 보조 자료다.
- `loading`은 PNG가 없으므로 pixel-perfect comparison ready 상태가 아니다.
- 다음 phase에서 채워야 할 항목은 `currentAppMapping`이다.

## Package Contents

- `src/screens/*`: Figma/export 기반 reference component다. 각 폴더의 `Component.tsx`와 로컬 asset은 PNG 판독이 애매할 때 보조 기준으로만 사용한다.
- `pngs/screens/*`: screen별 기준 PNG다. 20개 screen slug 중 확실히 1:1 매칭되는 PNG만 둔다.
- `pngs/extra/*`: 특정 screen과 1:1 대응하지 않는 보조 reference다.
- `pngs/unmatched/*`: 이름만으로 source screen과 대응을 확정하기 어려운 PNG를 두는 위치다. 현재는 비어 있다.
- `screen-registry.json`: Codex/자동화용 source of truth다.
- `screen-registry.md`: 사람이 검토하기 위한 registry 표다.
- `CODEX_USAGE.md`: 이후 Codex가 pixel-perfect 작업을 시작할 때 읽을 운영 지침이다.
- `validate-reference.mjs`: registry와 PNG 배치를 검증하는 Node.js 스크립트다.

`loading`은 `src/screens/loading` source screen은 있지만 기준 PNG가 없다. `screen-registry.json`에는 `referencePng: null`, `referencePngDimensions: null`, `matchStatus: "missing-png"`, `comparisonReadiness: "missing-reference-png"`로 기록한다.

`wire_frame.css`는 삭제된 파일이며 이 reference package에서는 사용하지 않는다. 복구하거나 새 reference로 연결하지 않는다.

## Pixel-Perfect Comparison Workflow

1. `screen-registry.json`에서 screen id와 reference PNG를 확인한다.
2. `referencePng`가 있으면 PNG를 1차 기준으로 삼는다.
3. `componentPath`의 reference component와 local assets를 보조 기준으로 확인한다.
4. 실제 앱의 대응 화면을 캡처한다.
5. viewport, spacing, typography, color, radius, shadow, asset 위치 차이를 기록한다.
6. 차이를 앱 구현에 반영한다.

실제 앱을 수정하기 전에 `currentAppMapping`과 현재 앱 screenshot 산출물을 먼저 만들어야 한다. 권장 산출물은 `design/current/`와 `design/screen-map.json`이다.

## Screen Registry Summary

| order | id | Korean reference name | source folder | reference PNG | readiness | PNG dimensions | match status |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `splash` | Splash | `src/screens/splash` | `pngs/screens/01-splash.png` | `ready` | `393x852` | `matched` |
| 2 | `login` | 로그인 화면 | `src/screens/login` | `pngs/screens/02-login.png` | `ready` | `393x852` | `matched` |
| 3 | `onboarding-basic` | 온보딩 - 기본정보 | `src/screens/onboarding-basic` | `pngs/screens/03-onboarding-basic.png` | `ready` | `393x852` | `matched` |
| 4 | `onboarding-duplicate` | 온보딩 - 중복확인 | `src/screens/onboarding-duplicate` | `pngs/screens/04-onboarding-duplicate.png` | `ready` | `393x852` | `matched` |
| 5 | `onboarding-interests` | 온보딩 - 주요 관심사 | `src/screens/onboarding-interests` | `pngs/screens/05-onboarding-interests.png` | `ready` | `393x852` | `matched` |
| 6 | `received-worries` | 메인 화면 - 받은 고민 | `src/screens/received-worries` | `pngs/screens/06-received-worries.png` | `ready` | `393x852` | `matched` |
| 7 | `question-write-a` | 고민 작성1 | `src/screens/question-write-a` | `pngs/screens/07-question-write-a.png` | `ready` | `393x852` | `matched` |
| 8 | `answer-check` | 답변 상세 확인 | `src/screens/answer-check` | `pngs/screens/08-answer-check.png` | `ready` | `393x852` | `matched` |
| 9 | `question-write-b` | 고민 작성2 | `src/screens/question-write-b` | `pngs/screens/09-question-write-b.png` | `ready` | `393x852` | `matched` |
| 10 | `my-page` | 마이페이지 | `src/screens/my-page` | `pngs/screens/10-my-page.png` | `ready` | `393x852` | `matched` |
| 11 | `loading` | 로딩화면 | `src/screens/loading` | N/A | `missing-reference-png` | N/A | `missing-png` |
| 12 | `edit-interests` | 관심분야 수정 | `src/screens/edit-interests` | `pngs/screens/12-edit-interests.png` | `ready` | `393x852` | `matched` |
| 13 | `my-answers` | 내가 쓴 답변 | `src/screens/my-answers` | `pngs/screens/13-my-answers.png` | `ready` | `393x852` | `matched` |
| 14 | `privacy-policy` | 개인정보처리방침 | `src/screens/privacy-policy` | `pngs/screens/14-privacy-policy.png` | `ready` | `393x852` | `matched` |
| 15 | `logout` | 로그아웃 | `src/screens/logout` | `pngs/screens/15-logout.png` | `ready` | `393x852` | `matched` |
| 16 | `account-deletion` | 회원 탈퇴 | `src/screens/account-deletion` | `pngs/screens/16-account-deletion.png` | `ready` | `393x852` | `matched` |
| 17 | `answer-write-1` | 답변 작성1 | `src/screens/answer-write-1` | `pngs/screens/17-answer-write-1.png` | `ready` | `393x852` | `matched` |
| 18 | `answer-write-2` | 답변 작성2 | `src/screens/answer-write-2` | `pngs/screens/18-answer-write-2.png` | `ready` | `393x852` | `matched` |
| 19 | `answer-write-3` | 답변 작성3 | `src/screens/answer-write-3` | `pngs/screens/19-answer-write-3.png` | `ready` | `393x852` | `matched` |
| 20 | `my-worries` | 내가 쓴 고민 | `src/screens/my-worries` | `pngs/screens/20-my-worries.png` | `ready` | `393x852` | `matched` |

## Not Directly Matched

- `와이어프레임.png` -> `pngs/extra/wireframe.png`: 특정 screen slug와 1:1 대응하지 않는 전체 wireframe reference다.
- `온보딩 - 서비스 접근.png` -> `pngs/extra/onboarding-service-access.png`: README/source folder 기준 20개 screen slug 중 명확한 source folder가 없어 extra reference로 둔다.

## Commands

```bash
npm run build
npm run validate:reference
```

## Production Pixel-Alignment Reference

This directory is also the canonical reference package for production UI pixel-alignment work. Use `screen-map.json`, `tokens.md`, and `notes/` before making Codex-driven visual changes to `src/`.

Reference PNG and CSS exports are not enough on their own. Future agents must inspect the mapped production screen files, shared UI primitives, and `src/index.css` tokens before editing. Figma/exported CSS is advisory measurement evidence only; translate it into existing Qling design tokens and shared primitives instead of copying fixture CSS into production code.

Production behavior must not change during visual alignment work. Do not change routing, containers, contracts, mappings, Firebase, Auth, API calls, Firestore rules, services, or server code for pixel work unless a separate task explicitly asks for behavior changes.

Future pixel work should compare each reference screen against the mapped production screen in `screen-map.json`. Actual screenshot capture or screenshot diffing is not required by this package unless project tooling explicitly supports it.

The normalized production-alignment directories are:

- `screenshots/`: copied reference PNGs for mapped production screens, with `.gitkeep` for future additions.
- `css/`: copied advisory CSS exports, with `.gitkeep` for future additions.
- `notes/`: per-screen intent, risks, states to verify, and edit boundaries.

The original fixture package files, including `src/`, `pngs/`, `screen-registry.*`, `CODEX_USAGE.md`, and `validate-reference.mjs`, are preserved for fixture preview and registry work.
