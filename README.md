# Jeonbuk Calendar

전북현대의 경기 일정을 Google Calendar에 동기화하기 위한 ICS 저장소다.

## 구조

- `jeonbuk.ics`: 일정 원본. GitHub의 같은 파일을 갱신하고 Apps Script를 실행한다.
- `apps-script/Code.gs`: Raw ICS를 읽어 Google Calendar의 `전북현대` 캘린더에 일정을 추가하거나 수정하는 Apps Script 원본이다.
- `apps-script/appsscript.json`: 시간대와 Google Calendar API v3 고급 서비스 설정이다.
- Raw ICS URL: `https://raw.githubusercontent.com/aassder95/Jeonbuk-Calendar/main/jeonbuk.ics`

이 저장소의 `apps-script/Code.gs`를 Apps Script 웹 편집기의 `Code.gs`와 동일하게 유지한다. 일정 데이터만 바꿀 때는 `jeonbuk.ics`만 수정하면 된다.

## 동기화 방식

Apps Script의 `syncJeonbuk` 함수를 수동 실행한다.

1. GitHub의 `jeonbuk.ics`를 최신 일정으로 수정하고 `main` 브랜치에 푸시한다.
2. Raw ICS URL에서 변경 내용이 보이는지 확인한다.
3. 회사 Google 계정의 Apps Script 프로젝트 `전북현대 일정 동기화`를 연다.
4. 함수 목록에서 `syncJeonbuk`를 선택하고 실행한다.
5. 실행 로그의 추가 및 수정 건수를 확인한 뒤 Google Calendar를 새로고침한다.

매일 실행하는 자동 트리거는 설치하지 않았다. 일정 파일을 갱신한 뒤 직접 실행하면 된다.

Apps Script 로직을 변경한 경우에는 저장소의 `apps-script/Code.gs` 내용을 Apps Script 웹 편집기의 `Code.gs`에도 반영하고 저장한다. GitHub에 푸시하는 것만으로 Apps Script 프로젝트 코드가 자동 배포되지는 않는다.

## 일정 식별과 갱신

- 각 일정은 ICS의 `UID`로 식별한다.
- 기존 `UID`가 있으면 제목, 장소, 설명, 시작 및 종료 시간, 라벨을 수정한다.
- 새로운 `UID`이면 새 일정을 추가한다.
- 기존 일정의 `UID`를 바꾸면 중복 일정이 생길 수 있으므로 같은 경기는 기존 `UID`를 유지한다.
- ICS에 `DESCRIPTION`이 없으면 기존 Google Calendar 메모를 삭제한다.
- 현재 동기화는 ICS에서 사라진 일정을 Google Calendar에서 자동 삭제하지 않는다. 취소된 경기는 별도로 처리해야 한다.

## 라벨

Google Calendar의 `전북현대` 캘린더에 아래 이벤트 라벨이 미리 존재해야 한다.

- `K리그`
- `코리아컵`
- `슈퍼컵`
- `아시아챔피언스리그`

Apps Script가 일정 제목과 설명의 대회명을 확인하여 이벤트별 라벨을 자동 지정한다. 라벨 이름을 Google Calendar에서 변경하면 Apps Script의 `CONFIG.labelNames`와 `findLabelName`도 함께 수정해야 한다.

## ICS 작성 규칙

- 시간대는 `Asia/Seoul` 기준으로 관리한다.
- `SUMMARY`에는 대회명과 양 팀이 드러나게 작성한다.
- `LOCATION`은 경기장명 대신 `전북현대 홈` 또는 상대 팀 원정처럼 간단히 작성한다.
- 확정되지 않은 일정은 임의로 확정하지 않는다.
- 확인일이나 출처 설명 같은 관리용 메모는 `DESCRIPTION`에 넣지 않는다.

## 주요 설정

- 대상 캘린더 이름: `전북현대`
- Apps Script 고급 서비스: Google Calendar API v3 (`Calendar`)
- Apps Script 시간대: `Asia/Seoul`
- 자동 트리거: 사용하지 않음
