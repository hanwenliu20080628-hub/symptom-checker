# symptom-checker — 项目指南

Web 症状自诊系统：点击 3D 人体模型部位 → 分诊问卷 → DeepSeek LLM 分析 → 输出健康科普与就医指引。
线上：https://symptom-checker-app.netlify.app（前端 Netlify 静态导出 + Netlify Functions 后端）

## 技术栈
- Next.js 16.3（`next.config.ts` 里 `output: "export"` 静态导出）+ React 19 + TypeScript + Tailwind CSS v4
- Three.js / @react-three/fiber + drei（3D 人体模型 `public/models/shaded版本.glb`，约 7.8MB，按肌肉群着色，白点 marker 定位；解剖学左右约定：**解剖右 = 负 x，解剖左 = 正 x**）
- DeepSeek API：`deepseek-v4-flash` + `thinking: {type:"enabled"}` + `reasoning_effort:"low"` + `max_tokens: 4000`（思考模式勿设 temperature）。CoT 在 `reasoning_content`，最终答案在 `content`。
- 统计：Supabase（新加坡，`tfeereouyxkhvvrieiud.supabase.co`）

## 架构与数据流
- 后端逻辑三处同源，**改一处必须同步其余**：
  1. `netlify/functions/analyze.mjs` — 生产环境（承载 /api/analyze）
  2. `src/app/api/analyze/route.ts` — 本地 dev
  3. `server/index.js` — 旧 Railway 备份，一般不动
- 门禁链（顺序）：AccessGate（访问码 `20261234`，前端硬编码软门槛）→ ConsentGate（当前源码v1.4同意弹窗）→ 主界面 → 点击部位 → SurveyConsentModal（数据分享同意门禁）→ TriageQuestionnaire（23 题 6 区；RED 危险信号拦截，不进 AI）→ /api/analyze → DeepSeek → ResultPanel
- 关键文件：
  - `src/lib/prompt.ts` — 系统提示词（`{{boundary}}`/`{{bodyPart}}`/`{{symptoms}}` 占位符，替换顺序 boundary→bodyPart→symptoms，boundary 用 crypto 随机串防注入）
  - `src/lib/ai-guard.ts` — 共享校验层（parseTriage / hitRedFlag / enforce / hasBanned / fallbackResult / parseAIResponse）
  - `src/lib/triage.ts` — 分诊规则（RED/YELLOW/GREEN）
  - `src/lib/{analytics,consent,access}.ts` — 统计 / 同意 / 访问码
  - `src/components/{ResultPanel,Tracker,ConsentGate,AccessGate,SurveyConsentModal}.tsx` 等
  - `scripts/test-analyze-guard.mjs` — 校验层自测（13 项）
  - 文档：`AI分析链路说明.md`、`提示词重构-功能变更清单.md`

## 输出契约与合规红线（重要）
- 9 字段契约：symptomSummary / commonFactors / careTips / whenToSeeDoctor / department / questionsForDoctor / urgentNotice / disclaimer + severity（low/medium/high）。
- **零劝医（绿/黄）**：low/medium 全文禁止"就医/去医院/看医生/就诊"话术；whenToSeeDoctor 只允许条件句（"出现……时"）；只有 high 才能出现"尽快就医"。徽章文案：low="就医紧迫度：较低"，medium="一般护理参考"，high="建议尽快就医"。
- severity 只升不降（后端 enforce 兜底）；**身体部位名称本身不构成危险信号**——胸部≠胸痛（内脏性胸痛才升 high；运动诱发的胸壁肌肉痛不升）。
- 违禁词触发重试一次，仍违禁 → 走兜底结果（不展示 AI 原文）。
- `parseTriage` 只认 symptoms 以【分诊问卷】开头（前端拼接规则），手写伪造分诊标记一律按未分诊处理。
- 合规文档：免责声明 v1.1、问卷数据分享同意书 → `~/Desktop/物理治疗的网站/`。

## 修改与验证流程
1. 改完必须 `npm run build` 通过（静态导出 7 页无错）。
2. 涉及提示词/校验层：跑 `node scripts/test-analyze-guard.mjs`（13/13）+ **真实 AI 双向验证**（该升 high 的要升、不该升的不升）——mock 覆盖不到提示词级行为。
3. 本地 dev：`npm run dev`（localhost:3000，用户固定用这个端口验收）。

## 部署 SOP（照此执行）

- 用户同步偏好（2026-10-18）：网站修改并本地验证完成后，主动询问“要不要将这次更新同步到 GitHub 和 Netlify？”，提醒千问需单独更新。未获本次授权前不推送/部署；已有本次明确授权时按范围执行，不重复询问。
1. 构建：`npm run build`（产出 `out/`）。
2. push GitHub：
   - remote：https://github.com/hanwenliu20080628-hub/symptom-checker.git（credential.helper=store 已配）
   - **必须覆盖四个代理变量**（见全局 AGENTS.md，只覆盖大写会 502）
   - ⚠️ **新文件必须 git add**——历史上漏提交新文件导致 CI 干净环境 build 失败（Module not found）。push 前 `git status` 检查。
   - 若改动含 `.github/workflows/`：PAT 缺 workflow scope，HTTPS push 会被拒；改用 SSH deploy key：
     `GIT_SSH_COMMAND="ssh -i ~/.ssh/symptom_checker_deploy -o StrictHostKeyChecking=no" git push git@github.com:hanwenliu20080628-hub/symptom-checker.git main`
3. Netlify 手动部署（GitHub Actions 自动部署因 `NETLIFY_AUTH_TOKEN` secret 失效已停用）：
   - **必须 cd 到项目根目录再执行**（CLI 按 cwd 找 netlify.toml；在错误目录执行会只传静态文件、functions 和 redirects 全丢，线上 /api/analyze 回退成 index.html）
   - 命令：`netlify deploy --dir=out --prod --no-build --site 1274bdd3-3234-4862-accc-a45698e38c15`（无全局 CLI 时用 `npx -y netlify-cli` 替换 netlify）
   - 登录态：`~/Library/Preferences/netlify/config.json`（账号 hanwenliu20080628@gmail.com）
   - ✅ 成功标志：日志出现 `Functions path:` 和 `1 functions`
   - 网络：netlify API 可直连（清代理执行更稳）
4. 线上验证：curl 首页 → 找 `_next/static/chunks/*.js` hash → 与本地 `out/` 对比一致；必要时在 chunk 里搜功能文案确认新版已上线。
5. `DEEPSEEK_API_KEY` 存 Netlify 站点环境变量（`netlify env:set`），绝不暴露。

## 平台镜像
- 千问等镜像站用 `out/` 手动上传，**不会自动同步**；官网更新后需提醒用户重新上传。API 地址已内置源码（`NEXT_PUBLIC_API_URL ?? 线上默认地址`），任何环境重建不丢。
- 千问站点 `https://p7muvdem.qwenwork.host/` 的百度访问统计已由用户在千问办公发布V14（2026-10-18）；当前本地v1.4已增加分析失败评分入口、单次可选的百度评分分享、对应声明，待千问办公再次发布。配置在 `src/config/analytics.ts`，公开统计ID为 `2138d9c7fb6fa400bf733ee2e6f4da48`。
- BaiduTracker 在访问码通过、当前v1.4参与说明同意后启动，仅目标域名首页生效；关闭自动PV后每次文档加载手动记一次PV，刷新可再计，不等待Supabase或AI。Netlify主站、本地、stats/disclaimer页不启用。
- FeedbackSurvey 在分析成功或失败后显示一次；百度分享默认不勾选，仅本次单独勾选后上报 `["_trackEvent", "使用体验", "提交评分", "good"|"ok"|"bad"]`，不附部位、评论、问卷、症状或错误详情。未勾选仍可提交原自建反馈；重新查询清空评分、评论、分享状态。两路统计异常隔离，同次连击防重，不按访客永久去重。
- 关键回归：`node scripts/test-baidu-analytics.mjs`（37项）。本次千问发布读取共享目录的新 `out/`，无需部署Netlify或改AI接口；千问办公与Codex共用工作区，由用户在千问办公要求更新原站点。发布前后核对 `output/baidu-qwen-20261018/构建清单.json`；本地隔离验证不代表百度后台已收录。

## 待办 / 已知问题
- 【待实施】统计上报在大陆被 SNI 阻断（Supabase 直连 RST、被 `.catch(()=>{})` 静默吞掉，需开 VPN 才记录）：拟加 Netlify Function `/api/track` 代理转发（用现有 anon key，RLS 已放通 anon insert，无需 service_role）；`src/lib/analytics.ts` 的 SB_URL 改为可配置代理地址（与 NEXT_PUBLIC_API_URL 同模式）；netlify.toml 加 redirect（须在 SPA 回退之前）；dev 加 `src/app/api/track/route.ts`。
- 【待测】DeepSeek `response_format: json_object` 在思考模式下的兼容性（未最终启用）。
- GitHub Actions 部署：更新 `NETLIFY_AUTH_TOKEN` secret 后可恢复自动部署。

## 历史资料
- 每日工作日志（2026-08 起，含详细部署记录与踩坑）：`/Users/mingdiliu/Desktop/workbuddy1/.workbuddy/memory/`；提炼后的长期结论在同目录 `MEMORY.md`。
