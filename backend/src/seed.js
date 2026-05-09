import { databasePath, initDatabase, seedDatabase } from './db.js'

initDatabase()
seedDatabase({ reset: true })

console.log(`Seeded RAG Base database at ${databasePath}`)
