import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type {
  AnalyticsBreakdownRow,
  AnalyticsFilters,
  AnalyticsTrendPoint,
  Analytics,
  Companion,
  FighterAccount,
  FighterEarnings,
  FighterApplication,
  FighterApplicationStatus,
  Message,
  Order,
  OrderEvent,
  OrderStatus,
  ServiceType,
  Stats,
  Withdrawal,
  WithdrawalStatus,
} from './types'
import { cacheWrap, invalidateCache } from './cache.ts'

let db: DatabaseSync | null = null
let lastExpiredCancelCheckAt = 0

export function getDb(): DatabaseSync {
  if (!db) {
    const file = process.env.DB_PATH || path.join(process.cwd(), 'db', 'custom.db')
    db = new DatabaseSync(file)
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA synchronous = NORMAL;
    `)
    ensureSchema(db)
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function maybeCancelExpiredOrders() {
  const now = Date.now()
  if (now - lastExpiredCancelCheckAt < 60_000) return
  lastExpiredCancelCheckAt = now

  const minutes = Number(process.env.ORDER_AUTO_CANCEL_MINUTES ?? 30)
  if (!Number.isFinite(minutes) || minutes <= 0) return
  try {
    cancelExpiredOrders(minutes)
  } catch (error) {
    console.error('lazy cancel expired orders failed', error)
  }
}

function ensureSchema(d: DatabaseSync) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS ServiceType (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'gamepad-2',
      sort INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      reserved INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS Companion (
      id TEXT PRIMARY KEY,
      serviceTypeId TEXT NOT NULL,
      kind TEXT DEFAULT 'product',
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      price REAL NOT NULL,
      priceCents INTEGER DEFAULT NULL,
      unit TEXT DEFAULT '小时',
      "rank" TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sales INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      status INTEGER DEFAULT 1,
      sort INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS "Order" (
      id TEXT PRIMARY KEY,
      orderNo TEXT UNIQUE NOT NULL,
      companionId TEXT,
      companionName TEXT NOT NULL,
      serviceTypeId TEXT,
      serviceName TEXT NOT NULL,
      spec TEXT DEFAULT '',
      unitCount REAL NOT NULL,
      price REAL NOT NULL,
      amount REAL NOT NULL,
      priceCents INTEGER DEFAULT NULL,
      amountCents INTEGER DEFAULT NULL,
      gameField TEXT DEFAULT '',
      gameMode TEXT DEFAULT '',
      mapName TEXT DEFAULT '',
      inGameId TEXT DEFAULT '',
      "rank" TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      paid INTEGER DEFAULT 0,
      paidAt TEXT DEFAULT '',
      paymentMethod TEXT DEFAULT '',
      customerPhone TEXT DEFAULT '',
      completionNote TEXT DEFAULT '',
      completionProof TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      customerId TEXT DEFAULT '',
      customerName TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Message (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'official',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS AppSetting (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS FighterApplication (
      id TEXT PRIMARY KEY,
      customerId TEXT DEFAULT '',
      openid TEXT DEFAULT '',
      nickname TEXT DEFAULT '',
      avatarUrl TEXT DEFAULT '',
      gameName TEXT NOT NULL,
      contact TEXT NOT NULL,
      "rank" TEXT DEFAULT '',
      modes TEXT DEFAULT '[]',
      intro TEXT DEFAULT '',
      username TEXT DEFAULT '',
      passwordHash TEXT DEFAULT '',
      fighterAccountId TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS FighterAccount (
      id TEXT PRIMARY KEY,
      applicationId TEXT UNIQUE,
      companionId TEXT DEFAULT '',
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      openid TEXT DEFAULT '',
      nickname TEXT DEFAULT '',
      avatarUrl TEXT DEFAULT '',
      displayName TEXT NOT NULL,
      online INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Withdrawal (
      id TEXT PRIMARY KEY,
      fighterId TEXT NOT NULL,
      fighterName TEXT DEFAULT '',
      amount REAL NOT NULL,
      amountCents INTEGER DEFAULT NULL,
      accountInfo TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      reviewedAt TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS OrderEvent (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      action TEXT NOT NULL,
      fromStatus TEXT NOT NULL,
      toStatus TEXT NOT NULL,
      actorType TEXT NOT NULL,
      actorId TEXT DEFAULT '',
      actorName TEXT DEFAULT '',
    metadata TEXT DEFAULT '{}',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS AuditLog (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actorType TEXT NOT NULL,
      actorName TEXT NOT NULL DEFAULT '',
      targetId TEXT NOT NULL DEFAULT '',
      method TEXT NOT NULL DEFAULT '',
      path TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS RateLimitBucket (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      resetAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS OrderSequence (
      dateKey TEXT PRIMARY KEY,
      lastNumber INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS AiConversation (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      title TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      messageCount INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS AiMessage (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT DEFAULT '',
      sources TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS AiKnowledgeChunk (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE,
      category TEXT DEFAULT '',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      keywords TEXT DEFAULT '',
      source TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_conversation_customer ON AiConversation (customerId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_message_conversation ON AiMessage (conversationId, createdAt ASC);
    CREATE INDEX IF NOT EXISTS idx_ai_knowledge_enabled ON AiKnowledgeChunk (enabled, category);

    CREATE INDEX IF NOT EXISTS idx_companion_serv ON Companion (serviceTypeId, status, deleted);
    CREATE INDEX IF NOT EXISTS idx_companion_status ON Companion (status, deleted);
    CREATE INDEX IF NOT EXISTS idx_order_status ON "Order" (status);
    CREATE INDEX IF NOT EXISTS idx_order_status_created ON "Order" (status, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_order_created ON "Order" (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_order_customer ON "Order" (customerId);
    CREATE INDEX IF NOT EXISTS idx_message_created ON Message (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_fighter_status ON FighterApplication (status);
    CREATE INDEX IF NOT EXISTS idx_fighter_customer ON FighterApplication (customerId);
    CREATE INDEX IF NOT EXISTS idx_fighter_account_username ON FighterAccount (username);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_fighter ON Withdrawal (fighterId, status);
    CREATE INDEX IF NOT EXISTS idx_order_customer_created ON "Order" (customerId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_order_event_order ON OrderEvent (orderId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON AuditLog (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON AuditLog (action, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON RateLimitBucket (resetAt);
  `)

  // 老库补列：Companion.kind / Order.spec（新表由上方 CREATE 自带）
  const compCols = d.prepare('PRAGMA table_info(Companion)').all() as any[]
  if (!compCols.some((c) => c.name === 'kind')) {
    d.exec(`ALTER TABLE Companion ADD COLUMN kind TEXT DEFAULT 'product'`)
  }
  const orderCols = d.prepare('PRAGMA table_info("Order")').all() as any[]
  if (!orderCols.some((c) => c.name === 'spec')) {
    d.exec(`ALTER TABLE "Order" ADD COLUMN spec TEXT DEFAULT ''`)
  }
  const addOrderColumn = (name: string, definition: string) => {
    if (!orderCols.some((c) => c.name === name)) d.exec(`ALTER TABLE "Order" ADD COLUMN ${definition}`)
  }
  addOrderColumn('fighterId', "fighterId TEXT DEFAULT ''")
  addOrderColumn('fighterName', "fighterName TEXT DEFAULT ''")
  addOrderColumn('assignedBy', "assignedBy TEXT DEFAULT ''")
  addOrderColumn('isTrial', 'isTrial INTEGER DEFAULT 0')
  addOrderColumn('platformRate', 'platformRate REAL DEFAULT 0.2')
  addOrderColumn('fighterIncome', 'fighterIncome REAL DEFAULT 0')
  addOrderColumn('paid', 'paid INTEGER DEFAULT 0')
  addOrderColumn('paidAt', "paidAt TEXT DEFAULT ''")
  addOrderColumn('paymentMethod', "paymentMethod TEXT DEFAULT ''")
  addOrderColumn('customerPhone', "customerPhone TEXT DEFAULT ''")
  addOrderColumn('completionNote', "completionNote TEXT DEFAULT ''")
  addOrderColumn('completionProof', "completionProof TEXT DEFAULT '[]'")
  addOrderColumn('completionRequestedAt', "completionRequestedAt TEXT DEFAULT ''")
  addOrderColumn('completedAt', "completedAt TEXT DEFAULT ''")
  addOrderColumn('gameMode', "gameMode TEXT DEFAULT ''")
  addOrderColumn('mapName', "mapName TEXT DEFAULT ''")
  addOrderColumn('inGameId', "inGameId TEXT DEFAULT ''")
  addOrderColumn('idempotencyKey', "idempotencyKey TEXT DEFAULT ''")
  const addOrderIntegerColumn = (name: string) => {
    if (!orderCols.some((c) => c.name === name)) d.exec(`ALTER TABLE "Order" ADD COLUMN ${name} INTEGER DEFAULT NULL`)
  }
  addOrderIntegerColumn('priceCents')
  addOrderIntegerColumn('amountCents')
  addOrderIntegerColumn('fighterIncomeCents')

  const addColumn = (table: string, columns: any[], name: string, definition: string) => {
    if (!columns.some((c) => c.name === name)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
  }
  addColumn('Companion', compCols, 'priceCents', 'priceCents INTEGER DEFAULT NULL')
  addColumn('Withdrawal', d.prepare('PRAGMA table_info(Withdrawal)').all() as any[], 'amountCents', 'amountCents INTEGER DEFAULT NULL')

  // 旧库一次性用“元”换算成“分”。新数据以后一律以 cents 为权威值。
  d.exec(`
    UPDATE Companion SET priceCents = CAST(ROUND(price * 100) AS INTEGER) WHERE priceCents IS NULL OR priceCents = 0;
    UPDATE "Order" SET
      priceCents = CAST(ROUND(price * 100) AS INTEGER),
      amountCents = CAST(ROUND(amount * 100) AS INTEGER),
      fighterIncomeCents = CAST(ROUND(fighterIncome * 100) AS INTEGER)
    WHERE priceCents IS NULL OR amountCents IS NULL OR fighterIncomeCents IS NULL;
    UPDATE Withdrawal SET amountCents = CAST(ROUND(amount * 100) AS INTEGER) WHERE amountCents IS NULL OR amountCents = 0;
  `)

  // 老库一次性迁移：新增“付款”流程前已存在的订单一律视为已付款（旧流程没有待付款环节）
  d.exec(`UPDATE "Order" SET paid = 1 WHERE status != 'unpaid' AND (paid IS NULL OR paid = 0)`);
  const appCols = d.prepare('PRAGMA table_info(FighterApplication)').all() as any[]
  if (!appCols.some((c) => c.name === 'username')) d.exec("ALTER TABLE FighterApplication ADD COLUMN username TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'passwordHash')) d.exec("ALTER TABLE FighterApplication ADD COLUMN passwordHash TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'fighterAccountId')) d.exec("ALTER TABLE FighterApplication ADD COLUMN fighterAccountId TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'openid')) d.exec("ALTER TABLE FighterApplication ADD COLUMN openid TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'nickname')) d.exec("ALTER TABLE FighterApplication ADD COLUMN nickname TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'tier')) d.exec("ALTER TABLE FighterApplication ADD COLUMN tier TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'avatarUrl')) d.exec("ALTER TABLE FighterApplication ADD COLUMN avatarUrl TEXT DEFAULT ''")
  const accCols = d.prepare('PRAGMA table_info(FighterAccount)').all() as any[]
  if (!accCols.some((c) => c.name === 'openid')) d.exec("ALTER TABLE FighterAccount ADD COLUMN openid TEXT DEFAULT ''")
  if (!accCols.some((c) => c.name === 'nickname')) d.exec("ALTER TABLE FighterAccount ADD COLUMN nickname TEXT DEFAULT ''")
  if (!accCols.some((c) => c.name === 'tier')) d.exec("ALTER TABLE FighterAccount ADD COLUMN tier TEXT DEFAULT ''")
  if (!accCols.some((c) => c.name === 'avatarUrl')) d.exec("ALTER TABLE FighterAccount ADD COLUMN avatarUrl TEXT DEFAULT ''")

  d.exec(`
    CREATE INDEX IF NOT EXISTS idx_order_fighter_status ON "Order" (fighterId, status);
    CREATE INDEX IF NOT EXISTS idx_order_pending_created ON "Order" (status, fighterId, createdAt DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_order_idempotency ON "Order" (idempotencyKey) WHERE idempotencyKey <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fighter_account_openid ON FighterAccount (openid) WHERE openid <> '';
  `)
}

export function genId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export function nowLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100)
}

function centsToYuan(cents: unknown): number {
  return Math.round(Number(cents || 0)) / 100
}

function parseTags(s: string): string[] {
  try {
    const a = JSON.parse(s)
    return Array.isArray(a) ? a.map(String) : []
  } catch {
    return []
  }
}

function stRow(r: any): ServiceType {
  return { id: r.id, name: r.name, icon: r.icon, sort: r.sort, enabled: !!r.enabled, reserved: !!r.reserved }
}

function cRow(r: any): Companion {
  return {
    id: r.id,
    serviceTypeId: r.serviceTypeId,
    kind: r.kind === 'fighter' ? 'fighter' : 'product',
    name: r.name,
    avatar: r.avatar,
    gender: r.gender,
    tags: parseTags(r.tags),
    price: centsToYuan(r.priceCents ?? r.price),
    unit: r.unit,
    rank: r.rank,
    description: r.description,
    sales: r.sales,
    rating: r.rating,
    status: r.status,
    sort: r.sort,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function oRow(r: any): Order {
  return {
    id: r.id,
    orderNo: r.orderNo,
    companionId: r.companionId,
    companionName: r.companionName,
    serviceTypeId: r.serviceTypeId,
    serviceName: r.serviceName,
    spec: r.spec || '',
    unitCount: r.unitCount,
    price: centsToYuan(r.priceCents ?? r.price),
    amount: centsToYuan(r.amountCents ?? r.amount),
    gameField: r.gameField,
    gameMode: r.gameMode || '',
    mapName: r.mapName || '',
    inGameId: r.inGameId || '',
    rank: r.rank,
    remark: r.remark,
    status: r.status,
    customerId: r.customerId,
    customerName: r.customerName,
    fighterId: r.fighterId || '',
    fighterName: r.fighterName || '',
    assignedBy: r.assignedBy || '',
    isTrial: !!r.isTrial,
    paid: !!r.paid,
    paidAt: r.paidAt || '',
    paymentMethod: r.paymentMethod || '',
    customerPhone: r.customerPhone || '',
    completionNote: r.completionNote || '',
    completionProof: (() => { try { const a = JSON.parse(r.completionProof || '[]'); return Array.isArray(a) ? a.map(String) : [] } catch { return [] } })(),
    platformRate: Number(r.platformRate || 0),
    fighterIncome: centsToYuan(r.fighterIncomeCents ?? r.fighterIncome),
    idempotencyKey: r.idempotencyKey || '',
    completionRequestedAt: r.completionRequestedAt || '',
    completedAt: r.completedAt || '',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function orderEventRow(r: any): OrderEvent {
  let metadata: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(r.metadata || '{}')
    if (parsed && typeof parsed === 'object') metadata = parsed
  } catch {}
  return {
    id: r.id,
    orderId: r.orderId,
    action: r.action,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    actorType: r.actorType,
    actorId: r.actorId || '',
    actorName: r.actorName || '',
    metadata,
    createdAt: r.createdAt,
  }
}

export function recordOrderEvent(
  d: DatabaseSync,
  orderId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  actorType: string,
  actorId = '',
  actorName = '',
  metadata: Record<string, unknown> = {},
) {
  d.prepare(
    `INSERT INTO OrderEvent (id, orderId, action, fromStatus, toStatus, actorType, actorId, actorName, metadata, createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    genId(),
    orderId,
    action,
    fromStatus,
    toStatus,
    actorType,
    actorId,
    actorName,
    JSON.stringify(metadata),
    nowLocal(),
  )
}

export function listOrderEvents(orderId: string): OrderEvent[] {
  return (getDb().prepare('SELECT * FROM OrderEvent WHERE orderId = ? ORDER BY rowid DESC LIMIT 100').all(orderId) as any[]).map(orderEventRow)
}

export function recordAuditLog(input: {
  action: string
  actorType: string
  actorName?: string
  targetId?: string
  method?: string
  path?: string
  metadata?: Record<string, unknown>
}) {
  const now = nowLocal()
  getDb()
    .prepare(
      `INSERT INTO AuditLog (id, action, actorType, actorName, targetId, method, path, metadata, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      genId(),
      input.action,
      input.actorType,
      input.actorName || '',
      input.targetId || '',
      input.method || '',
      input.path || '',
      JSON.stringify(input.metadata || {}),
      now,
    )
}

function mRow(r: any): Message {
  return { id: r.id, type: r.type, title: r.title, content: r.content, isRead: !!r.isRead, createdAt: r.createdAt }
}

export function listServiceTypes(includeDisabled = false): ServiceType[] {
  return cacheWrap(`service-types:${includeDisabled ? 'all' : 'enabled'}`, 30_000, () => {
    const rows = getDb()
      .prepare('SELECT * FROM ServiceType ORDER BY sort ASC, name ASC')
      .all() as any[]
    return rows.filter((r) => includeDisabled || r.enabled).map(stRow)
  })
}

export function createServiceType(input: { name: string; icon?: string; sort?: number; reserved?: boolean }): ServiceType {
  const d = getDb()
  const id = genId()
  d.prepare('INSERT INTO ServiceType (id, name, icon, sort, enabled, reserved) VALUES (?,?,?,?,1,?)').run(
    id,
    input.name,
    input.icon || 'gamepad-2',
    input.sort ?? 0,
    input.reserved ? 1 : 0,
  )
  invalidateCache('service-types')
  return listServiceTypes(true).find((s) => s.id === id)!
}

export function updateServiceType(id: string, input: { name?: string; icon?: string; sort?: number; enabled?: boolean }): ServiceType | null {
  const d = getDb()
  const cur = d.prepare('SELECT * FROM ServiceType WHERE id = ?').get(id) as any
  if (!cur) return null
  d.prepare('UPDATE ServiceType SET name = ?, icon = ?, sort = ?, enabled = ? WHERE id = ?').run(
    input.name ?? cur.name,
    input.icon ?? cur.icon,
    input.sort ?? cur.sort,
    input.enabled === undefined ? cur.enabled : input.enabled ? 1 : 0,
    id,
  )
  invalidateCache('service-types')
  return listServiceTypes(true).find((s) => s.id === id)!
}

export function listCompanions(
  opts: {
    serviceTypeId?: string
    keyword?: string
    sort?: string
    all?: boolean
    kind?: 'product' | 'fighter' | 'all'
  } = {},
): Companion[] {
  const conds: string[] = ['deleted = 0']
  const args: any[] = []
  if (!opts.all) conds.push('status = 1')
  // 用户端默认只展示商品档位，管理端传 kind='all' 时包含入驻打手
  const kind = opts.kind || 'product'
  if (kind !== 'all') {
    conds.push('kind = ?')
    args.push(kind)
  }
  if (opts.serviceTypeId) {
    conds.push('serviceTypeId = ?')
    args.push(opts.serviceTypeId)
  }
  if (opts.keyword) {
    conds.push('(name LIKE ? OR tags LIKE ? OR gender LIKE ? OR description LIKE ?)')
    const k = `%${opts.keyword}%`
    args.push(k, k, k, k)
  }
  const order =
    opts.sort === 'sales' ? 'sales DESC, sort ASC' : opts.sort === 'price' ? 'price ASC, sort ASC' : 'sort ASC, createdAt DESC'
  const cacheKey = `companions:${opts.all ? 'all' : 'public'}:${kind}:${opts.serviceTypeId || ''}:${opts.keyword || ''}:${opts.sort || ''}`
  return cacheWrap(cacheKey, 30_000, () => {
    const rows = getDb()
      .prepare(`SELECT * FROM Companion WHERE ${conds.join(' AND ')} ORDER BY ${order} LIMIT 200`)
      .all(...args) as any[]
    return rows.map(cRow)
  })
}

export function getCompanion(id: string): Companion | null {
  const r = getDb().prepare('SELECT * FROM Companion WHERE id = ? AND deleted = 0').get(id) as any
  return r ? cRow(r) : null
}

export function createCompanion(input: {
  serviceTypeId: string
  kind?: 'product' | 'fighter'
  name: string
  gender?: string
  tags?: string[]
  price: number
  unit?: string
  rank?: string
  description?: string
  sort?: number
}): Companion {
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  const priceCents = yuanToCents(input.price)
  d.prepare(
    `INSERT INTO Companion (id, serviceTypeId, kind, name, avatar, gender, tags, price, priceCents, unit, "rank", description, sales, rating, status, sort, deleted, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0,1,?,0,?,?)`,
  ).run(
    id,
    input.serviceTypeId,
    input.kind || 'product',
    input.name,
    '',
    input.gender || '',
    JSON.stringify(input.tags || []),
    input.price,
    priceCents,
    input.unit || '小时',
    input.rank || '',
    input.description || '',
    input.sort ?? 0,
    now,
    now,
  )
  invalidateCache('companions')
  return getCompanion(id)!
}

export function updateCompanion(
  id: string,
  input: Partial<{
    serviceTypeId: string
    name: string
    gender: string
    tags: string[]
    price: number
    unit: string
    rank: string
    description: string
    sort: number
    status: number
  }>,
): Companion | null {
  const d = getDb()
  const cur = d.prepare('SELECT * FROM Companion WHERE id = ? AND deleted = 0').get(id) as any
  if (!cur) return null
  const now = nowLocal()
  const priceCents = input.price === undefined ? (cur.priceCents ?? yuanToCents(cur.price)) : yuanToCents(input.price)
  d.prepare(
    `UPDATE Companion SET serviceTypeId = ?, name = ?, gender = ?, tags = ?, price = ?, priceCents = ?, unit = ?, "rank" = ?, description = ?, sort = ?, status = ?, updatedAt = ? WHERE id = ?`,
  ).run(
    input.serviceTypeId ?? cur.serviceTypeId,
    input.name ?? cur.name,
    input.gender ?? cur.gender,
    JSON.stringify(input.tags ?? parseTags(cur.tags)),
    priceCents / 100,
    priceCents,
    input.unit ?? cur.unit,
    input.rank ?? cur.rank,
    input.description ?? cur.description,
    input.sort ?? cur.sort,
    input.status ?? cur.status,
    now,
    id,
  )
  invalidateCache('companions')
  return getCompanion(id)
}

export function deleteCompanion(id: string): boolean {
  const r = getDb().prepare('UPDATE Companion SET deleted = 1, updatedAt = ? WHERE id = ?').run(nowLocal(), id)
  if (r.changes > 0) invalidateCache('companions')
  return r.changes > 0
}

function genOrderNo(d: DatabaseSync): string {
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`
  const existingSequence = d.prepare('SELECT lastNumber FROM OrderSequence WHERE dateKey = ?').get(dateKey) as any
  let firstNumber = 1
  if (!existingSequence) {
    const maxRow = d
      .prepare(`SELECT MAX(CAST(substr(orderNo, length(?) + 2) AS INTEGER)) AS n FROM "Order" WHERE orderNo LIKE ?`)
      .get(dateKey, `${dateKey}-%`) as any
    firstNumber = Math.max(Number(maxRow?.n || 0), 0) + 1
  }
  const seqRow = d
    .prepare(
      `INSERT INTO OrderSequence (dateKey, lastNumber) VALUES (?, ?)
       ON CONFLICT(dateKey) DO UPDATE SET lastNumber = lastNumber + 1
       RETURNING lastNumber`,
    )
    .get(dateKey, firstNumber) as any
  return `${dateKey}-${String(seqRow.lastNumber).padStart(4, '0')}`
}

const ADDON_UNIT_PRICE_CENTS = 2_000

function serverUnitPriceCents(c: Companion, spec: string): number {
  const specs = spec.split(' · ').filter(Boolean)
  const isDouble = specs.includes('双陪')
  const addons = ['教学单', '甜蜜单'].filter((item) => specs.includes(item)).length
  const basePriceCents = Math.round(c.price * 100)
  return Math.round(basePriceCents * (isDouble ? 2 : 1)) + addons * ADDON_UNIT_PRICE_CENTS
}

export function countUsedTrialThisWeek(customerId: string): number {
  if (!customerId) return 0
  const d = getDb()
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  const p = (n: number) => String(n).padStart(2, '0')
  const start = `${monday.getFullYear()}-${p(monday.getMonth() + 1)}-${p(monday.getDate())} 00:00:00`
  const row = d
    .prepare(
      `SELECT COUNT(*) AS n FROM "Order"
       WHERE customerId = ? AND isTrial = 1 AND paid = 1 AND status != 'cancelled' AND createdAt >= ?`,
    )
    .get(customerId, start) as any
  return Number(row?.n || 0)
}

export function createOrder(input: {
  companionId: string
  unitCount: number
  spec?: string
  price?: number
  gameField?: string
  gameMode?: string
  mapName?: string
  inGameId?: string
  rank?: string
  remark?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  fighterId?: string
  isTrial?: boolean
  idempotencyKey?: string
}): Order {
  const d = getDb()
  const key = (input.idempotencyKey || '').trim()
  const scopedKey = key ? `${input.customerId || ''}:${key}` : ''
  if (key) {
    const existing = d.prepare('SELECT * FROM "Order" WHERE idempotencyKey = ?').get(scopedKey) as any
    if (existing) return oRow(existing)
  }
  if (!Number.isInteger(input.unitCount) || input.unitCount <= 0 || input.unitCount > 24) {
    throw new Error('数量必须在 1 到 24 之间')
  }
  const c = getCompanion(input.companionId)
  if (!c || c.status !== 1) throw new Error('该陪玩已下架，请重新选择')
  const st = listServiceTypes(true).find((s) => s.id === c.serviceTypeId)
  const id = genId()
  const now = nowLocal()
  const unitCount = input.unitCount
  const unitPriceCents = serverUnitPriceCents(c, input.spec || '')
  const amountCents = unitPriceCents * unitCount
  const isTrial = !!input.isTrial
  if (isTrial && input.customerId && countUsedTrialThisWeek(input.customerId) >= 1) {
    throw new Error('体验单每微信号每周限 1 次，本周已使用，请选择普通订单')
  }
  const platformRate = isTrial ? 0.1 : 0.2
  const platformRateBps = isTrial ? 1_000 : 2_000
  const fighterIncomeCents = Math.round((amountCents * (10_000 - platformRateBps)) / 10_000)
  const fighter = input.fighterId ? getFighterAccount(input.fighterId) : null
  if (input.fighterId && (!fighter || !fighter.enabled)) throw new Error('指定打手不可用，请重新选择')
  // 下单先进入“待付款”，付款成功后才会进入公共池/指派给指定打手
  const status: OrderStatus = 'unpaid'
  d.exec('BEGIN IMMEDIATE')
  try {
    const orderNo = genOrderNo(d)
  d.prepare(
      `INSERT INTO "Order" (id, orderNo, companionId, companionName, serviceTypeId, serviceName, spec, unitCount, price, priceCents, amount, amountCents, gameField, gameMode, mapName, inGameId, "rank", remark, status, customerId, customerName, customerPhone, fighterId, fighterName, assignedBy, isTrial, platformRate, fighterIncome, fighterIncomeCents, idempotencyKey, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    orderNo,
    c.id,
    c.name,
    c.serviceTypeId,
    st?.name || '陪玩',
    input.spec || '',
    unitCount,
    unitPriceCents / 100,
    unitPriceCents,
    amountCents / 100,
    amountCents,
    input.gameField || '',
    input.gameMode || '',
    input.mapName || '',
    input.inGameId || '',
    input.rank || '',
    input.remark || '',
    status,
    input.customerId || '',
    input.customerName || '',
    input.customerPhone || '',
    fighter?.id || '',
    fighter?.displayName || '',
    fighter ? 'customer' : '',
    isTrial ? 1 : 0,
    platformRate,
    fighterIncomeCents / 100,
    fighterIncomeCents,
    scopedKey,
    now,
    now,
  )
    recordOrderEvent(d, id, 'create', '', status, 'customer', input.customerId || '', input.customerName || '', {
      unitPriceCents,
      amountCents,
      fighterId: fighter?.id || '',
    })
    d.exec('COMMIT')
  } catch (error) {
    d.exec('ROLLBACK')
    if (scopedKey) {
      const existing = d.prepare('SELECT * FROM "Order" WHERE idempotencyKey = ?').get(scopedKey) as any
      if (existing) return oRow(existing)
    }
    throw error
  }
  return getOrder(id)!
}

// 付款：把“待付款”订单变成“待接单”（进入公共池或指派给下单时指定的打手）。
// 支持顾客端模拟支付和管理员“线下已收款”两种来源，重复调用幂等。
export function payOrder(
  orderId: string,
  actor: { type: 'customer' | 'admin'; id?: string; name?: string },
  method: string,
): Order | null {
  const d = getDb()
  const cur = d.prepare('SELECT id, status, paid, fighterId, fighterName, assignedBy FROM "Order" WHERE id = ?').get(orderId) as any
  if (!cur) throw new Error('订单不存在')
  if (cur.paid && cur.status !== 'unpaid') return getOrder(orderId) // 已付款，幂等返回
  if (cur.status !== 'unpaid') throw new Error('当前订单状态不允许付款')
  const now = nowLocal()
  const toStatus = cur.fighterId ? 'assigned' : 'pending'
  const result = d.prepare(
    "UPDATE \"Order\" SET paid = 1, paidAt = ?, paymentMethod = ?, status = ?, updatedAt = ? WHERE id = ? AND status = 'unpaid'",
  ).run(now, method, toStatus, now, orderId)
  if (!result.changes) throw new Error('订单状态已变化，请刷新后重试')
  const order = getOrder(orderId)
  if (order) {
    recordOrderEvent(d, orderId, 'pay', 'unpaid', toStatus, actor.type, actor.id || '', actor.name || '', {
      method,
      amount: order.amount,
      fighterId: cur.fighterId || '',
    })
    if (cur.fighterId && cur.assignedBy === 'customer') {
      recordOrderEvent(d, orderId, 'assign', 'unpaid', toStatus, 'customer', actor.id || '', actor.name || '', { fighterId: cur.fighterId })
    }
  }
  return getOrder(orderId)
}

export function listOrders(
  opts: { status?: string; customerId?: string; fighterId?: string; all?: boolean; page?: number; pageSize?: number } = {},
): Order[] {
  maybeCancelExpiredOrders()
  const conds: string[] = ['1=1']
  const args: any[] = []
  if (opts.status) {
    conds.push('status = ?')
    args.push(opts.status)
  }
  if (!opts.all && opts.customerId) {
    conds.push('customerId = ?')
    args.push(opts.customerId)
  }
  if (!opts.all && opts.fighterId) {
    conds.push('fighterId = ?')
    args.push(opts.fighterId)
  }
  const rows = getDb()
    .prepare(`SELECT * FROM "Order" WHERE ${conds.join(' AND ')} ORDER BY createdAt DESC LIMIT ? OFFSET ?`)
    .all(...args, Math.min(Math.max(1, Number(opts.pageSize) || 20), 100), (Math.max(1, Number(opts.page) || 1) - 1) * Math.min(Math.max(1, Number(opts.pageSize) || 20), 100)) as any[]
  return rows.map(oRow)
}

export function getOrder(id: string): Order | null {
  const r = getDb().prepare('SELECT * FROM "Order" WHERE id = ?').get(id) as any
  return r ? oRow(r) : null
}

const VALID_STATUS: OrderStatus[] = ['unpaid', 'pending', 'assigned', 'in_progress', 'completion_pending', 'completed', 'cancelled']

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
  actor: { type: 'customer' | 'admin' | 'system'; id?: string; name?: string } = { type: 'customer' },
): Order | null {
  if (!VALID_STATUS.includes(status)) throw new Error('无效的订单状态')
  const d = getDb()
  const cur = d.prepare('SELECT * FROM "Order" WHERE id = ?').get(id) as any
  if (!cur) return null
  // 通用状态接口只允许“取消订单”，防止绕过业务状态机直接把订单改成已完成等状态
  if (status !== 'cancelled') throw new Error('当前订单状态不允许该操作')
  if (!['unpaid', 'pending', 'assigned', 'in_progress'].includes(cur.status)) throw new Error('当前订单状态不允许取消')
  const now = nowLocal()
  d.exec('BEGIN IMMEDIATE')
  try {
    d.prepare('UPDATE "Order" SET status = ?, updatedAt = ? WHERE id = ?').run(status, now, id)
    recordOrderEvent(d, id, 'cancel', cur.status, status, actor.type, actor.id || '', actor.name || '')
    d.exec('COMMIT')
  } catch (error) {
    d.exec('ROLLBACK')
    throw error
  }
  return getOrder(id)
}

export function listMessages(): Message[] {
  const rows = getDb().prepare('SELECT * FROM Message ORDER BY createdAt DESC LIMIT 100').all() as any[]
  return rows.map(mRow)
}

export function createMessage(input: { type: 'official' | 'customer_service'; title: string; content: string }): Message {
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  d.prepare('INSERT INTO Message (id, type, title, content, isRead, createdAt) VALUES (?,?,?,?,0,?)').run(
    id,
    input.type,
    input.title,
    input.content,
    now,
  )
  return listMessages().find((m) => m.id === id)!
}

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM AppSetting').all() as any[]
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key] = r.value
  return out
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare('INSERT INTO AppSetting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}

function faRow(r: any): FighterApplication {
  return {
    id: r.id,
    customerId: r.customerId || '',
    openid: r.openid || '',
    nickname: r.nickname || '',
    avatarUrl: r.avatarUrl || '',
    gameName: r.gameName,
    contact: r.contact,
    rank: r.rank || '',
    modes: parseTags(r.modes),
    intro: r.intro || '',
    username: r.username || '',
    tier: r.tier || '',
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function createFighterApplication(input: {
  customerId: string
  openid?: string
  nickname?: string
  avatarUrl?: string
  gameName: string
  contact: string
  rank?: string
  modes?: string[]
  intro?: string
  tier?: string
  username: string
  passwordHash: string
}): FighterApplication {
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  d.prepare(
    `INSERT INTO FighterApplication (id, customerId, openid, nickname, avatarUrl, gameName, contact, "rank", modes, intro, tier, username, passwordHash, status, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
  ).run(
    id,
    input.customerId || '',
    input.openid || '',
    input.nickname || '',
    input.avatarUrl || '',
    input.gameName,
    input.contact,
    input.rank || '',
    JSON.stringify(input.modes || []),
    input.intro || '',
    input.tier || '',
    input.username,
    input.passwordHash,
    now,
    now,
  )
  return getFighterApplication(id)!
}

export function listFighterApplications(
  opts: { status?: string; customerId?: string } = {},
): FighterApplication[] {
  const conds: string[] = ['1=1']
  const args: any[] = []
  if (opts.status) {
    conds.push('status = ?')
    args.push(opts.status)
  }
  if (opts.customerId) {
    conds.push('customerId = ?')
    args.push(opts.customerId)
  }
  const rows = getDb()
    .prepare(`SELECT * FROM FighterApplication WHERE ${conds.join(' AND ')} ORDER BY createdAt DESC LIMIT 200`)
    .all(...args) as any[]
  return rows.map(faRow)
}

export function getFighterApplication(id: string): FighterApplication | null {
  const r = getDb().prepare('SELECT * FROM FighterApplication WHERE id = ?').get(id) as any
  return r ? faRow(r) : null
}

const VALID_FIGHTER_STATUS: FighterApplicationStatus[] = ['pending', 'approved', 'rejected']

export function reviewFighterApplication(
  id: string,
  status: FighterApplicationStatus,
): FighterApplication | null {
  if (!VALID_FIGHTER_STATUS.includes(status)) throw new Error('无效的审核状态')
  const d = getDb()
  const cur = d.prepare('SELECT * FROM FighterApplication WHERE id = ?').get(id) as any
  if (!cur) return null
  d.prepare('UPDATE FighterApplication SET status = ?, updatedAt = ? WHERE id = ?').run(status, nowLocal(), id)

  // 通过审核：自动登记为打手商品（同昵称已登记过则跳过，避免重复）
  if (status === 'approved') {
    const playType = listServiceTypes(true).find((s) => s.name === '陪玩')
    const exists = d
      .prepare(`SELECT id FROM Companion WHERE kind = 'fighter' AND name = ? AND deleted = 0 LIMIT 1`)
      .get(cur.gameName) as any
    let companionId = exists?.id || ''
    if (playType && !exists) {
      companionId = createCompanion({
        serviceTypeId: playType.id,
        kind: 'fighter',
        name: cur.gameName,
        tags: parseTags(cur.modes),
        price: 40,
        unit: '小时',
        rank: cur.rank || '',
        description: cur.intro || `入驻打手：${cur.gameName}`,
        sort: 100,
      }).id
    }
    const currentAccount = d.prepare('SELECT id FROM FighterAccount WHERE applicationId = ?').get(id) as any
    if (!currentAccount && cur.username && cur.passwordHash) {
      const accountId = genId()
      const now = nowLocal()
      d.prepare(`INSERT INTO FighterAccount (id, applicationId, companionId, username, passwordHash, openid, nickname, avatarUrl, displayName, tier, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(accountId, id, companionId, cur.username, cur.passwordHash, cur.openid || '', cur.nickname || '', cur.avatarUrl || '', cur.gameName, cur.tier || '', now, now)
      d.prepare('UPDATE FighterApplication SET fighterAccountId = ? WHERE id = ?').run(accountId, id)
    }
  }
  return getFighterApplication(id)
}

function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function fighterRow(r: any): FighterAccount {
  return { id: r.id, applicationId: r.applicationId || '', companionId: r.companionId || '', username: r.username, openid: r.openid || '', nickname: r.nickname || '', avatarUrl: r.avatarUrl || '', displayName: r.displayName, tier: r.tier || '', online: !!r.online, enabled: !!r.enabled, createdAt: r.createdAt }
}

function withdrawalRow(r: any): Withdrawal {
  return { id: r.id, fighterId: r.fighterId, fighterName: r.fighterName || '', amount: centsToYuan(r.amountCents ?? r.amount), accountInfo: r.accountInfo, status: r.status, createdAt: r.createdAt, reviewedAt: r.reviewedAt || '' }
}

export function getFighterAccount(id: string): FighterAccount | null {
  const row = getDb().prepare('SELECT * FROM FighterAccount WHERE id = ?').get(id) as any
  return row ? fighterRow(row) : null
}

export function getFighterByUsername(username: string): (FighterAccount & { passwordHash: string }) | null {
  const row = getDb().prepare('SELECT * FROM FighterAccount WHERE username = ?').get(username) as any
  return row ? { ...fighterRow(row), passwordHash: row.passwordHash } : null
}

export function getFighterByOpenid(openid: string): FighterAccount | null {
  if (!openid) return null
  const row = getDb().prepare('SELECT * FROM FighterAccount WHERE openid = ? LIMIT 1').get(openid) as any
  return row ? fighterRow(row) : null
}

export function listAvailableFighters(): FighterAccount[] {
  return (getDb().prepare('SELECT * FROM FighterAccount WHERE enabled = 1 ORDER BY online DESC, displayName ASC').all() as any[]).map(fighterRow)
}

export function setFighterOnline(id: string, online: boolean): FighterAccount | null {
  getDb().prepare('UPDATE FighterAccount SET online = ?, updatedAt = ? WHERE id = ?').run(online ? 1 : 0, nowLocal(), id)
  return getFighterAccount(id)
}

export function updateFighterProfile(id: string, input: { displayName?: string; online?: boolean } = {}): FighterAccount | null {
  const fighter = getFighterAccount(id)
  if (!fighter) throw new Error('打手不存在')
  const displayName = input.displayName === undefined ? fighter.displayName : input.displayName.trim()
  if (displayName.length < 2 || displayName.length > 20) throw new Error('显示名必须是 2 到 20 个字符')
  const online = input.online === undefined ? fighter.online : input.online
  getDb().prepare('UPDATE FighterAccount SET displayName = ?, online = ?, updatedAt = ? WHERE id = ?').run(displayName, online ? 1 : 0, nowLocal(), id)
  return getFighterAccount(id)
}

export function listFighterOrders(fighterId: string, status?: string): Order[] {
  return listOrders({ status, fighterId })
}

// ---- 滑块验证 + 抢单令牌：防“一键抢单脚本”。
// 服务端给每个订单生成一个随机目标位置，打手把滑块拖到提示的百分比附近后，
// 服务端校验通过才发放一次性抢单令牌（claimToken），抢单必须携带该令牌。 ----
const sliderChallenges = new Map<string, { orderId: string; expiresAt: number }>()
const claimTokens = new Map<string, { orderId: string; fighterId: string; expiresAt: number }>()
const CHALLENGE_TTL_MS = 60_000

export function issueSliderChallenge(orderId: string): { sliderId: string } {
  const now = Date.now()
  if (sliderChallenges.size > 500) {
    for (const [k, v] of sliderChallenges) { if (v.expiresAt <= now) sliderChallenges.delete(k) }
  }
  const sliderId = randomBytes(8).toString('hex')
  sliderChallenges.set(sliderId, { orderId, expiresAt: now + CHALLENGE_TTL_MS })
  return { sliderId }
}

export function verifySliderChallenge(sliderId: string, orderId: string, position: number): boolean {
  const c = sliderChallenges.get(sliderId)
  if (!c || c.orderId !== orderId || c.expiresAt <= Date.now()) return false
  if (!Number.isFinite(position)) return false
  // 市面上常见模式：把滑块拖到最右侧即通过（≥95%）
  return position >= 95
}

export function issueClaimToken(orderId: string, fighterId: string): string {
  const token = randomBytes(16).toString('hex')
  claimTokens.set(token, { orderId, fighterId, expiresAt: Date.now() + CHALLENGE_TTL_MS })
  return token
}

export function consumeClaimToken(token: string, orderId: string, fighterId: string): boolean {
  if (!token) return false
  const t = claimTokens.get(token)
  if (!t || t.orderId !== orderId || t.fighterId !== fighterId || t.expiresAt <= Date.now()) return false
  claimTokens.delete(token)
  return true
}

// ---- 打手抢单冷却：两次抢单之间至少间隔 N 秒，防止连点脚本连续抢单 ----
const fighterLastClaimAt = new Map<string, number>()
const CLAIM_COOLDOWN_MS = Number(process.env.CLAIM_COOLDOWN_MS || 3000)
export function assertClaimCooldown(fighterId: string): void {
  const last = fighterLastClaimAt.get(fighterId) || 0
  const wait = CLAIM_COOLDOWN_MS - (Date.now() - last)
  if (wait > 0) throw new Error(`抢单太快了，请 ${Math.ceil(wait / 1000)} 秒后再试`)
  fighterLastClaimAt.set(fighterId, Date.now())
}

export function listOpenOrders(keyword?: string): Order[] {
  maybeCancelExpiredOrders()
  const args: any[] = []
  let where = `status = 'pending' AND paid = 1 AND (fighterId = '' OR fighterId IS NULL)`
  if (keyword) { where += ' AND (orderNo LIKE ? OR serviceName LIKE ? OR companionName LIKE ?)'; const k = `%${keyword}%`; args.push(k, k, k) }
  return (getDb().prepare(`SELECT * FROM "Order" WHERE ${where} ORDER BY createdAt DESC LIMIT 100`).all(...args) as any[]).map(oRow)
}

export function claimOrder(orderId: string, fighterId: string, claimToken = ''): Order | null {
  const fighter = getFighterAccount(fighterId)
  if (!fighter?.enabled) throw new Error('打手账号不可用')
  // 娱乐档次打手只能被顾客指定或管理员派单，不能抢公共池订单
  if (fighter.tier === '娱乐') throw new Error('娱乐档次打手不能抢公共池订单，请联系管理员派单')
  assertClaimCooldown(fighterId)
  if (!consumeClaimToken(claimToken, orderId, fighterId)) throw new Error('请先完成滑块验证，再确认抢单')
  const d = getDb()
  const current = d.prepare('SELECT id, status, paid, fighterId FROM "Order" WHERE id = ?').get(orderId) as any
  if (!current) throw new Error('订单不存在，请刷新抢单大厅')
  if (current.status === 'cancelled') throw new Error('订单已超时自动取消，请刷新抢单大厅')
  if (!current.paid) throw new Error('订单尚未付款，不能抢单')
  if (current.status !== 'pending' || current.fighterId) throw new Error('订单已被其他打手抢走，请刷新抢单大厅')
  const now = nowLocal()
  const result = d.prepare(`UPDATE "Order" SET fighterId = ?, fighterName = ?, assignedBy = 'fighter', status = 'assigned', updatedAt = ? WHERE id = ? AND status = 'pending' AND paid = 1 AND (fighterId = '' OR fighterId IS NULL)`).run(fighter.id, fighter.displayName, now, orderId)
  if (!result.changes) throw new Error('手速慢了，订单刚被其他打手抢走，请刷新抢单大厅')
  const order = getOrder(orderId)
  if (order) recordOrderEvent(getDb(), orderId, 'claim', 'pending', 'assigned', 'fighter', fighter.id, fighter.displayName)
  return getOrder(orderId)
}

export function assignOrder(orderId: string, fighterId: string | ''): Order | null {
  const d = getDb()
  const fighter = fighterId ? getFighterAccount(fighterId) : null
  if (fighterId && !fighter?.enabled) throw new Error('打手账号不可用')
  const current = d.prepare('SELECT status, paid, fighterId, assignedBy FROM "Order" WHERE id = ?').get(orderId) as any
  if (!current) throw new Error('订单不存在')
  // 业务规则：
  // 1) 未付款订单不能派单；
  // 2) 只有“待接单”或“管理员自己刚派出去的”订单可以派单/改派/放回公共池；
  // 3) 一旦被打手抢走（assignedBy='fighter'）或被顾客指定（assignedBy='customer'），管理员不能强行改派。
  if (!current.paid) throw new Error('该订单尚未付款，不能派单')
  const canManage = current.status === 'pending' || (current.status === 'assigned' && current.assignedBy === 'admin')
  if (!canManage) throw new Error('该订单已被抢/已指定/已开始服务，不能强行指派')
  const fromStatus = current.status
  const result = d.prepare(`UPDATE "Order" SET fighterId = ?, fighterName = ?, assignedBy = ?, status = ?, updatedAt = ? WHERE id = ? AND paid = 1 AND ((status = 'pending') OR (status = 'assigned' AND assignedBy = 'admin'))`).run(fighter?.id || '', fighter?.displayName || '', fighter ? 'admin' : '', fighter ? 'assigned' : 'pending', nowLocal(), orderId)
  const order = result.changes ? getOrder(orderId) : null
  if (order) recordOrderEvent(d, orderId, fighterId ? 'assign' : 'unassign', fromStatus, order.status, 'admin')
  return order
}

export function fighterStartOrder(orderId: string, fighterId: string): Order | null {
  const result = getDb().prepare(`UPDATE "Order" SET status = 'in_progress', updatedAt = ? WHERE id = ? AND fighterId = ? AND status = 'assigned'`).run(nowLocal(), orderId, fighterId)
  if (!result.changes) throw new Error('订单不属于当前打手或状态不允许开始')
  recordOrderEvent(getDb(), orderId, 'start', 'assigned', 'in_progress', 'fighter', fighterId)
  return getOrder(orderId)
}

export function requestOrderCompletion(orderId: string, fighterId: string, input: { note?: string; proof?: string[] } = {}): Order | null {
  const proof = (input.proof || []).map(String).filter(Boolean)
  if (!proof.length) throw new Error('申请结单必须至少上传 1 张截图证明')
  const now = nowLocal()
  const result = getDb().prepare(`UPDATE "Order" SET status = 'completion_pending', completionRequestedAt = ?, completionNote = ?, completionProof = ?, updatedAt = ? WHERE id = ? AND fighterId = ? AND status = 'in_progress'`).run(now, (input.note || '').slice(0, 500), JSON.stringify(proof), now, orderId, fighterId)
  if (!result.changes) throw new Error('订单不属于当前打手或状态不允许提交完工')
  recordOrderEvent(getDb(), orderId, 'request_complete', 'in_progress', 'completion_pending', 'fighter', fighterId, '', { proofCount: proof.length })
  return getOrder(orderId)
}

export function confirmOrderCompletion(orderId: string): Order | null {
  const now = nowLocal()
  const result = getDb().prepare(`UPDATE "Order" SET status = 'completed', completedAt = ?, updatedAt = ? WHERE id = ? AND status = 'completion_pending'`).run(now, now, orderId)
  if (!result.changes) throw new Error('订单不在待确认状态')
  recordOrderEvent(getDb(), orderId, 'complete', 'completion_pending', 'completed', 'admin')
  return getOrder(orderId)
}

export function cancelExpiredOrders(minutes = 30): number {
  if (minutes <= 0) return 0
  const threshold = new Date(Date.now() - minutes * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  const cutoff = `${threshold.getFullYear()}-${p(threshold.getMonth() + 1)}-${p(threshold.getDate())} ${p(threshold.getHours())}:${p(threshold.getMinutes())}:${p(threshold.getSeconds())}`
  const d = getDb()
  // 待接单（公共池）超时取消 + 待付款超时取消
  const expired = d
    .prepare(`SELECT id, customerId, customerName, status FROM "Order" WHERE ((status = 'pending' AND fighterId = '' ) OR status = 'unpaid') AND createdAt < ? LIMIT 500`)
    .all(cutoff) as any[]
  if (!expired.length) return 0
  d.exec('BEGIN IMMEDIATE')
  try {
    for (const order of expired) {
      const fromStatus = order.status
      const cond = fromStatus === 'unpaid' ? "AND status = 'unpaid'" : "AND status = 'pending' AND fighterId = ''"
      d.prepare(`UPDATE "Order" SET status = 'cancelled', updatedAt = ? WHERE id = ? ${cond}`).run(nowLocal(), order.id)
      recordOrderEvent(d, order.id, 'auto_cancel', fromStatus, 'cancelled', 'system', '', '', { minutes })
    }
    d.exec('COMMIT')
  } catch (error) {
    d.exec('ROLLBACK')
    throw error
  }
  return expired.length
}

export function getFighterEarnings(fighterId: string): FighterEarnings {
  const d = getDb()
  const settledCents = Math.round(Number((d.prepare(`SELECT COALESCE(SUM(fighterIncomeCents),0) AS n FROM "Order" WHERE fighterId = ? AND status = 'completed'`).get(fighterId) as any).n))
  // 提交结单申请后（待确认）即为“待结算”，管理员确认后才进入已结算
  const pendingSettlementCents = Math.round(Number((d.prepare(`SELECT COALESCE(SUM(fighterIncomeCents),0) AS n FROM "Order" WHERE fighterId = ? AND status = 'completion_pending'`).get(fighterId) as any).n))
  const withdrawnCents = Math.round(Number((d.prepare(`SELECT COALESCE(SUM(amountCents),0) AS n FROM Withdrawal WHERE fighterId = ? AND status = 'approved'`).get(fighterId) as any).n))
  const pendingWithdrawalCents = Math.round(Number((d.prepare(`SELECT COALESCE(SUM(amountCents),0) AS n FROM Withdrawal WHERE fighterId = ? AND status = 'pending'`).get(fighterId) as any).n))
  return {
    available: (settledCents - withdrawnCents - pendingWithdrawalCents) / 100,
    settled: settledCents / 100,
    pendingSettlement: pendingSettlementCents / 100,
    withdrawn: withdrawnCents / 100,
    pendingWithdrawal: pendingWithdrawalCents / 100,
    recentOrders: listFighterOrders(fighterId).slice(0, 10),
  }
}

export function listWithdrawals(fighterId?: string): Withdrawal[] {
  const rows = fighterId ? getDb().prepare('SELECT * FROM Withdrawal WHERE fighterId = ? ORDER BY createdAt DESC').all(fighterId) : getDb().prepare('SELECT * FROM Withdrawal ORDER BY createdAt DESC').all()
  return (rows as any[]).map(withdrawalRow)
}

export function createWithdrawal(fighterId: string, amount: number, accountInfo: string): Withdrawal {
  const fighter = getFighterAccount(fighterId)
  if (!fighter) throw new Error('打手不存在')
  const amountCents = yuanToCents(amount)
  if (!Number.isFinite(amount) || amountCents <= 0 || amountCents !== Math.round(amount * 100) || amountCents > Math.round(getFighterEarnings(fighterId).available * 100)) throw new Error('提现金额必须为不超过可提现余额的两位小数')
  const id = genId(); const now = nowLocal()
  getDb().prepare('INSERT INTO Withdrawal (id, fighterId, fighterName, amount, amountCents, accountInfo, status, createdAt) VALUES (?,?,?,?,?,?,\'pending\',?)').run(id, fighterId, fighter.displayName, amountCents / 100, amountCents, accountInfo, now)
  return listWithdrawals(fighterId).find((w) => w.id === id)!
}

export function reviewWithdrawal(id: string, status: WithdrawalStatus): Withdrawal | null {
  if (status !== 'approved' && status !== 'rejected') throw new Error('提现状态无效')
  const result = getDb().prepare('UPDATE Withdrawal SET status = ?, reviewedAt = ? WHERE id = ? AND status = \'pending\'').run(status, nowLocal(), id)
  if (!result.changes) throw new Error('提现申请不存在或已处理')
  return listWithdrawals().find((w) => w.id === id) || null
}

export function getStats(): Stats {
  const d = getDb()
  const today = localDateStr(new Date())
  const todayOrders = (d.prepare('SELECT COUNT(*) AS n FROM "Order" WHERE substr(createdAt, 1, 10) = ?').get(today) as any).n
  const todayRevenue = centsToYuan((d
    .prepare('SELECT COALESCE(SUM(amountCents), 0) AS s FROM "Order" WHERE substr(createdAt, 1, 10) = ? AND status = ?')
    .get(today, 'completed') as any).s)
  const inProgress = (d.prepare('SELECT COUNT(*) AS n FROM "Order" WHERE status = ?').get('in_progress') as any).n
  const activeCompanions = (d.prepare('SELECT COUNT(*) AS n FROM Companion WHERE status = 1 AND deleted = 0').get() as any).n
  const pendingFighters = (d
    .prepare(`SELECT COUNT(*) AS n FROM FighterApplication WHERE status = 'pending'`)
    .get() as any).n

  const weekOrders: { date: string; count: number; revenue: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dt = new Date()
    dt.setDate(dt.getDate() - i)
    const ds = localDateStr(dt)
    const row = d
      .prepare(
      'SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status = ? THEN amountCents ELSE 0 END), 0) AS s FROM "Order" WHERE substr(createdAt, 1, 10) = ?',
      )
      .get('completed', ds) as any
    weekOrders.push({ date: ds.slice(5), count: row.n, revenue: centsToYuan(row.s) })
  }

  const topRows = d
    .prepare(
      'SELECT companionName AS name, SUM(unitCount) AS sales FROM "Order" WHERE status != ? GROUP BY companionName ORDER BY sales DESC LIMIT 5',
    )
    .all('cancelled') as any[]
  const statusRows = d.prepare('SELECT status, COUNT(*) AS n FROM "Order" GROUP BY status').all() as any[]
  const statusCounts: Record<string, number> = { pending: 0, assigned: 0, in_progress: 0, completion_pending: 0, completed: 0, cancelled: 0 }
  for (const r of statusRows) statusCounts[r.status] = r.n

  return {
    todayOrders,
    todayRevenue,
    inProgress,
    activeCompanions,
    pendingFighters,
    weekOrders,
    topCompanions: topRows.map((r) => ({ name: r.name, sales: r.sales })),
    statusCounts,
  }
}

function buildAnalyticsWhere(filters: AnalyticsFilters): { where: string; args: any[] } {
  const conds: string[] = ['1=1']
  const args: any[] = []
  const datePattern = /^\d{4}-\d{2}-\d{2}$/

  if (datePattern.test(filters.start || '')) {
    conds.push('createdAt >= ?')
    args.push(`${filters.start} 00:00:00`)
  }
  if (datePattern.test(filters.end || '')) {
    conds.push('createdAt <= ?')
    args.push(`${filters.end} 23:59:59`)
  }
  if (filters.status && VALID_STATUS.includes(filters.status as OrderStatus)) {
    conds.push('status = ?')
    args.push(filters.status)
  }
  if (filters.source === 'unassigned') {
    conds.push(`(assignedBy = '' OR assignedBy IS NULL)`)
  } else if (['customer', 'fighter', 'admin'].includes(filters.source || '')) {
    conds.push('assignedBy = ?')
    args.push(filters.source)
  }
  if (filters.fighterId) {
    conds.push('fighterId = ?')
    args.push(filters.fighterId)
  }
  if (filters.serviceTypeId) {
    conds.push('serviceTypeId = ?')
    args.push(filters.serviceTypeId)
  }
  if (filters.companionId) {
    conds.push('companionId = ?')
    args.push(filters.companionId)
  }
  if (filters.keyword) {
    conds.push('(orderNo LIKE ? OR companionName LIKE ? OR serviceName LIKE ? OR customerName LIKE ? OR customerId LIKE ?)')
    const keyword = `%${filters.keyword}%`
    args.push(keyword, keyword, keyword, keyword, keyword)
  }

  return { where: conds.join(' AND '), args }
}

function analyticsBreakdown(
  groupExpression: string,
  where: string,
  args: any[],
  limit = 12,
): AnalyticsBreakdownRow[] {
  const rows = getDb()
    .prepare(
      `SELECT COALESCE(NULLIF(${groupExpression}, ''), '未分配') AS label,
              COUNT(*) AS orders,
              COALESCE(SUM(amountCents), 0) AS grossVolumeCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents ELSE 0 END), 0) AS completedRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents - fighterIncomeCents ELSE 0 END), 0) AS platformRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN fighterIncomeCents ELSE 0 END), 0) AS fighterIncomeCents,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM "Order"
       WHERE ${where}
       GROUP BY label
       ORDER BY orders DESC, grossVolumeCents DESC
       LIMIT ?`,
    )
    .all(...args, limit) as any[]

  return rows.map((row) => ({
    label: String(row.label),
    orders: Number(row.orders),
    grossVolume: centsToYuan(row.grossVolumeCents),
    completedRevenue: centsToYuan(row.completedRevenueCents),
    platformRevenue: centsToYuan(row.platformRevenueCents),
    fighterIncome: centsToYuan(row.fighterIncomeCents),
    completionRate: Number(row.orders) ? Math.round((Number(row.completed || 0) / Number(row.orders)) * 1000) / 10 : 0,
  }))
}

function analyticsTrend(
  where: string,
  args: any[],
  start: string,
  end: string,
): AnalyticsTrendPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT substr(createdAt, 1, 10) AS date,
              COUNT(*) AS orders,
              SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) AS validOrders,
              COALESCE(SUM(amountCents), 0) AS grossVolumeCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents ELSE 0 END), 0) AS completedRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents - fighterIncomeCents ELSE 0 END), 0) AS platformRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN fighterIncomeCents ELSE 0 END), 0) AS fighterIncomeCents
       FROM "Order"
       WHERE ${where}
       GROUP BY substr(createdAt, 1, 10)
       ORDER BY date ASC`,
    )
    .all(...args) as any[]
  const byDate = new Map(rows.map((row) => [String(row.date), row]))
  const points: AnalyticsTrendPoint[] = []
  const datePattern = /^\d{4}-\d{2}-\d{2}$/

  if (datePattern.test(start) && datePattern.test(end)) {
    const cursor = new Date(`${start}T00:00:00`)
    const last = new Date(`${end}T00:00:00`)
    while (cursor <= last && points.length < 366) {
      const date = localDateStr(cursor)
      const row = byDate.get(date)
      points.push({
        date,
        orders: Number(row?.orders || 0),
        validOrders: Number(row?.validOrders || 0),
        revenue: centsToYuan(row?.grossVolumeCents),
        completedRevenue: centsToYuan(row?.completedRevenueCents),
        platformRevenue: centsToYuan(row?.platformRevenueCents),
        fighterIncome: centsToYuan(row?.fighterIncomeCents),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
  } else {
    for (const row of rows) {
      points.push({
        date: String(row.date),
        orders: Number(row.orders),
        validOrders: Number(row.validOrders || 0),
        revenue: centsToYuan(row.grossVolumeCents),
        completedRevenue: centsToYuan(row.completedRevenueCents),
        platformRevenue: centsToYuan(row.platformRevenueCents),
        fighterIncome: centsToYuan(row.fighterIncomeCents),
      })
    }
  }
  return points
}

export function getAnalytics(filters: AnalyticsFilters = {}): Analytics {
  const { where, args } = buildAnalyticsWhere(filters)
  const summary = getDb()
    .prepare(
      `SELECT COUNT(*) AS orders,
              SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) AS validOrders,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) AS assigned,
              SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
              SUM(CASE WHEN status = 'completion_pending' THEN 1 ELSE 0 END) AS completionPending,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
              SUM(CASE WHEN isTrial = 1 THEN 1 ELSE 0 END) AS trialOrders,
              SUM(CASE WHEN status = 'pending' AND (fighterId = '' OR fighterId IS NULL) THEN 1 ELSE 0 END) AS unassignedPending,
              COALESCE(SUM(amountCents), 0) AS grossVolumeCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents ELSE 0 END), 0) AS completedRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents - fighterIncomeCents ELSE 0 END), 0) AS platformRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN fighterIncomeCents ELSE 0 END), 0) AS fighterIncomeCents
       FROM "Order"
       WHERE ${where}`,
    )
    .get(...args) as any

  const orders = Number(summary.orders || 0)
  const validOrders = Number(summary.validOrders || 0)
  const completed = Number(summary.completed || 0)
  const cancelled = Number(summary.cancelled || 0)
  const grossVolumeCents = Number(summary.grossVolumeCents || 0)
  const totals = {
    orders,
    validOrders,
    pending: Number(summary.pending || 0),
    assigned: Number(summary.assigned || 0),
    inProgress: Number(summary.inProgress || 0),
    completionPending: Number(summary.completionPending || 0),
    completed,
    cancelled,
    trialOrders: Number(summary.trialOrders || 0),
    unassignedPending: Number(summary.unassignedPending || 0),
    grossVolume: centsToYuan(grossVolumeCents),
    completedRevenue: centsToYuan(summary.completedRevenueCents),
    platformRevenue: centsToYuan(summary.platformRevenueCents),
    fighterIncome: centsToYuan(summary.fighterIncomeCents),
    avgOrderValue: validOrders ? Math.round((grossVolumeCents / validOrders)) / 100 : 0,
    completionRate: validOrders ? Math.round((completed / validOrders) * 1000) / 10 : 0,
    cancellationRate: orders ? Math.round((cancelled / orders) * 1000) / 10 : 0,
  }

  const recentRows = getDb()
    .prepare(`SELECT * FROM "Order" WHERE ${where} ORDER BY createdAt DESC, rowid DESC LIMIT 20`)
    .all(...args) as any[]

  return {
    generatedAt: nowLocal(),
    filters: { ...filters },
    totals,
    trend: analyticsTrend(where, args, filters.start || '', filters.end || ''),
    statusBreakdown: analyticsBreakdown('status', where, args),
    sourceBreakdown: analyticsBreakdown(`COALESCE(NULLIF(assignedBy, ''), 'unassigned')`, where, args),
    serviceBreakdown: analyticsBreakdown('serviceName', where, args),
    fighterBreakdown: analyticsBreakdown('fighterName', where, args),
    companionBreakdown: analyticsBreakdown('companionName', where, args),
    recentOrders: recentRows.map(oRow),
  }
}
