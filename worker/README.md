# Jev 代理 / Jev bridge

这是供 GitHub Pages 使用的独立 Cloudflare Worker，已经部署并接入在线网站。访客选择 Jev 并勾选同意后，才会发送岛屿、天数和活动方式。以下步骤供重新部署或更换密钥时使用。

本次限流调整需要再次运行第 2 步部署 Worker 才会生效。

## 重新部署或更换密钥

1. **创建并登录 Cloudflare 账号。** 在 [Cloudflare](https://dash.cloudflare.com/sign-up) 注册并完成邮箱验证。电脑需要 Node.js 和 npm。打开终端，进入项目仓库根目录后运行：

   ```sh
   npx wrangler login
   ```

   按提示在浏览器授权 Cloudflare。若本机没有 Wrangler，`npx` 会提示下载它；这是由你自行确认的操作。

2. **部署 Worker。** 仍在仓库根目录运行：

   ```sh
   npx wrangler deploy --config worker/wrangler.toml
   ```

   如果账号提示创建 `workers.dev` 子域名，按 Cloudflare 的提示完成。保留命令输出里的 `https://…workers.dev` 地址。部署时 Worker 还没有密钥，推荐请求会返回不可用，这是正常的。

3. **设置 Worker secret。** 仍在仓库根目录运行：

   ```sh
   npx wrangler secret put TYPESAFE_API_KEY --config worker/wrangler.toml
   ```

   在 Wrangler 的隐藏输入提示中自行粘贴已有的 TypeSafe 密钥，按回车。不要把密钥写进命令、文件、聊天、截图或仓库。最后只把第 2 步得到的 Worker 地址发给 Codex，**不要发送密钥**；维护者会将该地址填入网站的 `JEV_API_BASE`、复测并推送。

Cloudflare Worker 和 Durable Objects 可能产生用量或费用；开通前请查看 Cloudflare 当前方案和额度。

## 行为与限制

- Worker 接收 `GET /api/capabilities` 和 `POST /api/jev/choice`；POST 只接受 `days`、`preference` 和可选 `island`，输入及推荐选项与 `outputs/jev-server.js` 一致。单次请求体最多 1024 字节。
- 只对 `https://dengletian702-rgb.github.io` 开放浏览器跨域请求，其他 `Origin` 会被拒绝；不接受 cookie 或跨域凭据。
- 每个 Cloudflare 识别的 IP 在滚动 60 秒内最多 10 次推荐请求；预检和能力查询不计入次数，但仍检查来源。SQLite Durable Object 按 IP 分配独立实例，以事务保存时间戳；限流不可用时请求会被拒绝。它不记录密钥、行程内容或原始 IP 日志。
- **Origin 不是身份认证**：非浏览器客户端可以伪造该请求头。限流能限制单个 IP 的请求，但不能阻止分布式滥用；请在 Cloudflare 和 TypeSafe 中关注使用量。
- 密钥只通过 Cloudflare Worker secret 提供给服务端；它不会写入网站脚本、仓库或接口响应。不要添加 `.dev.vars` 文件。

本地模拟测试（不请求真实 Jev，Node.js 22.7 或更新版本）：

```sh
node --test worker/test.mjs
```

参考：[Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/) · [Durable Object storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) · [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

---

## Redeployment or key rotation in English

1. **Create and sign in to Cloudflare.** Sign up at [Cloudflare](https://dash.cloudflare.com/sign-up), verify your email, and install Node.js 22.7 or newer and npm. From the repository root run:

   ```sh
   npx wrangler login
   ```

   Approve the browser prompt. If Wrangler is not installed, `npx` may ask you to download it.

2. **Deploy the Worker** from the repository root:

   ```sh
   npx wrangler deploy --config worker/wrangler.toml
   ```

   Follow Cloudflare's instructions to create a `workers.dev` subdomain if needed, and keep the displayed Worker URL. Until the secret is set, recommendation requests correctly return unavailable.

3. **Set the secret** from the repository root:

   ```sh
   npx wrangler secret put TYPESAFE_API_KEY --config worker/wrangler.toml
   ```

   Paste the existing TypeSafe key only into Wrangler's masked prompt. Never put it in a command, file, chat, screenshot, or repository. Send the Worker URL—not the key—to the maintainer to configure `JEV_API_BASE`, test, and publish the website change.

The deployed Worker is connected to the live site. Visitors must opt in before island, days and activity mode are sent. Run step 2 again to deploy the revised rate limit. Only recommendation POST requests count toward the ten-request rolling-minute limit per IP; preflight and capabilities requests still check origin but do not count. The Worker uses a SQLite Durable Object for the limit. Origin checks alone are not authentication; non-browser clients can forge an Origin header. Cloudflare usage may have limits or charges; review the current plan before deploying.
