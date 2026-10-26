# 插件迁移验证 · 2026-10-26

## 结果

已将主题组件转换为 Discourse 服务器插件，并安装到本机 `/home/x/projects/discourse/plugins/discourse-/`。不再使用 `themePrefix`、主题翻译结构或主题资源目录。

- 标题提取与分页的 10 项 Node 测试通过；GJS 和模板语法检查通过。
- Ruby 语法、RuboCop、Syntax Tree、ESLint 和 Stylelint 检查通过。
- Discourse `/tests?target=discourse-&filter=Reply%20directory` 中的 3 项浏览器验收测试通过，覆盖筛选、楼层链接、刷新、时间轴切换、手机展开与跳转后关闭、禁用开关。
- 实际开发论坛的桌面 1440 × 1000、窄屏 390 × 844 显示正常。用浏览器拦截目录读取请求提供示例回帖，确认只显示 #2 和 #4；没有新增或编辑论坛帖子。窄屏没有横向溢出。
- 开发容器没有 Chrome，`bin/qunit` 命令行入口无法启动浏览器；以上 3 项测试通过现有 Playwright 浏览器访问同一个 Discourse 测试入口完成。

## 本地状态与回退

新插件已默认开启。旧主题组件 `回帖标题目录 · Reply Titles`（ID 1）已停用，保留原内容和与 Foundation、Horizon 的关联，避免两套目录同时挂载。

本机目前只有一篇首帖、没有回帖的公开主题，因此正常页面会显示“还没有首行以 # 标记标题的回帖”；添加符合规则的回复后才会出现目录项。

迁移前目录备份：`/tmp/discourse-reply-titles-before-plugin-20261026/`。若需回退，应停止或关闭新插件，再从备份恢复原目录，并重新启用旧主题组件。开发服务使用现有 `bin/pitchfork` 的 `USR2` 重载机制；重载前应确认进程身份。

当前发布仓库为 `https://github.com/commune1871318/discourse-title`，可直接通过 HTTPS 克隆；正式部署时按 README 的插件安装方式操作。
