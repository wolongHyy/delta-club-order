export type ServiceType = {
  id: string
  name: string
  icon: string
  sort: number
  enabled: boolean
  reserved: boolean
}

export type Companion = {
  id: string
  serviceTypeId: string
  kind: 'product' | 'fighter'
  name: string
  avatar: string
  gender: string
  tags: string[]
  price: number
  unit: string
  rank: string
  description: string
  sales: number
  rating: number
  status: number
  sort: number
  createdAt?: string
  updatedAt?: string
}

export type OrderStatus = 'unpaid' | 'pending' | 'assigned' | 'in_progress' | 'completion_pending' | 'completed' | 'cancelled'
export type AssignmentSource = 'customer' | 'fighter' | 'admin' | ''

export type Order = {
  id: string
  orderNo: string
  companionId: string
  companionName: string
  serviceTypeId: string
  serviceName: string
  spec: string
  unitCount: number
  price: number
  amount: number
  gameField: string
  gameMode: string
  mapName: string
  inGameId: string
  rank: string
  remark: string
  status: OrderStatus
  customerId: string
  customerName: string
  fighterId: string
  fighterName: string
  assignedBy: AssignmentSource
  isTrial: boolean
  paid: boolean
  paidAt: string
  paymentMethod: string
  customerPhone: string
  completionNote: string
  completionProof: string[]
  platformRate: number
  fighterIncome: number
  idempotencyKey?: string
  completionRequestedAt: string
  completedAt: string
  createdAt: string
  updatedAt: string
}

export type OrderEvent = {
  id: string
  orderId: string
  action: string
  fromStatus: string
  toStatus: string
  actorType: string
  actorId: string
  actorName: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type Message = {
  id: string
  type: 'official' | 'customer_service'
  title: string
  content: string
  isRead: boolean
  createdAt: string
}

export type FighterApplicationStatus = 'pending' | 'approved' | 'rejected'

export type FighterApplication = {
  id: string
  customerId: string
  openid: string
  nickname: string
  avatarUrl: string
  gameName: string
  contact: string
  rank: string
  modes: string[]
  intro: string
  username: string
  tier: string
  status: FighterApplicationStatus
  createdAt: string
  updatedAt: string
}

export type FighterAccount = {
  id: string
  applicationId: string
  companionId: string
  username: string
  openid: string
  nickname: string
  avatarUrl: string
  displayName: string
  tier: string
  online: boolean
  enabled: boolean
  createdAt: string
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected'
export type Withdrawal = {
  id: string
  fighterId: string
  fighterName: string
  amount: number
  accountInfo: string
  status: WithdrawalStatus
  createdAt: string
  reviewedAt: string
}

export type FighterEarnings = {
  available: number
  settled: number
  pendingSettlement: number
  withdrawn: number
  pendingWithdrawal: number
  recentOrders: Order[]
}

export type HomeData = {
  serviceTypes: ServiceType[]
  hot: Companion[]
  banners: { id: string; title: string; subtitle: string }[]
}

export type Stats = {
  todayOrders: number
  todayRevenue: number
  inProgress: number
  activeCompanions: number
  pendingFighters: number
  weekOrders: { date: string; count: number; revenue: number }[]
  topCompanions: { name: string; sales: number }[]
  statusCounts: Record<string, number>
}

export type AnalyticsFilters = {
  start?: string
  end?: string
  status?: string
  source?: string
  fighterId?: string
  serviceTypeId?: string
  companionId?: string
  keyword?: string
}

export type AnalyticsTotals = {
  orders: number
  validOrders: number
  pending: number
  assigned: number
  inProgress: number
  completionPending: number
  completed: number
  cancelled: number
  trialOrders: number
  unassignedPending: number
  grossVolume: number
  completedRevenue: number
  platformRevenue: number
  fighterIncome: number
  avgOrderValue: number
  completionRate: number
  cancellationRate: number
}

export type AnalyticsTrendPoint = {
  date: string
  orders: number
  validOrders: number
  revenue: number
  completedRevenue: number
  platformRevenue: number
  fighterIncome: number
}

export type AnalyticsBreakdownRow = {
  label: string
  orders: number
  grossVolume: number
  completedRevenue: number
  platformRevenue: number
  fighterIncome: number
  completionRate: number
}

export type Analytics = {
  generatedAt: string
  filters: AnalyticsFilters
  totals: AnalyticsTotals
  trend: AnalyticsTrendPoint[]
  statusBreakdown: AnalyticsBreakdownRow[]
  sourceBreakdown: AnalyticsBreakdownRow[]
  serviceBreakdown: AnalyticsBreakdownRow[]
  fighterBreakdown: AnalyticsBreakdownRow[]
  companionBreakdown: AnalyticsBreakdownRow[]
  recentOrders: Order[]
}

export type Setting = { key: string; value: string }
export type TrialQuota = { used: number; remaining: number; limit: number }


// ===== 24h 智能客服（AI Customer Service）=====
export type AiConversation = {
  id: string
  customerId: string
  customerName: string
  title: string
  status: "active" | "closed"
  messageCount: number
  createdAt: string
  updatedAt: string
}

export type AiChatMessage = {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  sources: string[]
  createdAt: string
}

export type AiKnowledgeChunk = {
  id: string
  key: string
  category: string
  title: string
  content: string
  keywords: string
  source: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type AiSettings = {
  enabled: boolean
  baseUrl: string
  apiKey: string
  model: string
  assistantName: string
  welcomeMessage: string
  temperature: number
  maxHistory: number
  topK: number
  persona: string
  quickQuestions: string[]
  testMessage: string
}
