'use strict'

const { spawn } = require('node:child_process')
const { existsSync } = require('node:fs')
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises')
const { createRequire } = require('node:module')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')

function findFfmpeg(config) {
  if (config.ffmpegPath?.trim()) return config.ffmpegPath.trim()
  const executable = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  if (process.resourcesPath) {
    const bundled = join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', executable)
    if (existsSync(bundled)) return bundled
  }
  // Development mode and unpacked distributions may resolve the existing host dependency.
  const roots = [process.cwd(), process.resourcesPath && join(process.resourcesPath, 'app.asar')].filter(Boolean)
  for (const root of roots) {
    try {
      const hostRequire = createRequire(resolve(root, 'package.json'))
      const binary = hostRequire('ffmpeg-static')?.replace('app.asar', 'app.asar.unpacked')
      if (binary && existsSync(binary)) return binary
    } catch {
      // The host dependency is optional; try PATH below.
    }
  }
  return executable
}

function extract(binary, source, target, signal) {
  signal.throwIfAborted()
  return new Promise((resolveTask, reject) => {
    // Decode through EOF. Overwriting a single PNG retains the final displayed frame,
    // including delayed B-frames, without keeping all decoded frames in memory.
    const args = [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-xerror',
      '-i', source, '-map', '0:V:0', '-an', '-sn', '-dn',
      '-fps_mode', 'passthrough', '-c:v', 'png', '-pix_fmt', 'rgba',
      '-f', 'image2', '-update', '1', target
    ]
    const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    let spawnError
    const abort = () => child.kill()
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-4000) })
    child.on('error', error => { spawnError = error })
    child.on('close', code => {
      signal.removeEventListener('abort', abort)
      if (signal.aborted) return reject(signal.reason || new Error('尾帧提取已取消'))
      if (spawnError) return reject(new Error('无法启动 FFmpeg，请在高级设置填写可执行文件的完整路径，或将 FFmpeg 加入系统 PATH。'))
      if (code !== 0) return reject(new Error(`视频尾帧提取失败：${stderr.trim().slice(-1000) || `FFmpeg 退出码 ${code}`}`))
      resolveTask()
    })
  })
}

exports.execute = async context => {
  if (context.nodeType !== 'xcode.video-last-frame/extract') throw new Error(`未知节点类型：${context.nodeType}`)
  const videos = context.inputs.video || []
  if (videos.length !== 1 || videos[0].kind !== 'video' || !videos[0].assetId) {
    throw new Error('请连接一个视频素材到「输入视频」端口。')
  }
  const { signal } = context
  signal.throwIfAborted()
  context.progress(0.05, '读取视频素材')
  const media = await context.assets.read(videos[0].assetId)
  signal.throwIfAborted()
  const bytes = Buffer.from(media.base64, 'base64')
  if (!bytes.length) throw new Error('输入视频为空')
  const directory = await mkdtemp(join(tmpdir(), 'xcode-last-frame-'))
  try {
    const source = join(directory, 'input.video')
    const target = join(directory, 'last-frame.png')
    await writeFile(source, bytes)
    signal.throwIfAborted()
    context.progress(0.15, '解码视频，提取最后一帧')
    await extract(findFfmpeg(context.config), source, target, signal)
    signal.throwIfAborted()
    let image
    try {
      image = await readFile(target)
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('视频没有可解码的画面，无法提取尾帧')
      throw error
    }
    if (!image.length) throw new Error('视频尾帧为空')
    context.progress(0.9, '保存尾帧到素材库')
    signal.throwIfAborted()
    const asset = await context.assets.write({
      mimeType: 'image/png',
      name: `video-last-frame-${videos[0].assetId}.png`,
      base64: image.toString('base64')
    })
    signal.throwIfAborted()
    context.progress(1, '尾帧提取完成')
    return { image: [{ kind: 'image', value: null, assetId: asset.id }] }
  } finally {
    // Only remove the unique temporary directory created by this execution.
    await rm(directory, { recursive: true, force: true })
  }
}
