/**
 * Single version-numbering scheme (B17) — previously revision.post.ts derived the next
 * number from a row count (`1.${count}`) while server/services/versions.ts's revert
 * derived it from a different, colliding formula (`floor(n/10).${n%10}`, which wraps back
 * to "1.0" at the 10th version). Both call sites now derive from the highest existing
 * minor number instead of a count, so a gap (e.g. a deleted version) can't produce a
 * duplicate or skipped number. Kept in its own zero-dependency module (rather than
 * alongside its DB-touching siblings in services/versions.ts) so it stays importable from
 * plain `tsx --test` without pulling in session.ts's runtime `h3` import.
 */
export function getNextVersionNumber(existingVersions: Array<{ versionNumber: string }>) {
  const highestMinor = existingVersions.reduce((max, version) => {
    const minor = Number(version.versionNumber.split('.')[1])
    return Number.isFinite(minor) && minor > max ? minor : max
  }, 0)

  return `1.${highestMinor + 1}`
}
