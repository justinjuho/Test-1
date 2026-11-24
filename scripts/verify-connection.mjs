#!/usr/bin/env node
// Drives the vendored Canvas LMS MCP server over stdio and reports whether the
// Canvas token and the LearningX (LTI) sessions work. Read-only: it calls only
// connection_status, list_courses and course_info. It never prints tokens,
// cookies or signed URLs (the server does not return them). Course names are
// shown only with --names.
//
//   node scripts/verify-connection.mjs [--names] [--server <path to server.mjs>]
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const showNames = args.includes('--names');
const serverArg = args.indexOf('--server');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = serverArg >= 0 ? resolve(args[serverArg + 1]) : join(root, 'canvas-lms-claude', 'plugin', 'dist', 'server.mjs');

const child = spawn(process.execPath, [server], {
  env: { ...process.env, CANVAS_AGENT_NO_BROWSER: '1' },
  stdio: ['pipe', 'pipe', 'inherit'],
});
let buffer = '', nextId = 1;
const pending = new Map();
child.stdout.setEncoding('utf8');
child.stdout.on('data', chunk => {
  buffer += chunk;
  for (let at; (at = buffer.indexOf('\n')) >= 0;) {
    const line = buffer.slice(0, at).trim(); buffer = buffer.slice(at + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  }
});
const send = msg => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');
const rpc = (method, params = {}, timeoutMs = 90000) => new Promise((ok, no) => {
  const id = nextId++;
  const timer = setTimeout(() => { pending.delete(id); no(Error(`${method} timed out`)); }, timeoutMs);
  pending.set(id, msg => { clearTimeout(timer); msg.error ? no(Error(msg.error.message)) : ok(msg.result); });
  send({ id, method, params });
});
async function call(name, args = {}) {
  const result = await rpc('tools/call', { name, arguments: args });
  const text = result.content?.find(c => c.type === 'text')?.text ?? '{}';
  let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
  return { ok: !result.isError, data };
}
const errorText = data => String(data?.message || data?.error || data?.code || 'unknown error').slice(0, 120);

let exitCode = 0;
try {
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verify-connection', version: '1.0.0' } });
  send({ method: 'notifications/initialized' });
  const { tools } = await rpc('tools/list');
  console.log(`MCP 도구: ${tools.length}개 (${tools.map(t => t.name).join(', ')})`);

  const status = await call('connection_status');
  if (!status.ok || status.data.setupRequired || !status.data.connected) {
    console.log(`Canvas 연결: 실패 — ${status.data.setupRequired ? '토큰 연결 필요(setupRequired)' : errorText(status.data)}`);
    exitCode = 2;
  } else {
    console.log(`Canvas 연결: 정상 (학교 ${status.data.school}, 시간대 ${status.data.timezone})`);
    const listed = await call('list_courses', { fresh: true });
    const courses = listed.ok ? listed.data.courses : [];
    console.log(`활성 수강·교육 항목: ${courses.length}개`);
    let lxOk = 0, lxNone = 0, lxFail = 0;
    for (const [n, c] of courses.entries()) {
      const label = showNames ? `${c.name}${c.term ? ` (${c.term})` : ''}` : `과목 #${n + 1}`;
      const weekly = await call('course_info', { course: c.id, kind: 'weekly', fresh: true });
      const missing = await call('course_info', { course: c.id, kind: 'assignments', submissionState: 'missing', fresh: true });
      let lx;
      if (weekly.ok) { lxOk++; lx = `LearningX 주차학습 ${weekly.data.total ?? 0}건`; }
      else if (/LearningX 메뉴가 없습니다/.test(errorText(weekly.data))) { lxNone++; lx = 'LearningX 메뉴 없음'; }
      else { lxFail++; lx = `LearningX 오류: ${errorText(weekly.data)}`; }
      const as = missing.ok ? `미제출 과제 ${missing.data.total ?? 0}건` : `과제 조회 오류: ${errorText(missing.data)}`;
      console.log(`  - ${label}: ${lx} · ${as}`);
    }
    console.log(`LearningX 세션: 성공 ${lxOk} · 메뉴 없음 ${lxNone} · 실패 ${lxFail}`);
    if (lxFail) exitCode = 3;
  }
} catch (e) {
  console.error(`검증 실패: ${e.message}`);
  exitCode = 1;
} finally {
  child.kill();
}
process.exit(exitCode);
