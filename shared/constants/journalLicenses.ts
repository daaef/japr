export const JOURNAL_LICENSE_OPTIONS = [
  { id: 'cc-by', label: 'CC BY' },
  { id: 'cc-by-sa', label: 'CC BY-SA' },
  { id: 'cc-by-nd', label: 'CC BY-ND' },
  { id: 'cc-by-nc', label: 'CC BY-NC' },
  { id: 'cc-by-nc-sa', label: 'CC BY-NC-SA' },
  { id: 'cc-by-nc-nd', label: 'CC BY-NC-ND' },
  { id: 'cc0', label: 'CC0' },
  { id: 'pub_domain', label: 'Public domain' },
  { id: 'own_license', label: 'Publisher\'s own license' }
] as const

export const JOURNAL_LICENSE_LABELS = JOURNAL_LICENSE_OPTIONS.map(option => option.label)
