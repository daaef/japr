import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { accounts } from '../schema/auth'
import type { RoleKey } from '#shared/constants/roles'
import { userRoles } from '../schema/roles'
import { users } from '../schema/users'
import type { db } from '../client'

type Database = typeof db

export const associateEditorSeeds = [
  {
    fullname: 'Dr. Sarah Johnson',
    username: 'sarah.johnson',
    email: 'sarah.johnson@example.com',
    password: 'password123',
    country: 'Nigeria',
    institution: 'University of Lagos',
    biography: 'Expert in agricultural sciences with focus on West African farming practices.',
    researchInterests: ['Agriculture', 'Medicine'],
    regionalExpertise: ['West Africa', 'Nigeria'],
    averageRating: '4.5',
    reviewCount: 12
  },
  {
    fullname: 'Dr. Michael Chen',
    username: 'michael.chen',
    email: 'michael.chen@example.com',
    password: 'password123',
    country: 'Kenya',
    institution: 'University of Nairobi',
    biography: 'Public health specialist with extensive experience in East African healthcare systems.',
    researchInterests: ['Medicine', 'Public Health'],
    regionalExpertise: ['East Africa', 'Kenya'],
    averageRating: '4.8',
    reviewCount: 8
  },
  {
    fullname: 'Dr. Ahmed Hassan',
    username: 'ahmed.hassan',
    email: 'ahmed.hassan@example.com',
    password: 'password123',
    country: 'Egypt',
    institution: 'Cairo University',
    biography: 'Engineering expert specializing in renewable energy and sustainable development.',
    researchInterests: ['Engineering', 'Technology'],
    regionalExpertise: ['North Africa', 'Egypt'],
    averageRating: '4.2',
    reviewCount: 15
  },
  {
    fullname: 'Dr. Maria Rodriguez',
    username: 'maria.rodriguez',
    email: 'maria.rodriguez@example.com',
    password: 'password123',
    country: 'South Africa',
    institution: 'University of Cape Town',
    biography: 'Social scientist with expertise in educational policy and community development.',
    researchInterests: ['Social Sciences', 'Education'],
    regionalExpertise: ['Southern Africa', 'South Africa'],
    averageRating: '4.6',
    reviewCount: 10
  },
  {
    fullname: 'Dr. James Wilson',
    username: 'james.wilson',
    email: 'james.wilson@example.com',
    password: 'password123',
    country: 'United States',
    institution: 'Harvard University',
    biography: 'Business and technology expert with focus on digital transformation and innovation.',
    researchInterests: ['Business', 'Technology'],
    regionalExpertise: ['North America', 'United States'],
    averageRating: '4.4',
    reviewCount: 20
  },
  {
    fullname: 'Dr. Li Wei',
    username: 'li.wei',
    email: 'li.wei@example.com',
    password: 'password123',
    country: 'China',
    institution: 'Tsinghua University',
    biography: 'Natural sciences researcher with expertise in environmental science and engineering.',
    researchInterests: ['Natural Sciences', 'Engineering'],
    regionalExpertise: ['Asia', 'China'],
    averageRating: '4.7',
    reviewCount: 18
  },
  {
    fullname: 'Dr. Carlos Silva',
    username: 'carlos.silva',
    email: 'carlos.silva@example.com',
    password: 'password123',
    country: 'Brazil',
    institution: 'University of São Paulo',
    biography: 'Agricultural scientist with expertise in tropical agriculture and biodiversity.',
    researchInterests: ['Agriculture', 'Natural Sciences'],
    regionalExpertise: ['South America', 'Brazil'],
    averageRating: '4.3',
    reviewCount: 14
  },
  {
    fullname: 'Dr. Emma Thompson',
    username: 'emma.thompson',
    email: 'emma.thompson@example.com',
    password: 'password123',
    country: 'United Kingdom',
    institution: 'University of Oxford',
    biography: 'Medical researcher with expertise in clinical trials and public health policy.',
    researchInterests: ['Medicine', 'Social Sciences'],
    regionalExpertise: ['Europe', 'United Kingdom'],
    averageRating: '4.9',
    reviewCount: 25
  }
] as const

export async function seedAssociateEditors(database: Database) {
  const role = await database.query.roles.findFirst({
    where: (table, { eq }) => eq(table.name, 'associate_editor' satisfies RoleKey)
  })

  if (!role) {
    throw new Error('Associate Editor role missing — run role seed first')
  }

  for (const editor of associateEditorSeeds) {
    let user = await database.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, editor.email)
    })

    if (!user) {
      const password = await hashPassword(editor.password)
      const now = new Date()
      const inserted = await database.insert(users).values({
        name: editor.fullname,
        fullname: editor.fullname,
        username: editor.username,
        email: editor.email,
        emailVerified: true,
        emailVerifiedAt: now,
        passwordHash: password,
        country: editor.country,
        institution: editor.institution,
        biography: editor.biography,
        researchInterests: [...editor.researchInterests],
        regionalExpertise: [...editor.regionalExpertise],
        averageRating: editor.averageRating,
        reviewCount: editor.reviewCount,
        availableForReview: true,
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

    const existingAssignment = await database.query.userRoles.findFirst({
      where: (table, { and, eq }) => and(eq(table.userId, user!.id), eq(table.roleId, role.id))
    })

    if (!existingAssignment) {
      await database.insert(userRoles).values({
        userId: user.id,
        roleId: role.id
      })
    }
  }
}
