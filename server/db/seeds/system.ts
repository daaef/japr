import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { permissionDefinitions, systemRoles } from '#shared/constants/permissions'
import { roleKeys, type RoleKey } from '#shared/constants/roles'
import { slugify } from '#server/utils/slug'
import { categorySeeds } from '../seeds/categories'
import { seedAssociateEditors } from '../seeds/associateEditors'
import { seedReviewers } from '../seeds/reviewers'
import { seedTestJournals } from '../seeds/testJournals'
import { seedManuscriptFiles } from '../seeds/manuscriptFiles'
import { accounts } from '../schema/auth'
import { categories, subCategories, subSubCategories } from '../schema/categories'
import { countries, regions } from '../schema/geography'
import { permissions, rolePermissions, roles, userRoles } from '../schema/roles'
import { users } from '../schema/users'
import type { db } from '../client'

type Database = typeof db

const defaultUsers: Array<{ role: RoleKey, username: string, email: string, fullname: string, password: string }> = [
  { role: 'admin', username: 'admin', email: 'admin@example.com', fullname: 'Admin User', password: 'password' },
  { role: 'editor_in_chief', username: 'editor_in_chief', email: 'editor@example.com', fullname: 'Editor in Chief', password: 'password' },
  { role: 'managing_editor', username: 'managing_editor', email: 'managing@example.com', fullname: 'Managing Editor', password: 'password' },
  { role: 'author', username: 'author', email: 'author@example.com', fullname: 'Author User', password: 'password' },
  { role: 'associate_editor', username: 'associate_editor', email: 'associate@example.com', fullname: 'Associate Editor', password: 'password' },
  { role: 'desk_editor', username: 'desk_editor', email: 'desk@example.com', fullname: 'Desk Editor', password: 'password' },
  { role: 'external_reviewer', username: 'external_reviewer', email: 'external@example.com', fullname: 'External Reviewer', password: 'password' },
  { role: 'copy_desk_editor', username: 'copy_desk_editor', email: 'copydesk@example.com', fullname: 'Copy Desk Editor', password: 'password' }
]

const regionSeeds: Record<string, string[]> = {
  'Central Africa': ['Angola', 'Cameroon', 'Central African Republic', 'Chad', 'Congo', 'DR Congo', 'Equatorial Guinea', 'Gabon', 'Sao Tome and Principe'],
  'East Africa': ['Burundi', 'Comoros', 'Djibouti', 'Eritrea', 'Ethiopia', 'Kenya', 'Madagascar', 'Malawi', 'Mauritius', 'Mozambique', 'Rwanda', 'Seychelles', 'Somalia', 'South Sudan', 'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe'],
  'North Africa': ['Algeria', 'Egypt', 'Libya', 'Morocco', 'Sudan', 'Tunisia'],
  'Southern Africa': ['Botswana', 'Eswatini', 'Lesotho', 'Namibia', 'South Africa'],
  'West Africa': ['Benin', 'Burkina Faso', 'Cape Verde', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Liberia', 'Mali', 'Mauritania', 'Niger', 'Nigeria', 'Senegal', 'Sierra Leone', 'Togo'],
  'North America': ['Canada', 'Mexico', 'United States'],
  Europe: ['France', 'Germany', 'Italy', 'Spain', 'United Kingdom'],
  Asia: ['China', 'India', 'Japan', 'Singapore', 'United Arab Emirates'],
  'Australia & Oceania': ['Australia', 'New Zealand', 'Fiji']
}

export async function seedSystemData(database: Database, options?: {
  defaultAdminEmail?: string
  defaultAdminPassword?: string
}) {
  const roleIdMap = new Map<string, string>()
  const permissionIdMap = new Map<string, string>()

  for (const permission of permissionDefinitions) {
    let record = await database.query.permissions.findFirst({
      where: (table, { eq, and, isNull }) => and(
        eq(table.resource, permission.resource),
        eq(table.action, permission.action),
        permission.scope === null ? isNull(table.scope) : eq(table.scope, permission.scope)
      )
    })

    if (!record) {
      record = await database.query.permissions.findFirst({
        where: (table, { eq }) => eq(table.name, permission.name)
      })
    }

    if (!record) {
      const inserted = await database.insert(permissions).values({
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope,
        description: permission.description
      }).returning()

      record = inserted[0]!
    }

    permissionIdMap.set(permission.name, record.id)
  }

  for (const role of systemRoles) {
    let record = await database.query.roles.findFirst({
      where: (table, { eq }) => eq(table.name, role.name)
    })

    if (!record) {
      const inserted = await database.insert(roles).values({
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isActive: true
      }).returning()

      record = inserted[0]!
    }

    roleIdMap.set(role.name, record.id)

    for (const permissionName of role.permissions) {
      const permissionId = permissionIdMap.get(permissionName)
      if (!permissionId) {
        continue
      }

      const existing = await database.query.rolePermissions.findFirst({
        where: (table, { and, eq }) => and(eq(table.roleId, record.id), eq(table.permissionId, permissionId))
      })

      if (!existing) {
        await database.insert(rolePermissions).values({
          roleId: record.id,
          permissionId
        })
      }
    }
  }

  for (const [regionName, countryNames] of Object.entries(regionSeeds)) {
    let region = await database.query.regions.findFirst({
      where: (table, { eq }) => eq(table.name, regionName)
    })

    if (!region) {
      const inserted = await database.insert(regions).values({ name: regionName }).returning()
      region = inserted[0]!
    }

    for (const countryName of countryNames) {
      const existingCountry = await database.query.countries.findFirst({
        where: (table, { eq }) => eq(table.name, countryName)
      })

      if (!existingCountry) {
        await database.insert(countries).values({
          name: countryName,
          code: countryName.slice(0, 2).toUpperCase(),
          regionId: region.id
        })
      }
    }
  }

  const categoryIdMap = new Map<string, string>()
  for (const categoryName of categorySeeds) {
    let category = await database.query.categories.findFirst({
      where: (table, { eq }) => eq(table.name, categoryName)
    })

    if (!category) {
      const inserted = await database.insert(categories).values({
        name: categoryName,
        slug: slugify(categoryName),
        description: `${categoryName} submissions and research topics.`,
        isActive: true
      }).returning()
      category = inserted[0]!
    }

    categoryIdMap.set(categoryName, category.id)
  }

  for (const categoryName of categorySeeds) {
    const categoryId = categoryIdMap.get(categoryName)
    if (!categoryId) {
      continue
    }

    const subSlug = slugify(categoryName)
    let subCategory = await database.query.subCategories.findFirst({
      where: (table, { and, eq }) => and(eq(table.categoryId, categoryId), eq(table.slug, subSlug))
    })

    if (!subCategory) {
      const inserted = await database.insert(subCategories).values({
        name: categoryName,
        slug: subSlug,
        categoryId
      }).returning()
      subCategory = inserted[0]!
    }

    const subSubSlug = slugify(`${categoryName}-general`)
    const existingSubSub = await database.query.subSubCategories.findFirst({
      where: (table, { and, eq }) => and(eq(table.subCategoryId, subCategory!.id), eq(table.slug, subSubSlug))
    })

    if (!existingSubSub) {
      await database.insert(subSubCategories).values({
        name: categoryName,
        slug: subSubSlug,
        subCategoryId: subCategory.id
      })
    }
  }

  const computerScienceId = categoryIdMap.get('Computer Science')
  const engineeringId = categoryIdMap.get('Engineering')

  if (computerScienceId) {
    const existing = await database.query.subCategories.findFirst({
      where: (table, { eq }) => eq(table.slug, 'artificial-intelligence')
    })

    let subCategoryId = existing?.id
    if (!existing) {
      const inserted = await database.insert(subCategories).values({
        name: 'Artificial Intelligence',
        slug: 'artificial-intelligence',
        categoryId: computerScienceId
      }).returning()
      subCategoryId = inserted[0]!.id
    }

    if (subCategoryId) {
      const existingSubSub = await database.query.subSubCategories.findFirst({
        where: (table, { eq }) => eq(table.slug, 'machine-learning')
      })

      if (!existingSubSub) {
        await database.insert(subSubCategories).values({
          name: 'Machine Learning',
          slug: 'machine-learning',
          subCategoryId
        })
      }
    }
  }

  if (engineeringId) {
    const existing = await database.query.subCategories.findFirst({
      where: (table, { eq }) => eq(table.slug, 'civil-engineering')
    })

    if (!existing) {
      await database.insert(subCategories).values({
        name: 'Civil Engineering',
        slug: 'civil-engineering',
        categoryId: engineeringId
      })
    }
  }

  for (const userSeed of defaultUsers) {
    let user = await database.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, userSeed.email)
    })

    if (!user) {
      const now = new Date()
      const password = await hashPassword(userSeed.password)
      const inserted = await database.insert(users).values({
        name: userSeed.fullname,
        fullname: userSeed.fullname,
        username: userSeed.username,
        email: userSeed.email,
        emailVerified: true,
        emailVerifiedAt: now,
        passwordHash: password,
        isActive: true,
        reviewPolicyAccepted: true
      }).returning()

      user = inserted[0]!

      await database.insert(accounts).values({
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password
      })
    }

    const roleId = roleIdMap.get(userSeed.role)
    if (roleId) {
      const existingAssignment = await database.query.userRoles.findFirst({
        where: (table, { and, eq }) => and(eq(table.userId, user.id), eq(table.roleId, roleId))
      })

      if (!existingAssignment) {
        await database.insert(userRoles).values({
          userId: user.id,
          roleId
        })
      }
    }
  }

  const adminEmail = options?.defaultAdminEmail?.trim()
  const adminPassword = options?.defaultAdminPassword?.trim()
  const adminRoleId = roleIdMap.get('admin')

  if (adminEmail && adminPassword && adminRoleId) {
    let admin = await database.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, adminEmail)
    })

    if (!admin) {
      const password = await hashPassword(adminPassword)
      const inserted = await database.insert(users).values({
        name: 'Platform Administrator',
        fullname: 'Platform Administrator',
        username: 'platform_admin',
        email: adminEmail,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        passwordHash: password,
        isActive: true
      }).returning()

      admin = inserted[0]!

      await database.insert(accounts).values({
        id: randomUUID(),
        userId: admin.id,
        accountId: admin.id,
        providerId: 'credential',
        password
      })
    }

    const existingAssignment = await database.query.userRoles.findFirst({
      where: (table, { and, eq }) => and(eq(table.userId, admin.id), eq(table.roleId, adminRoleId))
    })

    if (!existingAssignment) {
      await database.insert(userRoles).values({
        userId: admin.id,
        roleId: adminRoleId
      })
    }
  }

  await seedReviewers(database, roleIdMap)
  await seedAssociateEditors(database)
  await seedTestJournals(database)
  await seedManuscriptFiles(database)

  for (const role of roleKeys) {
    if (!roleIdMap.has(role)) {
      throw new Error(`Missing seeded role: ${role}`)
    }
  }
}
