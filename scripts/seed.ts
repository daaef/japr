import { db, pool } from '../server/db/client'
import { seedSystemData } from '../server/db/seeds/system'

async function main() {
  await seedSystemData(db, {
    defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL ?? process.env.NUXT_DEFAULT_ADMIN_EMAIL,
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD ?? process.env.NUXT_DEFAULT_ADMIN_PASSWORD
  })
}

main()
  .then(async () => {
    await pool.end()
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
