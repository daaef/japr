import { db, pool } from '../server/db/client'
import { seedManuscriptFiles } from '../server/db/seeds/manuscriptFiles'

async function main() {
  const result = await seedManuscriptFiles(db)
  console.log(`Attached sample manuscript PDFs to ${result.attached} journal(s).`)
}

main()
  .then(async () => pool.end())
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
