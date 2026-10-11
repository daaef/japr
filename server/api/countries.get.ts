import { getQuery } from 'h3'
import { db } from '#server/db/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const africaOnly = query.scope === 'africa'

  const [regionRows, countryRows] = await Promise.all([
    africaOnly
      ? db.query.regions.findMany({ where: (table, { eq: eqFn }) => eqFn(table.isAfrican, true) })
      : db.query.regions.findMany(),
    db.query.countries.findMany()
  ])

  return {
    regions: regionRows.map(region => ({
      ...region,
      countries: countryRows.filter(country => country.regionId === region.id)
    }))
  }
})
