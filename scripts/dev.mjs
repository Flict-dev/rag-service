import { spawn } from 'node:child_process'
import { loadDotEnv, resolvePython } from './env.mjs'

loadDotEnv()

const backendPort = process.env.PORT ?? '4000'
const backendHost = process.env.HOST ?? '127.0.0.1'
const python = resolvePython()

const processes = [
  {
    command: python,
    args: [
      '-m',
      'uvicorn',
      'backend.app.main:app',
      '--host',
      backendHost,
      '--port',
      backendPort,
      '--reload',
    ],
    name: 'backend',
  },
  {
    command: 'npm',
    args: ['--prefix', 'frontend', 'run', 'dev', '--', '--host', '127.0.0.1'],
    name: 'frontend',
  },
]

const children = processes.map(({ args, command, name }) => {
  const child = spawn(command, args, {
    env: process.env,
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      return
    }

    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`)
      shutdown(code)
    }
  })

  return child
})

function shutdown(code = 0) {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  })

  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
