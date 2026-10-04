import type { RoleKey } from './roles'
import type { ManuscriptStatus } from './manuscriptStatus'

export interface PingContext {
  senderName: string
  targetName: string
  manuscriptTitle: string
  manuscriptId: string
  manuscriptStatus: ManuscriptStatus
}

export interface PingTemplate {
  /** Unique key, e.g. 'remind-reviewer-deadline' */
  id: string
  /** Human label shown in the ping menu */
  label: string
  /** Target role(s) this template applies to */
  targetRoles: RoleKey[]
  /** Manuscript statuses where this template is relevant (empty = any) */
  applicableStatuses: ManuscriptStatus[]
  /** Template function — receives context, returns notification title + message */
  render: (context: PingContext) => { title: string; message: string }
}

export const pingTemplates: PingTemplate[] = [
  {
    id: 'new-manuscript-attention',
    label: 'New manuscript needs attention',
    targetRoles: ['managing_editor', 'editor_in_chief'],
    applicableStatuses: ['in-progress'],
    render: (ctx) => ({
      title: 'New manuscript needs attention',
      message: `${ctx.senderName} flagged '${ctx.manuscriptTitle}' for your attention \u2014 reviewers need to be assigned.`
    })
  },
  {
    id: 'remind-reviewer-deadline',
    label: 'Review deadline reminder',
    targetRoles: ['associate_editor', 'external_reviewer', 'desk_editor'],
    applicableStatuses: ['under_peer_review', 'in-progress'],
    render: (ctx) => ({
      title: 'Review deadline reminder',
      message: `${ctx.senderName} reminded you about your pending review for '${ctx.manuscriptTitle}'.`
    })
  },
  {
    id: 'revision-overdue',
    label: 'Revision overdue',
    targetRoles: ['author'],
    applicableStatuses: ['changes_requested'],
    render: (ctx) => ({
      title: 'Revision overdue',
      message: `${ctx.senderName} is following up on the revision request for '${ctx.manuscriptTitle}'.`
    })
  },
  {
    id: 'final-decision-needed',
    label: 'Final decision needed',
    targetRoles: ['editor_in_chief', 'admin'],
    applicableStatuses: ['ready_for_managing_editor_notice', 'reviewed'],
    render: (ctx) => ({
      title: 'Final decision needed',
      message: `${ctx.senderName} flagged '${ctx.manuscriptTitle}' \u2014 all reviews are in and a final decision is needed.`
    })
  },
  {
    id: 'general-attention',
    label: 'Needs your attention',
    targetRoles: ['admin', 'editor_in_chief', 'managing_editor', 'associate_editor', 'external_reviewer', 'author', 'desk_editor', 'copy_desk_editor'],
    applicableStatuses: [],
    render: (ctx) => ({
      title: 'Needs your attention',
      message: `${ctx.senderName} pinged you about '${ctx.manuscriptTitle}'.`
    })
  },
  {
    id: 'escalate-to-admin',
    label: 'Escalate to admin',
    targetRoles: ['admin'],
    applicableStatuses: [],
    render: (ctx) => ({
      title: 'Escalate to admin',
      message: `${ctx.senderName} escalated '${ctx.manuscriptTitle}' \u2014 admin intervention requested.`
    })
  }
]

export function getPingTemplate(id: string): PingTemplate | undefined {
  return pingTemplates.find(t => t.id === id)
}
