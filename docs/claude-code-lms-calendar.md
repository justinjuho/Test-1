# Claude Code용 고려대 LMS 연동과 캘린더 자동 등록

이 안내는 **Windows의 Claude Code 또는 Claude Desktop의 Code 탭** 기준입니다. 이 저장소의 `canvas-lms-claude` 폴더가 설치 묶음이며, 고려대 Canvas·LearningX 플러그인과 `lms-calendar`·`study` 명령이 들어 있습니다. LMS에서 과제·시험과 날짜 근거를 확인하고, Claude의 Google Calendar 연결로 기본 캘린더에 반영합니다.

> 원본: 사용자가 제공한 "Claude Code용 고려대 LMS 연동과 캘린더 자동 등록" 안내. 공개 저장소에 맞게 개인 과목명은 자리표시자로 바꾸고, 사용자 확인 정보는 `state/calendar/overrides.json`(git 제외)으로 옮겼습니다.

| 필요한 정보 | 준비하거나 확인하는 곳 |
|---|---|
| 실행 환경 | Windows 로컬 Claude Code, Node.js 24 이상. 주간 실행은 Claude Desktop의 Code 탭에서 설정 |
| 학교 연결 | [고려대 Canvas](https://canvas.korea.ac.kr/) 본인 계정과 Canvas 개인 액세스 토큰. 토큰 입력은 플러그인이 여는 로컬 연결 화면 사용. LearningX ID·비밀번호나 API 키는 필요 없음(Canvas LTI로 접속) |
| 캘린더 연결 | 일정이 들어갈 Google 계정으로 Claude의 Google Calendar 커넥터를 연결. 대상은 Google 기본 캘린더 `primary` |
| 범위 | 한국시간 `Asia/Seoul` 기준 오늘부터 180일. 전체 활성 수강·교육 항목의 미완료 과제·퀴즈와 공식 시험 |
| 사용자 확인 정보 | 이미 낸 종이 과제, 완료한 상담처럼 LMS에 제출 여부가 기록되지 않는 경우 → `state/calendar/overrides.json` |

## 1. LMS 플러그인 설치

저장소를 받은 폴더(`canvas-lms-claude` 폴더가 보이는 위치)에서 PowerShell을 엽니다. 이 폴더는 설치 후에도 같은 위치에 둡니다(플러그인이 이 경로에서 실행됩니다).

```powershell
git clone https://github.com/justinjuho/Test-1.git
cd Test-1
node --version
claude --version
claude plugin marketplace add ".\canvas-lms-claude"
claude plugin install canvas-lms-for-agents@canvas-lms-local --scope user
claude plugin list
```

Claude Code를 다시 열거나 `/reload-plugins`를 실행한 뒤 `/mcp`에서 `canvas-lms` 서버를 확인합니다. 공개 GitHub의 upstream 플러그인에는 `lms-calendar`·`study` 명령이 없으므로, 이 안내대로 설치할 때는 이 저장소의 로컬 마켓플레이스를 사용합니다. [Claude 플러그인 설치 문서](https://code.claude.com/docs/en/discover-plugins) · [로컬 마켓플레이스 안내](https://code.claude.com/docs/en/plugin-marketplaces)

Claude Code의 입력창에서 LMS 연결을 확인합니다.

```text
/canvas-lms-for-agents:canvas-lms LMS 연결 상태와 실제 활성 수강·교육 항목 수를 보여줘.
```

연결 화면이 열리면 고려대 Canvas의 **계정 → 설정 → 승인된 통합 → 새 액세스 토큰**에서 만든 본인 토큰을 그 화면에 입력합니다. 토큰 값을 채팅, 명령줄, 이 문서, 캘린더에 붙여 넣지 않습니다. 클라우드 세션의 비공개 설정(네트워크 비밀)은 Windows에 자동으로 옮겨지지 않습니다. 같은 PC·사용자에서 플러그인의 기본 로컬 설정 파일을 이미 사용했다면 연결 상태를 먼저 확인합니다. [Canvas LMS for Agents 설치 문서](https://github.com/iamnotfemale/canvas-lms-for-agents#claude-code)

## 2. Google Calendar 연결

1. [Claude 커넥터 설정](https://claude.ai/customize/connectors)에서 **Google Calendar**를 연결하고, 일정이 들어갈 Google 계정으로 권한을 확인합니다.
2. Claude Code에는 같은 Claude 계정으로 로그인합니다. `/mcp`에서 Google Calendar의 일정 **조회·생성·수정** 도구를 확인합니다. 연결이 보이지 않으면 `/status`에서 로그인 방식을 확인합니다. 터미널의 Claude 계정 연결은 Claude 구독 계정 로그인에서 제공되며, 기본 Google Calendar 커넥터의 인증은 Claude 웹 설정에서 합니다.
3. 첫 실행은 아래 **미리보기** 명령으로 실제 기본 캘린더 조회와 과제·일정 대조를 확인합니다.

[Claude Code 커넥터 연결 문서](https://code.claude.com/docs/en/mcp#use-mcp-servers-from-claudeai) · [Google Calendar의 지원 기능](https://support.claude.com/en/articles/10166901-use-google-workspace-connectors)

## 3. 실행할 때 표시되는 정보

| 화면 | 표시 내용 |
|---|---|
| 연결 확인 | LMS와 Google 연결 상태, 조회 시각, 시간대와 범위, 다시 연결해야 하는 항목 |
| 확인 결과 | 과목, 과제·시험명, 마감이나 시험 시각, 제출 상태, 가산점 여부, 원문 링크와 날짜 근거 |
| 캘린더 대조 | 추가, 변경, 이미 등록, 제외, 확인 필요. 날짜가 바뀌면 이전과 새 날짜를 함께 표시 |
| 최종 결과 | 실제 Google 등록·변경 건수와 재조회한 일정 링크, 유지·제외 건수, 부분 조회와 확인이 남은 항목 |

캘린더 연결 기록을 계속 사용할 이 작업 폴더에서 Claude를 엽니다. 미리보기는 LMS·Google을 조회만 하며, 적용은 확인된 신규 일정과 변경을 Google에 반영한 뒤 다시 읽습니다. 연결 기록은 `state/calendar/links.json`에 남습니다(git 제외).

```text
/canvas-lms-for-agents:lms-calendar 미리보기
```

```text
/canvas-lms-for-agents:lms-calendar 적용
```

기존 일정을 이어서 관리한다면 첫 요청에 **"<과목명> 종이 과제 1·2와 <과목명> 연계상담은 이미 완료했어. 기존 캘린더에서 과목과 날짜가 겹치는 수동 일정은 유지해."**처럼 덧붙입니다. Claude가 이 내용을 `state/calendar/overrides.json`에 기록하고 다음 실행부터 제외합니다. 직접 만들려면 `state/calendar/overrides.example.json`을 복사합니다.

강의자료만 받을 때는 기존 자료 명령을 사용할 수 있습니다. 파일 이름과 저장 경로는 실제 다운로드 결과를 확인해 표시합니다.

```text
/canvas-lms-for-agents:canvas-lms <과목명> CH7·8·9 PDF를 찾아 내려받고 파일명, 로컬 경로, 원문 링크를 보여줘.
```

## 4. 매주 월요일 자동 갱신

1. **Claude Desktop → Code → Scheduled → New task → Local**을 선택합니다. 앱에 따라 **Routines → New routine → Local** 또는 **Only on this computer**로 표시됩니다.
2. 위에서 사용한 작업 폴더(이 저장소)를 지정합니다. Windows 시간대가 한국시간이면 **매주 월요일 오전 9시**를 선택합니다.
3. 아래 문구를 작업 지시문에 넣습니다. 이 문서 경로(`docs/claude-code-lms-calendar.md`)를 지시문에 적어도 됩니다.
4. **Run now**로 동작을 확인합니다. 기록에서 LMS 조회, Google 대조와 실제 등록·재조회 결과를 봅니다. 연결이나 도구 권한 요청이 뜨면 해당 실행에서 처리합니다. 해당 도구가 매번 확인을 요구하면 실행 기록에 승인 필요 상태가 나타날 수 있습니다. LMS 읽기 도구는 `.claude/settings.json`에서 미리 허용해 두었고, Google 쓰기 도구는 허용하지 않았습니다. 이 허용 목록은 이 폴더를 Claude Code에서 한 번 열어 **신뢰 대화상자를 수락한 뒤**에만 적용됩니다.

```text
/canvas-lms-for-agents:lms-calendar 적용
고려대 LMS 일정 점검을 한국시간 오늘부터 180일 범위로 실행해줘.
이 작업은 Google 기본 캘린더에 적용하도록 등록한 예약 작업이야.
전체 활성 수강 및 교육 항목의 과제, 퀴즈, 공식 시험을 최신 자료로 확인해.
Canvas 과제와 공지, 캘린더, 모듈, LearningX 주차학습과 게시판을 조회해.
날짜가 첨부에만 있으면 관련 PDF 본문을 읽어. 마감 시각과 제출 상태가 불명확하면 확인 필요로 보여줘.
완료·면제·지난 마감과 state/calendar/overrides.json에 완료로 기록한 항목은 제외하고 가산점은 구분해.
Google 기본 캘린더를 모든 페이지까지 새로 조회해. 이전 기록과 LMS_SOURCE_KEY 및 기존 수동 일정을 대조해 같은 항목을 두 번 등록하지 마.
사용자가 수정한 일정과 변경 근거가 불확실한 항목은 보존해. 기존 시험 일정은 공식 시작 시각이 확인돼야 시간 변경을 검토해.
새 일정과 검증된 변경만 적용해. 비공개·투명, 기본 알림, 외부 참석자와 화상회의 없음으로 설정해.
과제는 마감일 종일 일정으로, 시간이 명시된 과제는 한국시간을 제목과 설명에 남겨.
시작·종료가 공식 확인된 시험에는 실제 시간대를 사용해. 일정에 근거와 LMS 원문 링크를 넣어.
Google에서 실제 반영한 제목·시각·설명을 다시 읽어 확인하고, 검증한 연결 기록은 작업 폴더의 state/calendar에 비공개로 남겨.
연결 상태, 대상 과목 수, 과제명, 시각, 상태, 원문 링크, 날짜 근거, 추가·변경·제외·확인 필요 항목을 표로 알려줘.
조회 실패나 승인 필요도 표시해. 토큰, 쿠키, 비밀번호와 서명된 파일 주소는 출력하지 마.
```

로컬 예약은 **Claude Desktop이 실행 중이고 PC가 깨어 있을 때** 진행됩니다. PC가 꺼져 있어도 실행하려면 Claude의 **Cloud 예약 작업**을 쓸 수 있습니다. 이 저장소의 클라우드 환경 **Test-1**에는 학교 호스트 허용, Canvas 토큰(네트워크 비밀), 플러그인 설치 시작 스크립트가 구성되어 있습니다. 다만 클라우드 컨테이너는 매번 새로 만들어지므로 `state/calendar/links.json`이 실행 사이에 남지 않습니다. 클라우드에서는 Google 일정 설명의 `LMS_SOURCE_KEY`로 중복을 막습니다. 로컬 설정과 파일은 클라우드와 자동으로 공유되지 않습니다. 같은 Google 캘린더에 쓰는 다른 정기 작업(예: 기존 Codex 주간 작업)이 있다면, Claude 실행을 검증한 뒤 실행 시각과 중복 여부를 확인하고 하나만 남깁니다. [로컬 예약 작업](https://code.claude.com/docs/en/desktop-scheduled-tasks) · [클라우드 예약 작업](https://code.claude.com/docs/en/routines)

## 확인한 범위

클라우드 세션(Linux)에서 확인한 것:

- upstream `54c7ac9`(0.5.0): `npm ci && npm run build` 결과가 커밋된 번들과 같고, `npm run check`와 `npm test` 75개가 통과했습니다.
- `claude plugin validate ./canvas-lms-claude` 통과. `claude plugin marketplace add`와 `claude plugin install canvas-lms-for-agents@canvas-lms-local --scope user`로 설치했고, 스킬 4개와 MCP 서버 1개가 등록됐습니다. `claude mcp list`에서 `canvas-lms` 서버가 Connected로 표시됐습니다. 새 headless Claude에서 `/canvas-lms-for-agents:canvas-lms 연결 상태…` 명령이 플러그인 MCP 도구로 연결 정상·과목 8개를 답했습니다(도구는 `--allowedTools`로 허용. 신뢰하지 않은 폴더에서는 프로젝트 허용 목록이 무시됨을 확인).
- 실제 계정: Canvas 연결 정상, 활성 수강·교육 항목 8개 모두 LearningX 주차학습 LTI 세션 성공, LearningX PDF 색인(`index_pdf`)과 페이지 렌더링(`render_pdf_page`) 성공. Canvas 파일 API 한 경로만 접근이 거절됐는데, upstream 안내대로 전체 연결 만료가 아니며 다른 경로는 정상입니다.

실행하지 않은 것: Windows 설치, Google Calendar 연결과 캘린더 쓰기(커넥터 미연결), `lms-calendar` 미리보기·적용, 예약 작업 활성화. 실제 연결과 자동 실행 여부는 Claude에서 미리보기와 실행 기록으로 확인합니다.
