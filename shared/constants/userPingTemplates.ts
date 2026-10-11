export interface UserPingTemplate {
  id: string
  label: string
  message: string
}

export const userPingTemplates: UserPingTemplate[] = [
  {
    id: 'needs-attention',
    label: 'Needs your attention',
    message: 'This needs your attention. Please check the system when you can.'
  },
  {
    id: 'follow-up',
    label: 'Follow up required',
    message: 'Following up with you. Please let us know if you need anything.'
  },
  {
    id: 'deadline-reminder',
    label: 'Deadline reminder',
    message: 'This is a friendly reminder about an upcoming deadline.'
  },
  {
    id: 'action-needed',
    label: 'Action needed',
    message: 'An action is needed from you. Please review and respond.'
  }
]

export function getUserPingTemplate(id: string): UserPingTemplate | undefined {
  return userPingTemplates.find(t => t.id === id)
}
