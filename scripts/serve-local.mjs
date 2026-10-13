import {spawn} from 'node:child_process';
import {closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const entry = resolve(root, 'server/index.mjs');
const runtime = resolve(root, 'data/runtime');
const pidFile = resolve(runtime, 'server.json');
const logFile = resolve(runtime, 'server.log');
const action = process.argv[2] || 'start';
const pause = ms => new Promise(done => setTimeout(done, ms));
mkdirSync(runtime, {recursive: true});

function savedProcess() {
  try {
    const info = JSON.parse(readFileSync(pidFile, 'utf8'));
    if (!Number.isInteger(info.pid) || info.pid <= 1 || info.entry !== entry) return null;
    process.kill(info.pid, 0);
    // Never stop an unrelated process if the operating system reused the PID.
    if (process.platform === 'linux') {
      const args = readFileSync(`/proc/${info.pid}/cmdline`, 'utf8').split('\0');
      if (!args.includes(entry)) return null;
    }
    return info;
  } catch { return null; }
}

async function check(info) {
  const response = await fetch(`http://127.0.0.1:${info.port}/api/state`, {signal: AbortSignal.timeout(1500)});
  if (!response.ok) throw new Error(`La API responde HTTP ${response.status}.`);
  const data = await response.json();
  if (data.house?.id !== 'home' || !Array.isArray(data.people)) throw new Error('Respuesta inesperada en el puerto de Casa al día.');
  const page = await fetch(`http://127.0.0.1:${info.port}/entrada`, {signal: AbortSignal.timeout(1500)});
  if (!page.ok || !(await page.text()).includes('Casa al día')) throw new Error('La pantalla de entrada no responde correctamente.');
  return data;
}

function show(info, data) {
  console.log(`Servidor activo en segundo plano (PID ${info.pid}).`);
  console.log('Entrada y API verificadas: HTTP 200.');
  console.log(`Este ordenador: http://localhost:${info.port}/`);
  console.log(`Red local: ${data.entryUrl.replace(/entrada$/, '')}`);
  console.log(`Registro: ${logFile}`);
}

async function main() {
  if (!['start', 'status', 'stop'].includes(action)) throw new Error('Usa npm run serve [-- status|-- stop].');
  const current = savedProcess();
  if (action === 'stop') {
    if (!current) { console.log('No hay un servidor de segundo plano activo.'); return; }
    process.kill(current.pid, 'SIGTERM');
    for (let i = 0; i < 50 && savedProcess(); i++) await pause(100);
    if (savedProcess()) throw new Error('El servidor sigue cerrando conexiones. Comprueba el registro antes de reiniciar.');
    if (existsSync(pidFile)) unlinkSync(pidFile);
    console.log('Servidor detenido. Los datos se conservan.');
    return;
  }
  if (current) { show(current, await check(current)); return; }
  if (action === 'status') throw new Error('Servidor detenido. Arranca con npm run serve.');
  if (!existsSync(resolve(root, 'dist/index.html'))) throw new Error('Primero ejecuta npm run build.');
  const port = Number(process.env.PORT || 4310);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT no es válido.');
  const output = openSync(logFile, 'a', 0o600);
  let child;
  try {
    child = spawn(process.execPath, ['--env-file-if-exists=.env', entry], {
      cwd: root,
      detached: true,
      stdio: ['ignore', output, output],
      env: {...process.env, NODE_ENV: 'development', SERVE_BUILD: '1', HOST: process.env.HOST || '0.0.0.0'},
    });
    await new Promise((done, reject) => { child.once('spawn', done); child.once('error', reject); });
  } finally { closeSync(output); }
  child.unref();
  const info = {pid: child.pid, entry, port, startedAt: new Date().toISOString()};
  writeFileSync(pidFile, JSON.stringify(info), {mode: 0o600});
  let lastError;
  for (let i = 0; i < 40; i++) {
    await pause(150);
    if (!savedProcess()) break;
    try { show(info, await check(info)); return; } catch (error) { lastError = error; }
  }
  const tail = readFileSync(logFile, 'utf8').slice(-3000);
  throw new Error(`No se ha confirmado el arranque. ${lastError?.message || ''}\n${tail}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
