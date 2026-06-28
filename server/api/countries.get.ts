import { db } from '#server/db/client'

export default defineEventHandler(async () => {
  const [regionRows, countryRows] = await Promise.all([
    db.query.regions.findMany(),
    db.query.countries.findMany()
  ])

  return {
    regions: regionRows.map(region => ({
      ...region,
      countries: countryRows.filter(country => country.regionId === region.id)
    }))
  }
})
