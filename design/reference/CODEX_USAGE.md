# Codex Usage

Codex는 pixel-perfect 작업을 시작하기 전에 `screen-registry.json`을 먼저 읽어야 한다.

## Operating Rules

- PNG가 있는 screen은 `referencePng`를 1차 기준으로 삼는다.
- reference component는 보조 기준이다. 구조, local asset, 대략적 CSS 확인에만 사용한다.
- `currentAppMapping`이 null placeholder인 상태에서는 실제 앱 코드를 임의로 수정하지 말고, 먼저 mapping phase를 수행한다.
- `loading`은 PNG가 없으므로 별도 정책 결정 전까지 pixel-perfect 완료 대상으로 간주하지 않는다.
- `wire_frame.css`는 삭제된 파일이며 이 package에서 사용하지 않는다.

## Required Next Phase Outputs

- `design/current/`: 실제 앱 화면 캡처와 비교용 현재 상태 자료.
- `design/screen-map.json`: reference screen id와 실제 앱 route/component/data state 매핑.

이 package의 성공 기준은 pixel-perfect 구현 완료가 아니라, 이후 구현 작업자가 기준과 누락 상태를 기계적으로 판독할 수 있는 계약을 제공하는 것이다.
