# 출처와 변경 사항

`plugin/`은 [iamnotfemale/canvas-lms-for-agents](https://github.com/iamnotfemale/canvas-lms-for-agents)의 설치 패키지(`plugin/`)를 그대로 가져온 것입니다. MIT License(`LICENSE`)를 따릅니다.

| 항목 | 값 |
|---|---|
| Upstream commit | `54c7ac9977705b691dfac34c7e8be4abde13e70c` (plugin 0.5.0) |
| 이 묶음 버전 | `0.5.0-local.2` |
| 마켓플레이스 이름 | `canvas-lms-local` |
| 설치 ID | `canvas-lms-for-agents@canvas-lms-local` |

## 이 묶음에서 추가·변경한 것

- `plugin/skills/lms-calendar/` — LMS 과제·퀴즈·시험을 Google 기본 캘린더와 대조하고(미리보기) 검증된 일정만 반영(적용)하는 스킬. upstream에는 없습니다.
- `plugin/skills/study/` — 이번 주 계획, 챕터별 학습, 복습 퀴즈, 진도 기록을 진행하는 학습 세션 스킬. upstream에는 없습니다.
- `plugin/.claude-plugin/plugin.json` — 버전과 설명만 변경했습니다.
- Codex 전용 파일(`.codex-plugin/`, `.mcp.codex.json`)은 제외했습니다.

`plugin/dist/server.mjs`(MCP 서버 번들)는 수정하지 않았습니다. upstream 저장소에서 `npm ci && npm run build`를 다시 실행해 커밋된 번들과 같은지(`git diff --exit-code -- plugin/dist`), `npm run check`와 `npm test`(75개)가 통과하는지 확인했습니다.

## 갱신

```bash
scripts/sync-upstream.sh <git-ref>   # 우리 스킬과 manifest는 유지
```
