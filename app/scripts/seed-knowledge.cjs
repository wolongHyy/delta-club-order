// 智能客服知识库种子脚本：把内置知识（knowledge-seed.json）写入 SQLite。
// 运行：npm run seed:ai   （在 app 目录下）
const path = require('path')
const fs = require('fs')
const { DatabaseSync } = require('node:sqlite')

const dbFile = process.env.DB_PATH || path.join(process.cwd(), 'db', 'custom.db')
const db = new DatabaseSync(dbFile)
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
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
`)

const seedFile = path.join(process.cwd(), 'src', 'lib', 'ai', 'knowledge-seed.json')
if (!fs.existsSync(seedFile)) {
  console.log('[提示] 未找到知识文件 knowledge-seed.json（俱乐部内部资料不入库，见 .gitignore）。')
  console.log('       如需重建，请从本地备份恢复该文件（可参考 src/lib/ai/knowledge-seed.example.json 的结构）。')
  db.close()
  process.exit(0)
}
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
if (!Array.isArray(seed)) {
  console.error('知识文件格式错误')
  process.exit(1)
}

const genId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

const upsert = db.prepare(`
  INSERT INTO AiKnowledgeChunk (id, key, category, title, content, keywords, source, enabled, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    category = excluded.category,
    title = excluded.title,
    content = excluded.content,
    keywords = excluded.keywords,
    source = excluded.source,
    enabled = 1,
    updatedAt = excluded.updatedAt
`)

let added = 0
for (const e of seed) {
  upsert.run(genId(), e.key, e.category || '', e.title || '', e.content || '', e.keywords || '', e.source || '', now(), now())
  added += 1
}
console.log('知识库已写入 ' + added + ' 条')
db.close()
