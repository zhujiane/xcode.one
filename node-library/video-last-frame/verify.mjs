import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, writeFile, rm, readdir, mkdir, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'

const run = promisify(execFile)
const root = fileURLToPath(new URL('.', import.meta.url))
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
const directory = await mkdtemp(join(tmpdir(), 'last-frame-verify-'))
const resourcesPath = process.resourcesPath
process.resourcesPath = join(directory, 'resources')
await mkdir(join(process.resourcesPath, 'app.asar.unpacked', 'node_modules'), { recursive: true })
await symlink(dirname(resolve(ffmpeg)), join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static'), process.platform === 'win32' ? 'junction' : 'dir')
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
const archive = unzipSync(await readFile(join(root, 'dist', `${manifest.id}-${manifest.version}.zip`)))
assert.deepEqual(Object.keys(archive).sort(), ['LICENSE', 'dist/executor.cjs', 'manifest.json'])
await mkdir(join(directory, 'dist'))
await writeFile(join(directory, manifest.entry), archive[manifest.entry])
const { execute } = createRequire(import.meta.url)(join(directory, manifest.entry))
const assetId = '11111111-1111-4111-8111-111111111111'
const outputId = '22222222-2222-4222-8222-222222222222'
const temporaryDirs = async () => (await readdir(tmpdir())).filter(name => name.startsWith('xcode-last-frame-')).sort()
const before = await temporaryDirs()
let saved
function context(bytes, overrides = {}) {
  saved = undefined
  return {
    nodeType: manifest.nodes[0].type,
    config: {},
    inputs: { video: [{ kind: 'video', value: null, assetId }] },
    signal: new AbortController().signal,
    progress() {},
    assets: {
      async read(id) { assert.equal(id, assetId); return { mimeType: 'video/mp4', base64: bytes.toString('base64') } },
      async write(image) { saved = image; return { id: outputId, kind: 'image' } }
    },
    ...overrides
  }
}

try {
  const width = 64, height = 48
  // Six distinguishable frames; the final blue frame differs from the opening red frame.
  const pixels = Buffer.alloc(width * height * 3 * 6)
  for (let frame = 0; frame < 6; frame++) {
    for (let pixel = 0; pixel < width * height; pixel++) {
      const offset = (frame * width * height + pixel) * 3
      pixels[offset + Math.floor(frame / 2)] = 255
    }
  }
  const raw = join(directory, 'source.rgb')
  await writeFile(raw, pixels)
  for (const [name, frames, filters] of [
    ['b-frames', 6, []],
    ['variable-rate', 6, ['-vf', 'setpts=N*N/(10*TB)', '-fps_mode', 'vfr']],
    ['single-frame', 1, []]
  ]) {
    const video = join(directory, `${name}.mp4`)
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgb24',
      '-video_size', `${width}x${height}`, '-framerate', '10', '-i', raw, ...filters,
      '-frames:v', String(frames), '-c:v', 'libx264', '-bf', '2', '-pix_fmt', 'yuv420p', video], { windowsHide: true })
    const bytes = await readFile(video)
    const result = await execute(context(bytes))
    assert.deepEqual(result, { image: [{ kind: 'image', value: null, assetId: outputId }] })
    assert.equal(saved.mimeType, 'image/png')
    const output = Buffer.from(saved.base64, 'base64')
    assert.equal(output.readUInt32BE(16), width)
    assert.equal(output.readUInt32BE(20), height)
    const expected = join(directory, 'expected.png')
    // Independent oracle: select the known last frame index of the decoded test video.
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', video,
      '-vf', `select=eq(n\\,${frames - 1})`, '-frames:v', '1', '-c:v', 'png', '-pix_fmt', 'rgba', expected], { windowsHide: true })
    assert.deepEqual(output, await readFile(expected), `${name}: output must equal last decoded frame`)
    console.log(`PASS ${name}: exact last frame, original size, media output contract`)
  }
  await assert.rejects(execute(context(Buffer.from('invalid video'))), /提取失败/)
  await assert.rejects(execute(context(Buffer.alloc(0))), /为空/)
  await assert.rejects(execute(context(pixels, { inputs: {} })), /连接一个视频/)
  const bundledResources = process.resourcesPath
  process.resourcesPath = join(directory, 'missing-resources')
  await assert.rejects(execute(context(pixels)), /未找到 XCODE.ONE 内置 FFmpeg/)
  process.resourcesPath = bundledResources
  const controller = new AbortController()
  await assert.rejects(execute(context(await readFile(join(directory, 'b-frames.mp4')), {
    signal: controller.signal,
    progress(value) { if (value === 0.15) setTimeout(() => controller.abort(), 5) }
  })), error => error.name === 'AbortError')
  assert.equal(saved, undefined, 'cancelled execution must not import an image')
  assert.deepEqual(await temporaryDirs(), before, 'execution must clean temporary files')
  console.log('PASS invalid/empty/missing input, missing FFmpeg, active cancellation, temporary file cleanup')
} finally {
  process.resourcesPath = resourcesPath
  await rm(directory, { recursive: true, force: true })
}
