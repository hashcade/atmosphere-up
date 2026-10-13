import { mkdir, writeFile } from 'node:fs/promises'
import { stringify } from 'ini'
import { dirname, join } from 'pathe'
import { glob } from 'tinyglobby'
import { OVERLAY_ORDER } from '../constants'

export async function configureOverlayOrder(directory: string): Promise<void> {
  const installed = await glob('switch/.overlays/*.ovl', { cwd: directory, dot: true })
  const overlays = OVERLAY_ORDER.filter(filename => installed.includes(`switch/.overlays/${filename}`))

  if (!overlays.length)
    return

  const content = overlays.map((filename, index) => stringify({ priority: index + 1 }, { section: filename })).join('\n')
  const path = join(directory, 'config/ultrahand/overlays.ini')

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}
