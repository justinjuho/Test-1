# 고려대 LearningX 학습 프로젝트

고려대 Canvas·LearningX를 Claude Code에 연결해 **강의자료로 공부하고**, 과제·공지·출석을 확인하고, LMS 일정을 Google 캘린더와 대조하는 작업 폴더입니다.

- LMS 연결: [iamnotfemale/canvas-lms-for-agents](https://github.com/iamnotfemale/canvas-lms-for-agents)(MIT) 플러그인을 로컬 마켓플레이스 `canvas-lms-local`로 포함했습니다. MCP 도구 15개: 과목·자료 검색, 공지·과제·출석·주차학습·강의계획·캘린더, 게시판, PDF 색인·읽기·페이지 렌더링, 영상 저장.
- 이 프로젝트에서 추가한 스킬: `study`(학습 세션), `lms-calendar`(Google 캘린더 미리보기·적용).
- **필요한 자격 증명은 Canvas 개인 액세스 토큰 하나입니다.** LearningX는 Canvas의 sessionless LTI로 접속하므로 별도 LearningX API 키나 학교 ID·비밀번호가 필요 없습니다.

## 빠른 시작: Windows 로컬 Claude Code

Node.js 24 이상과 Claude Code가 필요합니다. 이 저장소를 받은 폴더에서 PowerShell을 엽니다.

```powershell
git clone https://github.com/justinjuho/Test-1.git
cd Test-1
node --version
claude plugin marketplace add ".\canvas-lms-claude"
claude plugin install canvas-lms-for-agents@canvas-lms-local --scope user
claude plugin list
```

이 폴더에서 Claude Code를 **한 번 대화형으로 열어 폴더 신뢰 대화상자를 수락**합니다. 그래야 `.claude/settings.json`의 마켓플레이스·플러그인 활성화와 읽기 전용 LMS 도구 허용 목록이 적용됩니다(신뢰 전에는 허용 목록이 무시되어 도구마다 승인을 묻습니다). `/reload-plugins` 후 `/mcp`에서 `canvas-lms` 서버를 확인합니다.

```text
/canvas-lms-for-agents:canvas-lms LMS 연결 상태와 실제 활성 수강·교육 항목 수를 보여줘.
```

연결 화면이 열리면 [고려대 Canvas](https://canvas.korea.ac.kr/profile/settings)의 **계정 → 설정 → 승인된 통합 → 새 액세스 토큰**에서 만든 토큰을 **그 화면에만** 입력합니다. 채팅, 명령줄, 파일에 붙여 넣지 않습니다. 토큰은 `%USERPROFILE%\.config\canvas-lms-for-agents\config.json`에 저장됩니다.

## 빠른 시작: Claude Code 클라우드 세션

클라우드 환경 **Test-1**(개인)은 학교 호스트 5개(`canvas.korea.ac.kr`, `mylms.korea.ac.kr`, `kucom.korea.ac.kr`, 학교 저장소 CDN 2개)만 허용합니다. Canvas 토큰은 환경의 네트워크 비밀로 저장되어 프록시가 `canvas.korea.ac.kr` 요청에만 넣습니다. 세션 시작 스크립트가 플러그인을 설치하고, 토큰 자리에 `proxy-injected` 자리표시자를 넣은 설정 파일을 만듭니다. 내려받은 PDF·영상은 앱에서 열 수 있도록 프로젝트 안의 `library/`(git 제외)에 저장됩니다.

토큰을 바꾸거나 지우려면 claude.ai의 환경 설정에서 **Test-1 → 네트워크 비밀**을 수정합니다.

## 사용하기

```text
/canvas-lms-for-agents:study 이번 주 계획
/canvas-lms-for-agents:study 미적분 5주차 자료 같이 공부하자
/canvas-lms-for-agents:study 중간고사 범위 퀴즈 내줘
/canvas-lms-for-agents:study 지난번 이어서
```

`study`는 미완료 주차학습과 과제로 이번 주 계획을 세웁니다. 이어서 PDF를 색인하고, 챕터마다 개념, 예시, 확인 질문 순으로 진행합니다. 그림·표·수식은 실제 페이지 이미지를 보고 설명합니다. 진도는 `study/<과목>/진도.md`에 남습니다(git 제외).

```text
/canvas-lms-for-agents:canvas-lms 미제출 과제만 보여줘
/canvas-lms-for-agents:canvas-lms 최근 공지랑 게시판 첨부도 확인해줘
/canvas-lms-for-agents:canvas-lms 이번 주 출석 상태 알려줘
/canvas-lms-for-agents:lms-calendar 미리보기
/canvas-lms-for-agents:lms-calendar 적용
```

캘린더 연동, 주간 자동 갱신(Claude Desktop 예약 작업) 안내는 [docs/claude-code-lms-calendar.md](docs/claude-code-lms-calendar.md)에 있습니다. `lms-calendar`를 쓰려면 claude.ai [커넥터 설정](https://claude.ai/customize/connectors)에서 **Google Calendar**를 먼저 연결해야 합니다.

## 연결 점검

```bash
node scripts/verify-connection.mjs          # 과목 이름 없이 결과만
node scripts/verify-connection.mjs --names  # 과목 이름 포함
```

Canvas 토큰, 활성 과목 수, 과목별 LearningX 주차학습 세션, 미제출 과제 수를 읽기 전용으로 확인합니다. 토큰과 쿠키는 출력하지 않습니다. 이 스크립트를 직접 실행하려면 연결 화면으로 토큰을 한 번 저장해 두어야 합니다(로컬). 클라우드에서는 세션 시작 스크립트가 설정 파일을 만들어 둡니다.

## 폴더 구성

```text
.claude/settings.json        플러그인 활성화, 읽기 전용 LMS 도구 허용
canvas-lms-claude/           로컬 마켓플레이스 canvas-lms-local (설치 묶음)
  plugin/                    canvas-lms-for-agents 플러그인 (MCP 서버 번들 + 스킬 4개)
  UPSTREAM.md                출처 commit과 변경 사항
docs/                        캘린더 연동·예약 작업 안내
scripts/                     연결 점검, 마감 후보 수집, upstream 갱신
state/  study/  library/     로컬 전용 기록·진도·자료 (git 제외)
```

## 보안과 범위

- 이 저장소는 공개입니다. 토큰, 쿠키, 서명된 URL, 성적·출결, 강의자료, `state/`·`study/`·`library/`는 커밋하지 않습니다(`.gitignore`).
- LMS는 조회 전용입니다. 과제 제출, 출석 처리, 영상 진도 기록, 게시판 글쓰기는 하지 않습니다.
- 학습에 쓰는 PDF 텍스트·이미지는 Claude에 전달됩니다. 로컬 캐시는 "AI에 전송되지 않음"을 뜻하지 않습니다.
- 학교 공식 서비스가 아닙니다. 토큰의 사용 범위는 [Canvas 인증 정책](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth)과 학교의 이용 조건을 따르세요. 노출된 토큰은 Canvas에서 즉시 삭제하고 다시 발급합니다.

자세한 데이터 흐름은 upstream의 [SECURITY.md](https://github.com/iamnotfemale/canvas-lms-for-agents/blob/main/SECURITY.md)를 참고하세요.
