import { eq } from 'drizzle-orm'
import { journals } from '../schema/journals'
import { persistUpload } from '#server/utils/files'
import { buildSampleManuscriptPdf } from '#server/utils/sampleManuscriptPdf'
import { slugify } from '#server/utils/slug'
import type { db } from '../client'

type Database = typeof db

export async function seedManuscriptFiles(database: Database) {
  const missingFiles = await database.query.journals.findMany({
    where: (table, { isNull }) => isNull(table.journalUrl),
    columns: { id: true, title: true }
  })

  if (!missingFiles.length) {
    return { attached: 0 }
  }

  let attached = 0

  for (const journal of missingFiles) {
    const { storageKey } = await persistUpload({
      data: buildSampleManuscriptPdf(journal.title),
      originalName: `${slugify(journal.title)}.pdf`,
      subdir: 'journals'
    })

    await database
      .update(journals)
      .set({ journalUrl: storageKey })
      .where(eq(journals.id, journal.id))

    attached += 1
  }

  return { attached }
}
