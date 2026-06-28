import { eq } from 'drizzle-orm'
import { categories, subCategories, subSubCategories } from '../schema/categories'
import { journals } from '../schema/journals'
import { slugify } from '#server/utils/slug'
import type { db } from '../client'

type Database = typeof db

const testJournalSeeds = [
  {
    title: 'Agricultural Innovations in West Africa: A Comprehensive Review',
    description: 'This study examines modern agricultural practices and innovations across West African countries, focusing on sustainable farming methods and crop improvement techniques.',
    country: 'Nigeria',
    categoryName: 'Agriculture',
    abstract: 'This comprehensive review explores agricultural innovations in West Africa, examining sustainable farming practices, crop improvement techniques, and the impact of climate change on agricultural productivity.'
  },
  {
    title: 'Public Health Challenges in East African Urban Centers',
    description: 'An analysis of public health issues and healthcare delivery systems in major East African cities, with recommendations for improvement.',
    country: 'Kenya',
    categoryName: 'Medicine',
    abstract: 'This study analyzes public health challenges in East African urban centers, examining healthcare delivery systems, disease prevention strategies, and recommendations for improving public health outcomes.'
  },
  {
    title: 'Renewable Energy Development in North Africa: Opportunities and Challenges',
    description: 'A technical analysis of renewable energy projects and infrastructure development in North African countries.',
    country: 'Egypt',
    categoryName: 'Engineering',
    abstract: 'This technical analysis examines renewable energy development in North Africa, exploring opportunities and challenges in solar, wind, and hydroelectric power generation.'
  },
  {
    title: 'Educational Policy Reform in Southern Africa: A Comparative Study',
    description: 'Comparative analysis of educational policies and reforms across Southern African countries, focusing on access, quality, and outcomes.',
    country: 'South Africa',
    categoryName: 'Education',
    abstract: 'This comparative study analyzes educational policy reforms in Southern Africa, examining access, quality, and outcomes across different countries in the region.'
  },
  {
    title: 'Digital Transformation in North American Business: Trends and Implications',
    description: 'Analysis of digital transformation trends in North American businesses and their implications for economic growth and competitiveness.',
    country: 'United States',
    categoryName: 'Business',
    abstract: 'This analysis examines digital transformation trends in North American businesses, exploring implications for economic growth, competitiveness, and future business models.'
  },
  {
    title: 'Environmental Science Research in Asian Ecosystems: Biodiversity and Conservation',
    description: 'Comprehensive study of biodiversity and conservation efforts in Asian ecosystems, with focus on environmental science and sustainability.',
    country: 'China',
    categoryName: 'Natural Sciences',
    abstract: 'This comprehensive study examines biodiversity and conservation efforts in Asian ecosystems, focusing on environmental science, sustainability, and the impact of human activities on natural habitats.'
  },
  {
    title: 'Tropical Agriculture and Biodiversity Conservation in South America',
    description: 'Study of tropical agriculture practices and their relationship with biodiversity conservation in South American ecosystems.',
    country: 'Brazil',
    categoryName: 'Agriculture',
    abstract: 'This study explores tropical agriculture practices and their relationship with biodiversity conservation in South American ecosystems, examining sustainable farming methods and their impact on local biodiversity.'
  },
  {
    title: 'Clinical Trials and Public Health Policy in European Healthcare Systems',
    description: 'Analysis of clinical trial methodologies and their influence on public health policy development in European healthcare systems.',
    country: 'United Kingdom',
    categoryName: 'Medicine',
    abstract: 'This analysis examines clinical trial methodologies and their influence on public health policy development in European healthcare systems, exploring the relationship between research and policy implementation.'
  }
] as const

export async function seedTestJournals(database: Database) {
  const author = await database.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, 'author@example.com')
  })

  if (!author) {
    throw new Error('author@example.com missing — run user seed first')
  }

  for (const seed of testJournalSeeds) {
    const slug = slugify(seed.title)
    const existing = await database.query.journals.findFirst({
      where: (table, { eq }) => eq(table.slug, slug)
    })

    if (existing) {
      if (existing.approvalStatus !== 'approved' || existing.isDraft || !existing.isActive) {
        await database
          .update(journals)
          .set({
            approvalStatus: 'approved',
            isActive: true,
            isDraft: false
          })
          .where(eq(journals.id, existing.id))
      }
      continue
    }

    let category = await database.query.categories.findFirst({
      where: (table, { eq }) => eq(table.name, seed.categoryName)
    })

    if (!category) {
      const inserted = await database.insert(categories).values({
        name: seed.categoryName,
        slug: slugify(seed.categoryName),
        description: `${seed.categoryName} submissions and research topics.`,
        isActive: true
      }).returning()
      category = inserted[0]!
    }

    let subCategory = await database.query.subCategories.findFirst({
      where: (table, { and, eq }) => and(eq(table.categoryId, category!.id), eq(table.name, seed.categoryName))
    })

    if (!subCategory) {
      const inserted = await database.insert(subCategories).values({
        name: seed.categoryName,
        slug: slugify(`${seed.categoryName}-general`),
        categoryId: category.id
      }).returning()
      subCategory = inserted[0]!
    }

    let subSubCategory = await database.query.subSubCategories.findFirst({
      where: (table, { and, eq }) => and(eq(table.subCategoryId, subCategory!.id), eq(table.name, seed.categoryName))
    })

    if (!subSubCategory) {
      const inserted = await database.insert(subSubCategories).values({
        name: seed.categoryName,
        slug: slugify(`${seed.categoryName}-topics`),
        subCategoryId: subCategory.id
      }).returning()
      subSubCategory = inserted[0]!
    }

    await database.insert(journals).values({
      title: seed.title,
      author: author.fullname ?? author.name,
      slug,
      description: seed.description,
      abstract: seed.abstract,
      approvalStatus: 'approved',
      isActive: true,
      isDraft: false,
      country: seed.country,
      institution: author.institution ?? 'Test Institution',
      journalFormat: 'research_paper',
      journalLanguage: 'English',
      metaTitle: seed.title,
      metaDescription: seed.description,
      metaKeywords: JSON.stringify(['agriculture', 'health', 'education', 'technology', 'science']),
      license: { type: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      userId: author.id,
      categoryId: category.id,
      subCategoryId: subCategory.id,
      subSubCategoryId: subSubCategory.id,
      createdBy: { userId: author.id, name: author.fullname ?? author.name },
      accept: true,
      agree: true
    })
  }
}
