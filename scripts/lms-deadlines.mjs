#!/usr/bin/env node
// Collects deadline candidates for /canvas-lms-for-agents:lms-calendar by driving the
// vendored Canvas LMS MCP server over stdio. Read-only: list_courses, course_info and
// read_boards only. Writes the raw candidates to state/calendar/lms-deadlines.json
// (git-ignored, mode 600) and prints counts only. Deciding what goes on the calendar
// (body dates, exam times, exclusions) is left to the skill's rules.
//
//   node scripts/lms-deadlines.mjs [--days 180] [--out <path>]
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : fallback; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'canvas-lms-claude', 'plugin', 'dist', 'server.mjs');
const out = resolve(opt('--out', join(root, 'state', 'calendar', 'lms-deadlines.json')));
const days = Number(opt('--days', 180));

const KST_MS = 9 * 3600 * 1000;
const kstDate = ms => new Date(ms + KST_MS).toISOString().slice(0, 10);
const todayKst = kstDate(Date.now());
const endKst = kstDate(Date.parse(`${todayKst}T00:00:00+09:00`) + days * 86400000);
const inRange = iso => { if (!iso) return false; const d = kstDate(Date.parse(iso)); return d >= todayKst && d <= endKst; };
const EXAM = /시험|중간|기말|퀴즈|과제|마감|제출|일정|exam|midterm|final|quiz|due|deadline|schedule/i;
const NOTICE_BOARD = /공지|notice|announce/i;

const child = spawn(process.execPath, [server], { env: { ...process.env, CANVAS_AGENT_NO_BROWSER: '1' }, stdio: ['pipe', 'pipe', 'ignore'] });
let buffer = '', nextId = 1;
const pending = new Map();
child.stdout.setEncoding('utf8');
child.stdout.on('data', chunk => {
  buffer += chunk;
  for (let at; (at = buffer.indexOf('\n')) >= 0;) {
    const line = buffer.slice(0, at).trim(); buffer = buffer.slice(at + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  }
});
const send = msg => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');
const rpc = (method, params = {}) => new Promise((ok, no) => {
  const id = nextId++;
  const timer = setTimeout(() => { pending.delete(id); no(Error(`${method} timed out`)); }, 120000);
  pending.set(id, msg => { clearTimeout(timer); msg.error ? no(Error(msg.error.message)) : ok(msg.result); });
  send({ id, method, params });
});
async function call(name, a = {}) {
  const result = await rpc('tools/call', { name, arguments: a });
  const text = result.content?.find(c => c.type === 'text')?.text ?? '{}';
  let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (result.isError || data.setupRequired) return { error: String(data.message || data.code || (data.setupRequired ? 'setupRequired' : 'error')).slice(0, 200) };
  return { data };
}
async function allPages(course, kind) {
  const items = []; let offset = 0;
  for (;;) {
    const r = await call('course_info', { course, kind, fresh: true, offset });
    if (r.error) return { error: r.error, items };
    items.push(...r.data.items);
    if (r.data.nextOffset == null) return { items };
    offset = r.data.nextOffset;
  }
}

let exitCode = 0;
try {
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'lms-deadlines', version: '1.0.0' } });
  send({ method: 'notifications/initialized' });
  const status = await call('connection_status');
  if (status.error || !status.data.connected) throw Error(`Canvas 연결 실패: ${status.error || 'connected=false'}`);
  const listed = await call('list_courses', { fresh: true });
  if (listed.error) throw Error(`과목 목록 실패: ${listed.error}`);

  const result = { checkedAt: new Date().toISOString(), timezone: 'Asia/Seoul', range: { from: todayKst, to: endKst }, courses: [] };
  for (const c of listed.data.courses) {
    const entry = { id: c.id, name: c.name, term: c.term, url: c.url, partial: [] };
    const [assignments, weekly, calendar, announcements, syllabus] = [
      await allPages(c.id, 'assignments'), await allPages(c.id, 'weekly'), await allPages(c.id, 'calendar'),
      await allPages(c.id, 'announcements'), await allPages(c.id, 'syllabus'),
    ];
    for (const [kind, r] of Object.entries({ assignments, weekly, calendar, announcements, syllabus })) if (r.error) entry.partial.push({ source: kind, error: r.error });

    entry.assignments = assignments.items.map(a => ({
      id: a.id, title: a.title, dueAt: a.dueAt, lockAt: a.lockAt, unlockAt: a.unlockAt,
      submissionState: a.submissionState, status: a.status, points: a.points, quiz: a.quiz, url: a.url,
      text: (a.text || '').slice(0, 1200),
    }));
    const groups = new Map();
    for (const w of weekly.items.filter(w => inRange(w.dueAt) && w.completed !== true)) {
      const key = `${w.week ?? '?'}|${w.dueAt}`;
      if (!groups.has(key)) groups.set(key, { week: w.week, dueAt: w.dueAt, items: [] });
      groups.get(key).items.push({ itemId: w.itemId, title: w.title, completed: w.completed, video: w.video, pdf: w.pdf, attendance: w.attendance, url: w.url });
    }
    entry.weeklyPending = [...groups.values()];
    entry.calendarEvents = calendar.items.filter(e => inRange(e.startAt) || inRange(e.endAt)).map(e => ({ id: e.id, title: e.title, startAt: e.startAt, endAt: e.endAt, text: (e.text || '').slice(0, 800), url: e.url }));
    entry.announcements = announcements.items.filter(a => EXAM.test(`${a.title} ${a.text || ''}`)).map(a => ({ id: a.id, title: a.title, postedAt: a.postedAt, text: (a.text || '').slice(0, 1800), url: a.url }));
    const sylText = syllabus.items[0]?.text || '';
    entry.syllabusSnippets = [...sylText.matchAll(/.{0,120}(시험|중간|기말|exam|midterm|final).{0,200}/gi)].map(m => m[0]).slice(0, 20);

    entry.noticePosts = [];
    const boards = await call('read_boards', { course: c.id });
    if (boards.error) entry.partial.push({ source: 'boards', error: boards.error });
    for (const b of boards.data?.boards || []) {
      if (!NOTICE_BOARD.test(b.title)) continue;
      const list = await call('read_boards', { course: c.id, boardId: b.id, page: 1, fresh: true });
      if (list.error) { entry.partial.push({ source: `board:${b.title}`, error: list.error }); continue; }
      for (const p of list.data.posts.filter(p => EXAM.test(p.title)).slice(0, 10)) {
        const body = await call('read_boards', { course: c.id, boardId: b.id, postId: p.id, fresh: true });
        if (body.error) { entry.partial.push({ source: `post:${p.id}`, error: body.error }); continue; }
        entry.noticePosts.push({ board: b.title, postId: p.id, title: body.data.title, postedAt: body.data.postedAt, text: (body.data.text || '').slice(0, 4000), url: body.data.url });
      }
    }
    result.courses.push(entry);
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.tmp`, JSON.stringify(result, null, 1), { mode: 0o600 });
  renameSync(`${out}.tmp`, out);
  const sum = k => result.courses.reduce((n, c) => n + c[k].length, 0);
  const openAssignments = result.courses.reduce((n, c) => n + c.assignments.filter(a => !['submitted', 'excused'].includes(a.submissionState)).length, 0);
  console.log(`범위 ${result.range.from} ~ ${result.range.to} (KST) · 과목 ${result.courses.length}개`);
  console.log(`미제출·확인 불가 과제 ${openAssignments}건 · 미완료 주차학습 묶음 ${sum('weeklyPending')}건 · 캘린더 일정 ${sum('calendarEvents')}건 · 일정 관련 공지 ${sum('announcements')}건 · 공지 게시판 글 ${sum('noticePosts')}건`);
  const partial = result.courses.flatMap(c => c.partial.map(p => p.source));
  if (partial.length) console.log(`부분 조회: ${[...new Set(partial)].join(', ')}`);
  console.log(`저장: ${out}`);
} catch (e) {
  console.error(`수집 실패: ${e.message}`);
  exitCode = 1;
} finally {
  child.kill();
}
process.exit(exitCode);
