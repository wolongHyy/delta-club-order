# 三角洲游戏服务平台

三角洲行动护航 / 陪玩 / 趣味单俱乐部的在线点单平台。面向三类角色：顾客（下单与咨询）、打手（抢单与服务）、管理员（商品、订单、打手、提现与客服管理）。系统内置 24 小时智能客服，基于业务知识库回答套餐、规则与趣味单相关问题。

## 功能

### 顾客端（/）

- 首页：服务类型入口、热门商品、公告
- 分类：按服务类型与关键词筛选商品
- 商品详情与下单：单陪/双陪、时长或单数、加购项、区服、段位、备注
- 指定打手，或放入公共抢单池
- 订单：待付款、待接单、服务中、已完成、已取消；待付款/待接单可取消
- 消息：官方公告、24 小时智能客服（消息页入口 + 悬浮气泡）
- 我的：顾客身份、打手入驻申请入口

### 打手端（/fighter）

- 账号密码登录；已审核打手支持微信一键登录
- 抢单大厅：滑块验证（拖到最右侧）防脚本，带冷却与限流；娱乐档不可抢公共池
- 服务中的订单：查看老板联系方式，开始服务
- 完工申请：至少 1 张结单截图 + 完成说明
- 收益：完工后抽成进入待结算，管理员确认后进入可提现余额
- 提现申请与记录
- 在线状态与个人资料

### 管理端（/admin）

- 登录：账号密码 + httpOnly Cookie 会话 + 审计日志
- 仪表盘：今日订单、营收、服务中、在售陪玩、待审核打手
- 订单调度：派单、放回公共池、取消、线下已收款、确认完工
- 陪玩管理：增删改、上下架
- 打手申请：审核入驻，审核通过自动建立打手账号与商品
- 服务类型、消息管理、数据统计、提现审核、设置
- 智能客服控制台（/admin/ai）：对话记录、知识库管理、客服设置、连接测试

### 智能客服

- 24 小时在线，流式输出回答
- RAG 架构：中文分词 + BM25 检索 + 业务知识库；每次回答附带当前在售商品信息
- 人格化人设：自然口语、短句、价格引用约束、纠纷问题引导人工客服
- 知识库可在管理后台增删改，也可用 seed 脚本重建

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS
- SQLite（node:sqlite 内置驱动，无需单独安装数据库）
- 智能客服：OpenAI 兼容大模型接口（默认 DeepSeek）+ 本地 RAG

## 环境要求

- Node.js 22 或更高（项目自带便携版运行时 `node/`，Windows 下可免安装）
- 操作系统：Windows / macOS / Linux
- 不需要 Docker、不需要外部数据库

## 快速开始

### 方式一：Windows 便携版

```bat
start.bat
```

首次使用前，在 `app/` 目录初始化演示数据与客服知识库：

```bat
..\node\node.exe --experimental-sqlite scripts/seed.cjs
..\node\node.exe --experimental-sqlite scripts/seed-knowledge.cjs
```

### 方式二：npm 开发模式（在 app/ 目录）

```bash
npm install
npm run dev        # 开发模式，http://localhost:3000
npm run seed       # 重置演示数据
npm run seed:ai    # 重建智能客服知识库（幂等）
npm run build      # 生产构建（含 postbuild 复制静态资源）
npm run start      # 生产启动
npm run test       # 数据库单元测试
```

## 目录结构

```text
app/                    # Next.js 应用
  src/app/              # 页面与 API 路由
  src/components/       # 用户端 / 打手端 / 管理端组件
  src/lib/              # 数据库、鉴权、智能客服（lib/ai/）
  scripts/              # seed.cjs、seed-knowledge.cjs、db-tests.ts
  db/                   # SQLite 数据文件（不入库）
  public/               # 静态资源
  .env                  # 环境变量（不入库）
  start.bat             # Windows 便携版启动
  server.js             # 生产版入口
node/                   # 便携版 Node.js 运行时（不入库）
```

## 配置（app/.env）

复制 `app/.env.example` 为 `app/.env` 后按需填写。`.env` 不入库。

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| DB_PATH | SQLite 文件路径 | `app/db/custom.db` |
| PORT / HOSTNAME | 服务端口与监听地址 | 3000 / 0.0.0.0 |
| ADMIN_USERNAME / ADMIN_PASSWORD | 管理端账号密码 | admin / 空 |
| ADMIN_SESSION_SECRET | 管理端会话签名密钥 | 本地默认值 |
| CUSTOMER_SESSION_SECRET | 顾客会话签名密钥 | 本地默认值 |
| FIGHTER_SESSION_SECRET | 打手端会话签名密钥 | 本地默认值 |
| ORDER_AUTO_CANCEL_MINUTES | 待接单超时自动取消分钟数，0 关闭 | 30 |
| CLAIM_COOLDOWN_MS | 抢单冷却毫秒数 | 3000 |
| RATE_LIMIT_SHARED | 多实例共享限流（db）或内存限流（空） | 空 |
| MAINTENANCE_TOKEN | 维护接口令牌 | 空 |
| UPLOAD_DIR | 结单截图上传目录 | D:/delta_app_uploads |
| WECHAT_APPID / WECHAT_SECRET | 微信服务号配置（可选） | 空 |
| WECHAT_SCOPE | 微信授权范围 | snsapi_base |
| APP_BASE_URL | 对外访问地址（微信回调用） | http://localhost:3000 |
| WECHAT_MINI_APPID / WECHAT_MINI_SECRET / MINI_BIND_SECRET | 小程序 web-view 绑定（可选） | 空 |
| AI_ENABLED / AI_BASE_URL / AI_API_KEY / AI_MODEL | 智能客服接口配置 | 1 / 空 / 空 / 空 |

生产环境必须设置：强管理密码、两个不同的 64 位随机会话密钥、HTTPS、定期备份数据库。生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 订单状态

```text
unpaid（待付款）→ pending（待接单）→ assigned（已指派）→ in_progress（服务中）
→ completion_pending（待确认完工）→ completed（已完成）
取消：unpaid / pending 可取消 → cancelled
```

- 待付款订单可被管理员标记「线下已收款」后进入派单/抢单池
- 已指派或已被打手抢走的订单不可强行改派
- 待接单超过设定时间自动取消

## 智能客服配置

接口与模型可通过环境变量或管理后台「智能客服 → 客服设置」配置，环境变量优先级更高：

```env
AI_ENABLED=1
AI_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=sk-你的Key
AI_MODEL=deepseek-chat
```

支持任意 OpenAI 兼容接口（DeepSeek、智谱 GLM、豆包等）。知识库文件 `app/src/lib/ai/knowledge-seed.json` 为内部资料，不入库；结构参考 `knowledge-seed.example.json`。修改知识库后可执行 `npm run seed:ai` 重建。

## 微信接入

系统支持微信服务号网页授权登录（用户端、打手端）与小程序 web-view 绑定。不同主体（个人 / 个体工商户 / 企业）与不同账号类型（服务号 / 企业微信）的上线流程不同，参见《微信接入与上线指南.md》。

未配置微信时，账号密码登录完全可用，不影响本地开发与演示。

## 部署上线

1. 生产构建：`npm run build`（Windows 下收尾可能提示 `kill EPERM`，属环境噪音，构建产物完整；随后执行 `node scripts/postbuild.cjs` 复制静态资源）
2. 启动：`npm run start` 或 `start.bat`（读取 `.env`）
3. 前置条件：公网域名 + HTTPS 证书；如启用微信登录，域名需完成 ICP 备案并配置网页授权域名
4. 安全项：强管理密码、独立会话密钥、数据库备份、错误日志
5. 数据库备份：停止服务后复制 `app/db/custom.db`（含 WAL 文件）即可

## 测试

```bash
npm run test
```

覆盖订单状态流转、抢单令牌、提现审核等数据库核心逻辑。

## 协作方式

- `main` 分支启用 GitHub 分支保护
- 仓库管理员可直接 push / 直接合并
- 其他协作者与外部贡献者须通过 fork + Pull Request 提交，且需至少 1 人审核通过
- 禁止强推与删除 main 分支

## 内部资料与安全

- 以下内容一律不入库（见 `.gitignore`）：价格/规则/客服细则、需求文档、智能客服知识库 `knowledge-seed.json`、演示种子数据 `seed.cjs`
- 新克隆后如需恢复演示数据与知识库：从本地备份复制 `app/scripts/seed.cjs` 与 `app/src/lib/ai/knowledge-seed.json`
- `.env` 存放真实密钥，已被 `.gitignore` 排除，禁止提交

## 文档

| 文档 | 说明 |
| --- | --- |
| 微信接入与上线指南.md | 微信服务号 / 企业微信 / 小程序的上线流程（公开） |
| 保姆级开发教程.md | 面向初学者的代码讲解（公开） |
| 需求文档与设计方案.md | 产品需求与架构方案（内部资料，不入库） |
