import { spawnSync } from 'node:child_process'

function canRun(command, args) {
  const result = spawnSync(command, args, { stdio: 'ignore' })
  return result.status === 0
}

const args = process.argv.slice(2)
const command = canRun('docker', ['compose', 'version']) ? 'docker' : 'docker-compose'
const commandArgs = command === 'docker' ? ['compose', ...args] : args
const child = spawnSync(command, commandArgs, {
  env: process.env,
  stdio: 'inherit',
})

process.exit(child.status ?? 1)
