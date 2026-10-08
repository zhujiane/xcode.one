# 提取视频尾帧

`xcode.video-last-frame@1.0.1`，节点类型 `xcode.video-last-frame/extract`。

**输入一个视频 → 输出一张 PNG 尾帧图片**。完全在本机处理，无需模型、渠道配置或网络请求。输出自动保存到数字资产库，也可连接到图片生成等接受图片输入的节点。

## 本地安装

1. 下载或选择 [`dist/xcode.video-last-frame-1.0.1.zip`](./dist/xcode.video-last-frame-1.0.1.zip)；不要选择源码 ZIP 或单独的 manifest。
2. XCODE.ONE「插件与扩展」→「安装节点」，选择该 ZIP。
3. 核对预览中的「提取视频尾帧」，勾选「信任并安装代码」并安装。
4. 画布节点库添加「提取视频尾帧」，将已有视频节点的输出连接到「输入视频」，运行节点。
5. 「尾帧图片」输出可继续连接图片节点，或在素材库预览和导出。

一个节点每次接收一个上游视频输出；多个视频请分别使用多个尾帧节点。

## FFmpeg 与处理规则

- 自动使用 XCODE.ONE 已内置的 FFmpeg，无参数，无需填写路径或另外安装 FFmpeg。开发版复用应用工作目录中的 `ffmpeg-static`。
- ZIP 只包含清单、纯 JS 入口和许可证，不携带额外 FFmpeg，不安装或下载依赖。
- 选择第一个非封面视频轨道，完整解码直到结尾，保留最后实际显示的帧。不会把“倒数 1 秒”当尾帧，也不会自动跳过黑帧或片尾字幕。
- 保留原尺寸，遵循视频旋转元数据，使用无损 PNG 编码；不做裁剪、缩放或美化。
- 全量解码耗时随视频长度、分辨率增长；每次只保留一个临时输出图片，不缓存所有帧。宿主最长允许运行 20 分钟，支持取消；正常结束、报错和响应取消时清理本次临时文件，应用被强制关闭时可能残留临时文件。
- 损坏视频、只有音轨或没有可解码画面会报错，不返回伪造图片。用户原视频不修改、不删除。

实现依据：[FFmpeg 帧同步参数](https://ffmpeg.org/ffmpeg.html)、[image2 单文件更新输出](https://ffmpeg.org/ffmpeg-formats.html#image2-1)。

## 重新构建

需要 Node.js 22 或更高版本：

```powershell
cd node-library/video-last-frame
npm ci
npm run build
$env:FFMPEG_PATH = 'C:\tools\ffmpeg\bin\ffmpeg.exe'
npm run verify # 验证脚本的 FFMPEG_PATH 仅用于开发测试
```

发布修改时同时提升清单和 package.json 的版本，生成新的版本 ZIP，避免覆盖已经安装的 `id@version`。

## 1.0.1 更新

移除 FFmpeg 路径配置，直接复用宿主内置 FFmpeg。插件输出在下游被显示成文本的问题需要同步更新 XCODE.ONE 客户端；已有 1.0.0 尾帧输出仍可使用，无需删除素材。
