import { db, pool } from '../server/db/client'

async function main() {
  const [users, journals, categories] = await Promise.all([
    db.query.users.findMany(),
    db.query.journals.findMany(),
    db.query.categories.findMany()
  ])

  console.log(JSON.stringify({
    users: users.length,
    journals: journals.length,
    categories: categories.length,
    testUsers: users.filter(u => u.email.endsWith('@example.com')).map(u => u.email),
    journalTitles: journals.map(j => j.title)
  }, null, 2))
}

main()
  .then(async () => pool.end())
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
