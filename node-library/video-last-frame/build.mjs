import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { zipSync } from 'fflate'

const root = fileURLToPath(new URL('.', import.meta.url))
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
await mkdir(join(root, 'dist'), { recursive: true })
// No third-party runtime dependencies: this CommonJS source is directly executable.
await copyFile(join(root, 'src/executor.cjs'), join(root, manifest.entry))
const entries = ['manifest.json', manifest.entry, 'LICENSE']
const files = Object.fromEntries(await Promise.all(entries.map(async name => [name, await readFile(join(root, name))])))
const archive = zipSync(files)
const output = join(root, 'dist', `${manifest.id}-${manifest.version}.zip`)
await writeFile(output, archive)
console.log(`Created ${output} (${archive.length} bytes)`)
