import { getQuery } from 'h3'
import { db } from '#server/db/client'
import { getCurrentUserContext } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const includeInactive = query.includeInactive === '1' || query.includeInactive === 'true'

  // Inactive categories are admin-only management data.
  if (includeInactive) {
    const context = await getCurrentUserContext(event)
    if (!context.roles.includes('admin')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden.' })
    }
  }

  const [categoryRows, subCategoryRows, subSubCategoryRows] = await Promise.all([
    db.query.categories.findMany({
      where: includeInactive ? undefined : (table, { eq }) => eq(table.isActive, true)
    }),
    db.query.subCategories.findMany(),
    db.query.subSubCategories.findMany()
  ])

  return {
    categories: categoryRows.map(category => ({
      ...category,
      categoryName: category.name,
      subCategories: subCategoryRows
        .filter(subCategory => subCategory.categoryId === category.id)
        .map(subCategory => ({
          ...subCategory,
          subSubCategories: subSubCategoryRows.filter(child => child.subCategoryId === subCategory.id)
        }))
    }))
  }
})
