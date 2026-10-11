export interface EditorialBoardMember {
  id: string
  name: string
  role: string
  section: string
  email: string | null
  institution: string | null
  region: string | null
  sortOrder: number
  isActive: boolean
}
