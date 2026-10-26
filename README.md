# 回帖标题目录 · Discourse 插件

把主题帖下首行以单个 `#` 标记标题的回复汇总到右侧，按楼层排列；点击标题跳到对应回复。普通文字首行不进入目录。

例如，回复内容是：

```text
#第三章：我们为什么阅读

这一章让我想到……
```

侧边目录显示 `#2 第三章：我们为什么阅读`，不显示标题标记。也支持标准 Markdown 写法 `# 第三章：我们为什么阅读`，插件不修改正文。

## 安装到 Discourse

这是服务器插件，不再通过“外观 → 主题”安装，也不需要关联到某个主题。若曾安装同名主题组件，请先从当前主题中移除，避免显示两份目录。

### 本地开发环境

将本项目的 `plugin.rb`、`assets/`、`config/` 放在 Discourse 的同一个插件目录中，例如：

```text
discourse/plugins/discourse-/
├── plugin.rb
├── assets/
└── config/
```

文件夹名可以继续使用现有的 `discourse-`，但本机 Discourse 会提示它与插件标识不同；新安装建议使用 `discourse-reply-titles`。不要同时在两个文件夹下安装本插件。

重启 Discourse 的 Rails 服务及前端开发服务，然后刷新页面。后台站点设置中搜索 `reply_titles_enabled`；默认开启，关闭后刷新页面即可恢复原生布局。

### Docker 生产环境

将插件仓库加入 `/var/discourse/containers/app.yml` 的现有 `hooks → after_code → exec → cmd` 列表：

```yaml
- git clone https://github.com/commune1871318/discourse-title.git discourse-reply-titles
```

该命令应在现有的 `/var/www/discourse/plugins` 工作目录中执行。当前仓库为公开仓库，可以直接使用 HTTPS 地址克隆，无需 Deploy Key 或访问令牌。

然后在 `/var/discourse` 运行 `./launcher rebuild app`。重建会短暂中断论坛，应在合适的维护时间执行。

也可以运行 `npm run package`，解压 `dist/discourse-reply-titles-plugin.tar.gz` 到 Discourse 的 `plugins/` 目录。压缩包内自带 `discourse-reply-titles/` 文件夹；这是插件源码包，不能上传到主题页面。容器化部署仍需保证插件进入构建配置，以免下次重建时丢失。

插件通过当前访客的会话读取主题，不需要 API Key，也不增加服务器接口；沿用论坛现有的主题访问权限。

## 显示与更新规则

- 首帖不进入目录；正常回帖从 `#2` 起按实际楼层排序，不因删除而重新编号。
- 只有首行使用单个 `#` 的标题才进入目录，兼容 `#文字` 和 `# 文字`；目录去除标记与行内格式，保留文字与表情。第一行按作者换行识别，不按浏览器自动折行识别。
- 普通文字、纯图片、空标题、`##` 等其他级别标题，以及出现在后续行、引用、列表或代码块中的标题不进入目录；系统动作、隐藏和已删除回复也不列入目录。
- 读取整个主题，不限于当前滚动到的回帖；缺少的正文每次最多读取 20 条，顺序请求。大主题会逐步显示，并在完成前标注“正在读取全部回帖…”。超大主题无完整 ID 流时采用楼层游标分页。
- 桌面宽度达到 925px 且原生时间轴可显示时，在右侧显示目录，提供“切换到时间轴”入口。手机及窄屏在正文上方显示可展开目录，保留原生进度条。
- 新回复改变主题的最新楼层或最后回复时间时自动重载目录。旧回复编辑、删除后可点击“刷新目录”立即重新提取。
- 请求失败时保留已取得的标题，并明确提示目录尚未完整；点击“刷新目录”重试。

## 本地检查与打包

```sh
npm ci
npm test
npm run check:templates
npm run package
```

产物：`dist/discourse-reply-titles-plugin.tar.gz`。测试覆盖标题提取、跨批次完整读取、失败、取消、刷新和超大主题分页。`check:templates` 检查 GJS、JavaScript 与模板内部语法，不替代 Discourse 中的运行验证。

Discourse 内的浏览器验收测试位于 `test/javascripts/acceptance/reply-directory-test.js`，覆盖桌面目录、时间轴切换、刷新、手机展开与楼层跳转，以及禁用开关。可以打开开发站点的 `/tests?target=discourse-reply-titles&filter=Reply%20directory` 运行；`target` 使用实际安装文件夹名，本机现有目录应填 `discourse-`。

本次迁移的验证与本地回退方法见 [验证记录](docs/verification.md)。

使用现代 Discourse 的 `api.renderInOutlet`、Glimmer 组件与 `TrackedMediaQuery`，最低兼容版本尚未确定。首次在其他站点启用时，请检查超过 20 条回复的主题、点击未加载楼层、时间轴切换、手机展开，以及已有目录组件是否占用同一侧栏。

## 实现入口

- `plugin.rb`：插件入口、站点设置开关和样式注册。
- `config/settings.yml`、`config/locales/`：站点设置和中英文翻译。
- `assets/javascripts/discourse/lib/reply-titles.js`：首行提取、完整主题分页。
- `assets/javascripts/discourse/components/reply-directory.gjs`：目录、刷新、楼层跳转。
- `assets/javascripts/discourse/api-initializers/reply-directory.gjs`：右侧和窄屏挂载。
- `assets/stylesheets/reply-directory.scss`：沿用当前主题颜色与字号。

仅用 `api.decorateCookedElement()` 扫描正文会遗漏尚未加载的回复，因此这里通过主题 JSON 和帖子批量接口建立完整目录，用官方插件挂载点显示。
