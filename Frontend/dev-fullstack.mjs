
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(frontendDir, '..');
const viteBin = join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');

if (!existsSync(viteBin)) {
  console.error(
    '\nFrontend dependencies are missing. From the frontend folder run: npm install\n'
  );
  process.exit(1);
}

const pythonCandidates = [
  process.env.PYTHON,
  process.env.VIRTUAL_ENV
    ? join(process.env.VIRTUAL_ENV, 'Scripts', 'python.exe')
    : null,
  join(projectRoot, '.venv', 'Scripts', 'python.exe'),
  join(projectRoot, 'ai', 'Scripts', 'python.exe'),
  join(projectRoot, '.venv', 'bin', 'python'),
].filter(Boolean);

const python =
  pythonCandidates.find((candidate) => existsSync(candidate)) || 'python';

const BACKEND_PORT = 8002;
const FRONTEND_PORT = 5173;

console.log('\n  CareerLens · Full-stack development mode');
console.log(`  API:      http://127.0.0.1:${BACKEND_PORT}`);
console.log(`  Frontend: http://127.0.0.1:${FRONTEND_PORT}\n`);
console.log(`  Starting backend with: ${python}`);

const backend = spawn(
  python,
  [
    '-m',
    'uvicorn',
    'backend.main:app',
    '--host',
    '127.0.0.1',
    '--port',
    String(BACKEND_PORT),
  ],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32' && python === 'python',
  }
);

backend.on('error', (error) => {
  console.error(`\nCould not start the Python backend: ${error.message}`);
  console.error(
    'Check Python installation and install backend/requirements.txt dependencies.\n'
  );
  stop(1);
});

backend.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(
      `\nBackend exited (code: ${code}, signal: ${signal}). Stopping the application.\n`
    );
    stop(code ?? 1);
  }
});

const frontend = spawn(
  process.execPath,
  [viteBin, '--host', '127.0.0.1', '--port', String(FRONTEND_PORT)],
  {
    cwd: frontendDir,
    env: process.env,
    stdio: 'inherit',
  }
);

frontend.on('error', (error) => {
  console.error(`\nCould not start Vite: ${error.message}`);
  stop(1);
});

frontend.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(
      `\nFrontend exited (code: ${code}, signal: ${signal}).\n`
    );
    stop(code ?? 1);
  }
});

let shuttingDown = false;

function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of [backend, frontend]) {
    if (child && child.exitCode === null && !child.killed) {
      try {
        child.kill('SIGTERM');
      } catch {
        // The process may already have stopped.
      }
    }
  }

  process.exitCode = code;
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
