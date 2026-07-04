import { eq, inArray } from 'drizzle-orm'
import { db } from '#server/db/client'
import { files } from '#server/db/schema'
import { deleteStoredFile } from '#server/utils/files'

export const FILE_STATUS = {
  PENDING: 'pending',
  ATTACHED: 'attached'
} as const

const PENDING_FILE_TTL_MS = 24 * 60 * 60 * 1000

/** Called at upload time (both drivers) — records who a storage key was actually issued to. */
export async function recordUploadedFile(storageKey: string, ownerId: string) {
  // onConflictDoNothing: a retried token request for the same client-generated pathname
  // shouldn't 500 on the unique index — the original row's ownership already stands.
  await db.insert(files).values({
    storageKey,
    ownerId,
    status: FILE_STATUS.PENDING,
    expiresAt: new Date(Date.now() + PENDING_FILE_TTL_MS)
  }).onConflictDoNothing({ target: files.storageKey })
}

/**
 * Verifies the caller actually has a pending upload for this storage key. Throws 403 if
 * the key was never issued to this caller or has already been attached elsewhere —
 * closes the "attach an arbitrary/guessed storage key with no ownership record" gap.
 *
 * Split from markFileAttached because the create-journal endpoint doesn't have a
 * journalId to link until after the journal row exists — verify before the insert
 * (so a bad key never gets saved), mark-attached after (once the id is known).
 */
export async function verifyPendingUpload(storageKey: string, ownerId: string) {
  const fileRecord = await db.query.files.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.storageKey, storageKey)
  })

  if (!fileRecord || fileRecord.ownerId !== ownerId || fileRecord.status !== FILE_STATUS.PENDING) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This file was not uploaded by you, or has already been used.'
    })
  }
}

/** Call only after verifyPendingUpload has already passed for this storageKey/owner. */
export async function markFileAttached(storageKey: string, journalId: string) {
  await db.update(files)
    .set({ status: FILE_STATUS.ATTACHED, journalId })
    .where(eq(files.storageKey, storageKey))
}

/**
 * Removes uploads that were issued a token but never attached to a manuscript
 * (abandoned form, failed validation, crash) past their 24h grace window. Shared by
 * the scheduled cron job and the manually-triggered admin escape hatch.
 */
export async function cleanupOrphanedFiles(): Promise<{ deletedCount: number }> {
  const stale = await db.query.files.findMany({
    where: (table, { and, eq: eqFn, lt }) =>
      and(eqFn(table.status, FILE_STATUS.PENDING), lt(table.expiresAt, new Date()))
  })

  if (stale.length === 0) {
    return { deletedCount: 0 }
  }

  for (const file of stale) {
    await deleteStoredFile(file.storageKey)
  }

  // Delete by the exact id set already cleaned up above, not by re-evaluating the time
  // condition — a row that turns stale between the two queries must not be deleted from
  // the DB without its storage object having actually been removed first.
  const deleted = await db
    .delete(files)
    .where(inArray(files.id, stale.map(file => file.id)))
    .returning({ id: files.id })

  return { deletedCount: deleted.length }
}
