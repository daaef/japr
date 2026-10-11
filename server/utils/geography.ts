import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { countries, regions } from '#server/db/schema'

/** True only if `countryName` matches a seeded country whose region is flagged African. */
export async function isAfricanCountry(countryName: string): Promise<boolean> {
  const rows = await db
    .select({ isAfrican: regions.isAfrican })
    .from(countries)
    .innerJoin(regions, eq(countries.regionId, regions.id))
    .where(eq(countries.name, countryName))
    .limit(1)

  return rows[0]?.isAfrican === true
}
