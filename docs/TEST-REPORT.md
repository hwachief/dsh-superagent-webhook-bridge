> 后续已在用户指定的本地3082完成真实环境验收，详见 [本地实测报告](LIVE-TEST-REPORT.md)。以下为初始离线测试记录，环境状态以补充报告为准。

# 测试记录

执行日期：2026-11-18（Asia/Shanghai）。本机 Windows，Node.js 24.20.0、npm 11.19.0。

上游源码：deepseek-ai/dsh-superagent-prototype，提交 `8c32a9dc5d72c033816c6a8110b37f40cf94fba4`。测试副本位于被忽略的 `.reference-superagent`，没有修改用户正在运行的 DSH profile。

| 验证                                                 | 结果                |
| ---------------------------------------------------- | ------------------- |
| 插件自动测试                                         | 22 项通过           |
| 真实上游 SQLite、SourceRegistry、Policy、Engine 集成 | 1 项通过            |
| 上游来源页、评估页、设置、注册表、Outbox 回归        | 5 个文件、41 项通过 |
| 含前端适配的上游 TypeScript 检查                     | 通过                |
| 含前端适配的上游完整构建                             | 通过                |
| 插件界面构建及 JavaScript 语法检查                   | 通过                |
| npm 生产依赖审计                                     | 0 漏洞              |
| tgz 在隔离临时目录安装，仅生产依赖导入               | 通过                |

插件覆盖：独立入口、空订阅拒绝全部、条件隔离和 RE2、HMAC 原始字节及时间窗、密钥轮换、来源身份隔离、并发重复事件、ID 内容冲突、请求体和限流上限、收件箱重启恢复、退避、dead 与重试、来源关闭保留、回执清理、Cordis 卸载、DNS 固定及 SSRF 拦截、签名回调传输、3xx/429/500、React 来源与事件交互、条件保留、前端适配幂等及撤销保护。

真实上游集成不是 HTTP mock：打开上游 SQLite Store，提交收件箱后关闭并重新打开数据库，经上游策略确认已授权 bot 可作为 inferred 候选、未知 bot 被拒绝，调用真实 Engine 去重并产生工单。评估决定在测试中显式提供；未调用真实模型。

回调传输测试使用本地 HTTP 测试接收器及显式注入的 transport/resolver；验证真实序列化、签名、DNS 绑定参数和错误传播。生产实现固定使用 HTTPS transport 与系统 DNS，未使用外部真实业务回调端点。

浏览器连接在参考站点标签绑定阶段持续超时，未完成视觉截图验收。界面已完成 jsdom React 交互测试及上游编译验证，这不等于真实浏览器布局验收。原参考 HTML 及交接说明作为页面设计依据。

未完成项：实际生产 profile 的安装启停、真实模型评估执行、业务端到端回调、外部 TLS/代理链路、长时间压测和故障注入。Node22/24 Linux CI 配置已提供，但本机没有把 CI 定义视为已执行结果。因此当前交付是经过上述验证的发布候选，不能仅以单元测试宣称生产环境验收完成。

复现命令：`npm ci`、`npm run check`、`npm test`、准备指定上游源码后 `npm run test:host`。上游回归命令：`npx vitest run tests/panel-source.spec.tsx tests/panel-eval.spec.tsx tests/settings.spec.ts tests/registry.spec.ts tests/outbox.spec.ts`。
