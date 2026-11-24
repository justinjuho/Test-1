# state/ (git 제외)

로컬 전용 기록입니다. 이 폴더의 파일은 `.gitignore`로 커밋되지 않습니다.

- `calendar/links.json` — LMS 항목(`LMS_SOURCE_KEY`)과 Google 일정 ID의 검증된 연결 기록. `lms-calendar 적용`이 자동으로 관리합니다.
- `calendar/overrides.json` — LMS에 기록되지 않는 사용자 확인 정보(이미 낸 종이 과제, 완료한 상담 등). `overrides.example.json`을 복사해 만들거나, Claude에게 "○○ 과제는 이미 냈어"라고 말하면 기록합니다.

토큰·쿠키·서명된 파일 주소는 여기에도 저장하지 않습니다.
