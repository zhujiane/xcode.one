# Node library

Open node plugins. Built-in types stay in the app (`script`, `image`, `video`, `audio`, `stt`, `publish`).

Installable plugins use `schemaVersion: 2`: built-in presets are `.nodes.json`, custom code nodes are ZIP packages with a prebuilt `.cjs` entry. Install them through **插件与扩展 → 安装节点**.

| Plugin | Input → Output | Installation |
| --- | --- | --- |
| [提取视频尾帧](./video-last-frame/) | Video → PNG last frame | [Download ZIP](./video-last-frame/dist/xcode.video-last-frame-1.0.0.zip) |

`examples/` contains historical descriptors for reference, not directly installable v2 packages.
