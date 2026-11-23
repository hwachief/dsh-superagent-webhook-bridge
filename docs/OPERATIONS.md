# 部署与故障处理

首次部署先备份现有 profile 及 stateDir。停止宿主后复制整个目录，或使用 SQLite 在线备份；不要在写入期间只复制 db 文件而忽略 WAL。

默认回环监听，经已有 HTTPS 代理暴露 `/hooks/`；建议代理也设置请求体上限、连接限流及15秒读超时，不要连带开放宿主管理 API。先建立测试来源，在 observe 验证原生评估记录，再按业务规则使用 auto。

## 调用示例

密钥通过部署者环境变量提供：

```powershell
$headers = @{ 'X-Webhook-Key' = $env:WEBHOOK_SECRET }
$event = @{ id = [guid]::NewGuid().ToString(); event = 'file.created'; sender = 'openlist'; text = '请处理测试文件'; payload = @{ data = @{ path = '/test/report.pdf' } } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:9088/hooks/documents' -Headers $headers -ContentType 'application/json' -Body $event
```

429/503 重试相同原始事件，不要每次生成新 ID。公网使用 HTTPS。确认 queued → stored 后再检查原生评估、工单和执行输出；启用回调的业务需验证接收方签名及幂等。

| 症状            | 检查                                                      |
| --------------- | --------------------------------------------------------- |
| 无 Webhook 来源 | 插件开关、orchestrator 就绪及健康项重复注册               |
| 只有表格        | 是否适配、重建、重启了正确宿主                            |
| 401             | 密钥、签名字节、时钟和轮换期                              |
| filtered        | 事件订阅、字段路径、条件取值位置                          |
| queued 不动     | setup、来源总开关、独立开关和数据库可写性                 |
| dead            | 修复宿主接收失败后调用认证 retry 端点                     |
| stored 无工单   | 自动发送者应为 来源ID:sender、评估模式和规则              |
| 回调失败        | 域名名单、公网 DNS、TLS、网络及接收方2xx                  |
| inbox_capacity  | 回执总量及积压载荷，保留期限、容量配置；勿直接删除 queued |

收件箱位于宿主 KV 前缀 `webhook-bridge:v1:receipt:`，包含业务载荷，沿用宿主磁盘和备份访问权限。错误响应和正常日志不输出密钥与原始载荷；发送方应主动去除不必要的敏感数据。

卸载前停止新流量，等待 queued 清空。数据保留，可重装恢复。先撤销前端适配并重建，再删除前端包依赖。升级需备份并在测试 profile 验证；不支持的上游结构不得强行替换。

容量限制只覆盖插件收件箱；宿主原生触发器、工单、日志、Outbox 的保留和监控由宿主负责。本包不提供独立 HA、多副本消费及任意工单状态轮询协议。
