import { spawn } from 'node:child_process'
import { loadDotEnv, resolvePython } from './env.mjs'

loadDotEnv()

const backendPort = process.env.PORT ?? '4000'
const backendHost = process.env.HOST ?? '127.0.0.1'
const python = resolvePython()

const child = spawn(
  python,
  [
    '-m',
    'uvicorn',
    'backend.app.main:app',
    '--host',
    backendHost,
    '--port',
    backendPort,
    '--reload',
  ],
  {
    env: process.env,
    stdio: 'inherit',
  },
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
