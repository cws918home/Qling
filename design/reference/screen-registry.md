# Screen Registry

Canvas: `393px x 852px`

Source of truth policy: reference PNG first when available; reference React component and local assets are secondary.

| order | id | Korean reference name | source folder | PNG path | original PNG name | match status | readiness | PNG dimensions | reference priority | current app mapping status | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `splash` | Splash | `src/screens/splash` | `pngs/screens/01-splash.png` | `Splash.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 2 | `login` | 로그인 화면 | `src/screens/login` | `pngs/screens/02-login.png` | `로그인 화면.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 3 | `onboarding-basic` | 온보딩 - 기본정보 | `src/screens/onboarding-basic` | `pngs/screens/03-onboarding-basic.png` | `온보딩 - 기본정보.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 4 | `onboarding-duplicate` | 온보딩 - 중복확인 | `src/screens/onboarding-duplicate` | `pngs/screens/04-onboarding-duplicate.png` | `온보딩 - 중복확인.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 5 | `onboarding-interests` | 온보딩 - 주요 관심사 | `src/screens/onboarding-interests` | `pngs/screens/05-onboarding-interests.png` | `온보딩 - 주요 관심사.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 6 | `received-worries` | 메인 화면 - 받은 고민 | `src/screens/received-worries` | `pngs/screens/06-received-worries.png` | `메인 화면 - 받은 고민.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 7 | `question-write-a` | 고민 작성1 | `src/screens/question-write-a` | `pngs/screens/07-question-write-a.png` | `고민 작성1.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 8 | `answer-check` | 답변 상세 확인 | `src/screens/answer-check` | `pngs/screens/08-answer-check.png` | `답변 상세 확인.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 9 | `question-write-b` | 고민 작성2 | `src/screens/question-write-b` | `pngs/screens/09-question-write-b.png` | `고민 작성2.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 10 | `my-page` | 마이페이지 | `src/screens/my-page` | `pngs/screens/10-my-page.png` | `마이페이지.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 11 | `loading` | 로딩화면 | `src/screens/loading` | N/A | N/A | `missing-png` | `missing-reference-png` | N/A | `png-first` | not mapped | Source screen exists, but no direct PNG reference is present in pngs/. |
| 12 | `edit-interests` | 관심분야 수정 | `src/screens/edit-interests` | `pngs/screens/12-edit-interests.png` | `관심분야 수정.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 13 | `my-answers` | 내가 쓴 답변 | `src/screens/my-answers` | `pngs/screens/13-my-answers.png` | `내가 쓴 답변.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 14 | `privacy-policy` | 개인정보처리방침 | `src/screens/privacy-policy` | `pngs/screens/14-privacy-policy.png` | `개인정보처리방침.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 15 | `logout` | 로그아웃 | `src/screens/logout` | `pngs/screens/15-logout.png` | `로그아웃.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 16 | `account-deletion` | 회원 탈퇴 | `src/screens/account-deletion` | `pngs/screens/16-account-deletion.png` | `회원 탈퇴.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 17 | `answer-write-1` | 답변 작성1 | `src/screens/answer-write-1` | `pngs/screens/17-answer-write-1.png` | `답변 작성1.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 18 | `answer-write-2` | 답변 작성2 | `src/screens/answer-write-2` | `pngs/screens/18-answer-write-2.png` | `답변 작성2.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 19 | `answer-write-3` | 답변 작성3 | `src/screens/answer-write-3` | `pngs/screens/19-answer-write-3.png` | `답변 작성3.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |
| 20 | `my-worries` | 내가 쓴 고민 | `src/screens/my-worries` | `pngs/screens/20-my-worries.png` | `내가 쓴 고민.png` | `matched` | `ready` | `393x852` | `png-first` | not mapped | README slug and PNG name are directly matched. |

## Extra References

| id | path | original name | type | notes |
| --- | --- | --- | --- | --- |
| `wireframe` | `pngs/extra/wireframe.png` | `와이어프레임.png` | `wireframe` | General wireframe reference. It is not a 1:1 match for a single screen slug. |
| `onboarding-service-access` | `pngs/extra/onboarding-service-access.png` | `온보딩 - 서비스 접근.png` | `extra-screen-reference` | No corresponding source folder exists among the 20 README screen slugs, so this is kept as an extra reference rather than matched to a screen. |
