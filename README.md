# dsh-superagent-webhook-bridge

DSH / Cordis Webhook 来源插件：独立来源卡片、事件开关、按来源和事件隔离的条件、持久收件箱、失败重试、签名认证、事件回执及结果回传。通过原生 SourceKind / SourceContext.receive 接入 Super-agent 评估和工单。

## 环境与兼容性

Node.js >=22.19，DSH `^0.2.1-alpha.2`，提供 `orchestrator` 服务的 dsh-superagent。验证上游提交为 `8c32a9dc5d72c033816c6a8110b37f40cf94fba4`。不承诺未来未稳定接口的兼容性。

后端是独立插件，卸载注销来源并关闭监听，数据保留在宿主 SQLite。**完整卡片界面需要显式前端适配**：上游尚无自定义字段渲染扩展点，本包提供可撤销脚本，只为宿主 `src/client/settings-kit.tsx` 增加字段渲染分支及首次开启时创建单个空白来源的逻辑。单独安装 npm 包不会自动修改宿主；未适配时保留原生表格与 JSON 文本编辑。

## 构建与安装

```powershell
npm ci
npm run build
npm run check
npm test
npm pack
```

安装生成的 `dsh-superagent-webhook-bridge-1.1.10.tgz` 到对应 DSH profile 的插件管理器，或使用宿主 bundle 安装流程。包内 `cordis.patch.yml` 注册独立入口。不要重新创建已有 profile。

在 Super-agent 源码目录安装本包作为直接依赖，启用卡片界面并重建：

```powershell
npm install D:/work/project/dsh/dsh-superagent-webhook-bridge/dsh-superagent-webhook-bridge-1.1.10.tgz
node node_modules/dsh-superagent-webhook-bridge/scripts/integrate-ui.mjs .
npm run typecheck
npm run build
```

重启对应 profile。脚本幂等，保留 `.webhook-bridge.bak`；结构或备份不匹配时拒绝写入。恢复后重建：

```powershell
node node_modules/dsh-superagent-webhook-bridge/scripts/integrate-ui.mjs . --remove
npm run build
```

宿主文件适配后有其他修改时，恢复脚本拒绝覆盖，需人工合并。移除前端包依赖前先撤销适配。

## 部署配置

```yaml
- id: dsh-superagent-webhook-bridge
  name: dsh-superagent-webhook-bridge
  config:
    host: 0.0.0.0
    port: 9088
    maxBodyBytes: 1048576
    maxPending: 10000
    maxInboxBytes: 67108864
    ratePerMinute: 600
    retentionDays: 30
    maxAttempts: 12
    callbackHosts: []
```

`maxPending` 限制全部保留回执数量；`maxInboxBytes` 限制插件收件箱 JSON 总量，不覆盖宿主其他表和 WAL。容量满返回503。通过现有 HTTPS 代理暴露 `/hooks/`，管理页继续使用 DSH 原有访问控制。不复用参考站点账号密码。

未设置 `publicUrl` 时，默认自动获取本机 IPv4 地址（优先局域网地址），用于来源卡片的 URL。多网卡、容器或反向代理部署可用 `publicUrl` 指定发送方可访问的地址。显式设置 `host: 127.0.0.1` 时仍只供本机访问；已有配置需改为 `0.0.0.0` 才会启用自动获取。自动获取不负责公网 IP、端口映射或防火墙配置。

## 来源和评估

1. 设置 → 来源 → Webhook：开启 Webhook 后，在来源标题右侧点击“添加webhook来源”创建空白卡片，可连续添加。每张卡片独立保存、放弃修改，不显示高级设置。插件启动后默认启用，不显示 Webhook 总开关；停用插件后隐藏入口与卡片并保留已保存配置。新卡片默认启用，事件默认关闭，密钥留空时在保存后自动生成；已有来源留空保留密钥。评估页按来源名称展示标签，每个开启的事件各有独立条件组。`selected` 空事件列表拒绝全部，`all` 接收全部。
2. 入口路径 `/hooks/{ID}`，公网主机名由代理确定。
3. 设置 → 评估 → Webhook：“自动发送者”填写 **`来源ID:sender`**，如 `documents:openlist`。身份按来源隔离，避免其他来源冒充；同一来源持有密钥者可声明该来源 sender。
4. 来源标签下对开启事件分别配置 AND/OR；关闭事件保留条件。支持 payload、header、url，等于、不等于、包含、开头、结尾、RE2 正则及存在。空条件放行；缺失字段不会因“不等于”通过。
5. 通过条件仍需宿主授权和评估。所有事件 `human:false`，只作为推断候选；`observe` 观察，`auto` 才可按现有规则接单。人工允许名单不会将自动事件升级成人工授权。
6. 使用宿主保存/放弃、版本历史和乐观并发检查。评估编辑器使用已保存的来源事件配置。

## 事件协议

```http
POST /hooks/documents
Content-Type: application/json
X-Webhook-Key: <该来源密钥>

{"id":"upstream-event-123","event":"file.created","sender":"openlist","thread":"folder-42","text":"请处理新增文件","payload":{"data":{"path":"/docs/report.pdf"}}}
```

`id/event/sender/text` 必填，`thread/at/payload` 可选；`at` 为 ISO UTC 时间。重试保持相同 ID 和内容；同 ID 不同内容返回409。未传 thread 则每个事件独立成串。外部正文是未信任业务数据。

签名模式 `hmac-sha256`：`X-Webhook-Timestamp` 为10位 Unix 秒，`X-Webhook-Signature: sha256=<hex>`；HMAC 原文为 `timestamp + '.' + 原始请求体字节`，允许时钟偏差5分钟。轮换后旧密钥在 `previousSecret` 保留，迁移完成清空。key 模式没有时间戳保护，依赖 ID 去重。

| HTTP          | 含义                                        |
| ------------- | ------------------------------------------- |
| 202 queued    | 已持久提交收件箱，尚未评估或执行            |
| 200 duplicate | 同内容重复事件，返回原回执状态              |
| 202 filtered  | 订阅或条件过滤，未入队                      |
| 400 / 415     | 请求或内容类型无效                          |
| 401           | 密钥或签名无效                              |
| 409           | 同 ID 内容冲突，或回执不允许重试            |
| 413           | 请求超过容量                                |
| 429 / 503     | 限流、容量满或临时失败，按 Retry-After 重试 |

认证后 `GET /hooks/{ID}/receipts/{编码后的事件ID}` 查询 `queued/stored/filtered/dead`。**stored 仅表示宿主接收完成，不等于执行成功**。dead 可通过认证后的 `POST .../retry` 重置。HMAC 查询也需对空请求体签名。

收件箱复用宿主 SQLite 事务及 FULL 同步。后台每秒处理，失败指数退避并抖动，上限5分钟，默认12次后 dead。重启恢复 queued；关闭或卸载来源保留队列。终态回执超过保留期限在新事件入队时清理；queued 不按年龄删除。单 profile 进程消费，依赖宿主目录锁。

## 结果回传

来源配置固定 HTTPS `callbackUrl` 和独立 `callbackSecret`，部署配置 `callbackHosts` 为精确域名名单；事件不能指定地址。

原生 Channel / Outbox 回传智能体实际产生的 `acknowledgement/reply/notice`，载荷 `{id,eventId,kind,text,ticketId?}`。并非每种工单状态都会产生消息。附带 `Idempotency-Key: 消息ID` 与上述 HMAC 签名。接收方须按消息 ID 幂等。仅2xx成功，3xx不跟随，其他失败交给宿主持久 Outbox 重试，提供至少一次投递。

回调强制 HTTPS、公网 IP、域名名单及证书校验；DNS 结果绑定实际连接，拒绝 URL 用户信息，10秒总超时。卸载中止网络回调。无地址则不回传。

## 验证与边界

`npm test` 验证 HTTP、收件箱、策略、签名、回调传输、生命周期、React 交互及适配器。`npm run test:host` 需要 `.reference-superagent` 指定提交源码，测试真实上游 Store / Registry / Policy / Engine 和 SQLite 重启恢复。

详见 [测试记录](docs/TEST-REPORT.md) 和 [运维说明](docs/OPERATIONS.md)。已在用户指定3082 profile安装并验证真实模型接单与文件修改，见 [本地验收报告](docs/LIVE-TEST-REPORT.md)。未发布 npm；外部业务回调和公网 TLS 仍需单独验收。统一 Webhook 协议需要业务方发送或转换；未声称支持未经核对的 OpenList 私有签名，不执行任意外部命令。

## 2026-11-19 交付核对与新增功能

本版本包含：自定义 JSON 接收、每事件独立接收条件和映射、问题主体多字段提取、数组索引与通配符、`{{字段路径}}` 文本模板，以及自定义认证请求头。请在来源卡片展开对应事件的“接收规则与问题主体”配置。自定义 JSON 的问题主体留空时使用完整数据；模板中的文字、标点和换行会保留。

**交付安装必须完成两个步骤**：插件管理器安装 tgz 只启用后端；来源卡片与评估页面还需在实际运行的 Super-agent 源码目录执行本包 `scripts/integrate-ui.mjs`，重新构建宿主并重启对应服务。仅重启或仅安装 tgz 不会更新宿主客户端。Docker 部署应将适配后的构建纳入镜像或持久部署目录，避免重建容器丢失。

升级已有前端适配时，先使用原版本脚本执行 `--remove`，再安装新版并执行适配。脚本发现已有不同版本文件会拒绝覆盖，不能把失败提示当作安装完成。

核对记录见 [交付核对报告](docs/DELIVERY-AUDIT.md)。

## 完整安装入口（1.1.8 起）

先在目标 DSH profile 插件管理器安装 tgz，然后在**实际运行宿主所在环境**执行：

```sh
npm exec --yes --package=/absolute/path/dsh-superagent-webhook-bridge-1.1.10.tgz -- webhook-bridge-install /absolute/path/to/superagent
```

Docker 环境必须在容器内部执行，宿主源码通常是 `/opt/superagent`。该命令校验宿主源码、接入新版来源页及评估页、调用宿主 `npm run build`，任何一步失败即返回非零状态，恢复本次修改前的前端源码。构建产物可能被构建器部分更新，失败时不得重启部署，须排除错误后重新运行。成功后重启对应宿主服务并刷新页面。

宿主必须有完整源码、已安装的构建依赖及可写目录。插件管理器安装不保证执行 npm 生命周期脚本，因此不使用 postinstall 冒充自动完成前端部署。

已有旧版适配时，先用**原版本** `scripts/integrate-ui.mjs <宿主目录> --remove` 撤销，再运行上述入口。遇到冲突会明确报错，不覆盖人工修改。Docker 重建时应将此命令写入镜像构建流程。

## 1.1.9 安装行为

普通 npm 安装现在通过 postinstall 自动定位 Superagent 源码并执行前端接入及宿主构建。建议显式设置 DSH_SUPERAGENT_ROOT，确保指向实际运行的宿主目录。找不到宿主源码或构建失败，安装返回失败。使用 --ignore-scripts 或禁止生命周期脚本的插件管理器仍会跳过此步骤，必须执行 webhook-bridge-install；不能将仅后端加载视为完整安装。当前尚无已验证的 DSH 插件管理器生命周期回调，不能保证管理器自动运行 npm postinstall。


## 页面配置驱动的接收流程（2026-11-20）

当前 HTTP 接收链路以页面字段为准：自定义请求头密钥认证 → 已开启事件的接收条件（AND）→ JSON 字段映射与类型校验 → 对映射字段执行评估条件 → 忽略、直接准入或候选评估。没有配置评估规则时忽略；原始请求的未映射字段不会进入 worker。发送给 worker 的正文是整个映射 JSON 的序列化结果，不从其中单独取 text。

评估中的 AND/OR 按动作分别组合；多组同时满足时依次采用忽略、准入、候选。未映射的字段不能参与评估。多个事件的接收条件同时匹配时返回400 ambiguous_event_rules，需在页面设置能区分事件的接收条件。类型校验失败返回400，认证失败返回401。

旧 inputMode、mapping、来源级 receivePolicy、旧 eventPolicies/rules、自动发送者和历史密钥不参与当前 HTTP 流程；隐藏的外部回调不启用。密钥取页面的访问密钥，认证头名称取页面配置。候选遵循宿主评估模式与接单规则；直接准入通过宿主工单与 worker 调度流程，仍遵守暂停与并发设置。

部署除重建前端外，还需执行 `node scripts/integrate-flow.mjs <superagent-root>` 并重建宿主后端；`install-host.mjs` 已包含此步骤。脚本为修改过的宿主源码保留 `.webhook-flow.bak`。测试：`npm test`、`npm run test:host`、宿主 `npm run typecheck` 与 `npm run build`。

认证、接收条件和映射校验通过后，接口返回 HTTP 202 queued，表示接收成功。评估结果为 ignore（包括未配置评估条件）也正常入队并在宿主评估列表记录“忽略”，不创建 worker 工单；只有接收条件不匹配才在接收阶段返回 filtered / receive_conditions。

每个通过接收条件与映射校验的 HTTP 请求生成新的 UUID 任务 ID；相同请求重复发送仍作为独立任务接收，不使用请求正文或外部 id 去重。同一已接收任务的内部重试仍复用该任务 ID。
