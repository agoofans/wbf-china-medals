# 中国桥牌世界奖牌档案

这是一个无需后端、无需安装依赖的静态网站，可直接部署到 GitHub Pages。

## 发布方法

1. 新建一个 GitHub 仓库。
2. 将本目录内的全部文件上传到仓库根目录（不要只上传压缩包）。
3. 打开仓库的 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**。
5. 选择 `main` 分支和 `/ (root)`，保存。

GitHub 通常会在数分钟内生成公开网址。

## 文件说明

- `index.html`：页面结构与说明文字
- `styles.css`：页面样式
- `app.js`：筛选、分页、详情弹窗、奖牌趋势图和反馈表单
- `data.js`：由离线工作簿生成的静态数据
- `og.png`：社交分享预览图

更新数据时，在本地重新生成并替换 `data.js` 即可；网站本身不需要数据库。

页面底部的反馈表单通过 Web3Forms 直接发送给维护者，访问者无需登录 GitHub。
