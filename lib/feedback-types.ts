export type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'ANSWERED' | 'CLOSED'
export type FeedbackType = 'EMPLOYEE_TO_COMPANY' | 'COMPANY_TO_EMPLOYEE' | 'ONE_TO_ONE'
export type FeedbackCategory =
  | 'SUGGESTION'
  | 'COMPLAINT'
  | 'PRAISE'
  | 'IMPROVEMENT_IDEA'
  | 'REPORT'

export type FeedbackMessageRecord = {
  id: string
  feedbackId: string
  senderId: string
  message: string
  createdAt: string
  senderDisplayName?: string | null
}

export type FeedbackAttachmentRecord = {
  id: string
  feedbackId: string
  messageId?: string | null
  fileName: string
  fileUrl: string
  mimeType?: string | null
  size?: number | null
}

export type FeedbackRecord = {
  id: string
  title: string
  description: string
  status: FeedbackStatus
  type: FeedbackType
  category: FeedbackCategory
  companyFeedbackKind?: string | null
  createdAt: string
  updatedAt: string
  createdById: string
  targetEmployeeId?: string | null
  responsibleId?: string | null
  createdByDisplayName?: string | null
  hrVisibilityLabel?: string | null
  isAnonymous: boolean
  isVisibleToHR: boolean
  requiresReadConfirmation: boolean
  readAt?: string | null
  messages?: FeedbackMessageRecord[]
  attachments?: FeedbackAttachmentRecord[]
  targetEmployee?: {
    id: string
    user?: { name?: string | null }
  } | null
  responsible?: {
    id: string
    user?: { name?: string | null }
  } | null
}

export type FeedbackDashboardRecord = {
  totalFeedbacks: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  pendingFeedbacks: number
  averageResponseTimeHours: number
  satisfactionScore: number
  latestFeedbacks: FeedbackRecord[]
}

export type FeedbackRecipientRecord = {
  id: string
  name: string
  email: string
  branchName?: string | null
  departmentName?: string | null
}
