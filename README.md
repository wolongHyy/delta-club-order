# 三角洲俱乐部 · 在线点单系统（delta_app）

三角洲行动护航 / 陪玩 / 趣味单俱乐部的在线点单平台：用户端下单、打手端抢单结单、管理端调度审核，并内置 24 小时智能客服。

## 功能总览

- **用户端 `/`**：首页/分类/消息/我的 四个 Tab；搜索陪玩、护航、趣味单；详情下单（单陪/双陪、时长、加购、区服、段位）；指定打手或进入公共抢单池；订单列表与取消；官方公告；**24 小时智能客服**（消息页入口 + 悬浮气泡，套餐/规则/趣味单随问随答）。
- **打手端 `/fighter`**：账号/微信登录；抢单大厅（滑块验证防脚本，娱乐档不可抢公共池）；接单开始服务；上传结单截图申请完工；收益与提现。
- **管理端 `/admin`**：登录 + Cookie 会话 + 审计日志；仪表盘、订单调度、陪玩管理、打手审核、服务类型、消息管理、数据统计、提现审核、设置；**智能客服控制台 `/admin/ai`**（对话记录、知识库管理、客服设置、连接测试）。

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS
- SQLite（node:sqlite，免安装数据库）
- 智能客服：内置 RAG（中文分词 + BM25 检索 + 50 条业务知识库）+ OpenAI 兼容大模型（默认 DeepSeek）

## 目录

```text
app/                    # Next.js 应用
  src/app/              # 页面与 API 路由（含 /api/ai 智能客服接口）
  src/components/       # 用户端/管理端组件
  src/lib/              # 数据库、鉴权、AI 模块（lib/ai/）
  scripts/              # seed.cjs 演示数据 / seed-knowledge.cjs 客服知识库 / db-tests.ts
  db/                   # SQLite 数据（不入库）
  start.bat             # 便携版启动
  server.js             # 生产版入口
node/                   # 便携版 Node.js 运行时（不入库）

> 内部经营资料（价格、规则、客服知识库、种子数据、需求文档）不入库，见下方「内部资料与安全」。
```

## 运行

```bat
start.bat
```

或开发模式（在 `app/` 目录）：

```bash
npm run dev        # 开发
npm run build      # 构建（含 postbuild 复制静态资源）
npm run start      # 生产启动
npm run seed       # 重置演示数据
npm run seed:ai    # 重建智能客服知识库（幂等）
npm run test       # 数据库单元测试
```

## 智能客服配置

接口/Key/模型在 `app/.env` 配置（环境变量优先级最高），也可在后台「智能客服 → 客服设置」修改：

```env
AI_ENABLED=1
AI_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=sk-你的DeepSeekKey
AI_MODEL=deepseek-chat
```

支持任意 OpenAI 兼容接口（DeepSeek / 智谱 GLM / 豆包等）。客服知识库文件 `app/src/lib/ai/knowledge-seed.json` 属内部资料不入库（结构见 `knowledge-seed.example.json`），本地已有可直接用 `npm run seed:ai` 重建，也可在后台直接增删改。

## 协作方式（重要）

- `main` 分支已启用 GitHub 分支保护：
  - 仓库管理员（你自己）：可随时直接 push / 直接合并，不受审核限制；
  - 其他协作者 / 外部贡献者：必须 **fork + Pull Request** 提交，且需要 **至少 1 人审核通过**后才能合并；
  - 任何人：禁止强推（force push）与删除 main 分支。
- 请在 `app/.env` 中配置本地密钥，`.env` 已被 `.gitignore` 排除，**不要**把真实 API Key、密码提交到仓库。

## 内部资料与安全

- 俱乐部经营内容一律不入库（见 `.gitignore`）：价格/规则/客服细则、需求文档 `需求文档与设计方案.md`、智能客服知识库 `app/src/lib/ai/knowledge-seed.json`、演示种子数据 `app/scripts/seed.cjs`。
- 新克隆后如需恢复演示数据 / 客服知识库：从本地备份复制 `app/scripts/seed.cjs` 与 `app/src/lib/ai/knowledge-seed.json`（结构可参考 `knowledge-seed.example.json`）。
- `.env` 存放真实 API Key 等密钥，已被 `.gitignore` 排除，切勿提交。

## 文档（本地）

- `需求文档与设计方案.md`：产品需求与架构方案（内部资料，不入库）
- `保姆级开发教程.md`：面向初学者的代码讲解（公开）
- `微信服务号上线准备清单.md`：微信服务号接入准备（公开）
