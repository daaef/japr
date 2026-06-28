export interface EditorialBoardMember {
  name: string
  role: string
  email?: string
  institution?: string
  region?: string
}

export const editorInChief: EditorialBoardMember = {
  name: 'Emmanuel O. Oritsejafor',
  role: 'Editor in Chief',
  email: 'eoritsejafor@nccu.edu',
  institution: 'North Carolina Central University '
}

export const managingEditor: EditorialBoardMember = {
  name: 'Allan Cooper',
  role: 'Managing Editor',
  email: 'Allan.Cooper@ NCCU.edu',
  institution: 'North Carolina Central University '
}

export const deskEditor: EditorialBoardMember = {
  name: 'Ellen Whitworth',
  role: 'Desk Editor',
  email: 'ewhitwo2@nccu.edu',
  institution: 'North Carolina Central University '
}

export const associateEditors: EditorialBoardMember[] = [
  {
    name: 'George Kieh, Jr',
    role: 'Associate Editor',
    region: 'Diaspora- Europe, North, and South America',
    institution: 'Texas Southern University, Houston Texas '
  },
  {
    name: 'Nurudeen Akinyemi',
    role: 'Associate Editor',
    region: 'West Africa',
    institution: 'Kennesaw State University, Georgia '
  },
  {
    name: 'Nourdin Bejjit',
    role: 'Associate Editor',
    region: 'North Africa',
    institution: 'Mohammed V. University, Rabat'
  },
  {
    name: 'Muiu Mueni',
    role: 'Associate Editor',
    region: 'East Africa',
    institution: 'Winston Salem University, North Carolina'
  },
  {
    name: 'Musifiky Mwansali',
    role: 'Associate Editor',
    region: 'Central Africa',
    institution: 'Northwestern University & African Union'
  },
  {
    name: 'Tennyson Dunston Joseph',
    role: 'Associate Editor',
    region: 'The Diaspora and the Caribbean.',
    institution: 'North Carolina Central University '
  }
]
