import { spawn } from 'node:child_process'
import { loadDotEnv, resolvePython } from './env.mjs'

loadDotEnv()

const python = resolvePython()
const args = process.argv.slice(2)

const child = spawn(python, args, {
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
