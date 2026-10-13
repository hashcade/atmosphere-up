import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import { join, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { afterEach, describe, expect, it } from 'vitest'
import { writeOutput } from '../../src/core'

const cwd = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const fixture = join(cwd, 'test/fixtures/.generated/output')
const directory = join(fixture, 'pack')

afterEach(() => rm(fixture, { recursive: true, force: true }))

describe('writeOutput', () => {
  it('preserves an existing pack on a download or extraction failure', async () => {
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'original'), 'keep')
    await expect(writeOutput({ directory, replace: true, populate: async (staging) => {
      await writeFile(join(staging, 'partial'), 'incomplete')
      throw new Error('Download failed')
    } })).rejects.toThrow('Download failed')
    expect(await readFile(join(directory, 'original'), 'utf8')).toBe('keep')
    expect(await glob('.atmosphere-up-*', { cwd: fixture, onlyDirectories: true, dot: true })).toEqual([])
  })

  it('replaces an existing pack only after the new pack is complete', async () => {
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'original'), 'old')
    await writeOutput({ directory, replace: true, populate: async (staging) => {
      expect(await readFile(join(directory, 'original'), 'utf8')).toBe('old')
      await writeFile(join(staging, 'new'), 'complete')
    } })
    expect(await glob('**/*', { cwd: directory })).toEqual(['new'])
  })

  it('writes a ZIP with SD card contents at the root, including hidden overlay folders', async () => {
    const destination = `${directory}.zip`
    await writeOutput({ directory: destination, pack: true, populate: async (staging) => {
      await mkdir(join(staging, 'switch/.overlays'), { recursive: true })
      await writeFile(join(staging, 'switch/.overlays/ovlmenu.ovl'), 'overlay')
      await writeFile(join(staging, 'payload.bin'), 'payload')
    } })
    const archive = new AdmZip(destination)
    expect(archive.readAsText('switch/.overlays/ovlmenu.ovl')).toBe('overlay')
    expect(archive.readAsText('payload.bin')).toBe('payload')
    expect(await glob('.atmosphere-up-*', { cwd: fixture, onlyDirectories: true, dot: true })).toEqual([])
  })

  it('removes partial files after cancellation without replacing the existing pack', async () => {
    const controller = new AbortController()
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'original'), 'keep')
    await expect(writeOutput({ directory, replace: true, populate: async (staging) => {
      await writeFile(join(staging, 'partial'), 'incomplete')
      controller.abort()
    }, pack: true, signal: controller.signal })).rejects.toThrow('aborted')
    expect(await readFile(join(directory, 'original'), 'utf8')).toBe('keep')
    expect(await glob('.atmosphere-up-*', { cwd: fixture, onlyDirectories: true, dot: true })).toEqual([])
  })

  it.each([false, true])('merges extra files last while preserving directories and the source with pack=%s', async (pack) => {
    const extra = join(fixture, 'personal')
    await mkdir(join(extra, 'config/JKSV'), { recursive: true })
    await mkdir(join(extra, 'switch/.overlays'), { recursive: true })
    await mkdir(join(extra, 'atmosphere/contents/game/cheats'), { recursive: true })
    const settings = JSON.stringify({ ExportToZip: 1 })
    await writeFile(join(extra, 'config/JKSV/JKSV.json'), settings)
    await mkdir(join(extra, 'config/ultrahand'), { recursive: true })
    await writeFile(join(extra, 'config/ultrahand/overlays.ini'), '[ovlEdiZon.ovl]\npriority=8\n')
    await writeFile(join(extra, 'switch/.overlays/personal.ovl'), 'personal overlay')
    await writeFile(join(extra, 'atmosphere/contents/game/cheats/build.txt'), 'personal cheat')
    await writeFile(join(extra, 'atmosphere/contents/game/cheats/toggles.txt'), 'personal toggles')
    const sourceFiles = await glob('**/*', { cwd: extra, dot: true, onlyFiles: true })

    await writeOutput({ directory: `${directory}${pack ? '.zip' : ''}`, pack, extra, populate: async (staging) => {
      await mkdir(join(staging, 'config/JKSV'), { recursive: true })
      await mkdir(join(staging, 'switch/.overlays'), { recursive: true })
      await writeFile(join(staging, 'config/JKSV/JKSV.json'), JSON.stringify({ ExportToZip: 0, HoldForDeletion: 0 }))
      await writeFile(join(staging, 'config/JKSV/keep.txt'), 'keep')
      await writeFile(join(staging, 'switch/.overlays/ovlmenu.ovl'), 'core overlay')
      await writeFile(join(staging, 'switch/.overlays/ovlEdiZon.ovl'), 'cheat overlay')
    } })

    const expected = {
      'config/JKSV/JKSV.json': settings,
      'config/JKSV/keep.txt': 'keep',
      'config/ultrahand/overlays.ini': '[ovlEdiZon.ovl]\npriority=8\n',
      'switch/.overlays/ovlmenu.ovl': 'core overlay',
      'switch/.overlays/personal.ovl': 'personal overlay',
      'atmosphere/contents/game/cheats/build.txt': 'personal cheat',
      'atmosphere/contents/game/cheats/toggles.txt': 'personal toggles',
    }

    if (pack) {
      const archive = new AdmZip(`${directory}.zip`)
      for (const [path, content] of Object.entries(expected))
        expect(archive.readAsText(path)).toBe(content)

      expect(archive.getEntry('personal/')).toBeNull()
    }
    else {
      for (const [path, content] of Object.entries(expected))
        expect(await readFile(join(directory, path), 'utf8')).toBe(content)
    }

    expect(await readFile(join(extra, 'config/JKSV/JKSV.json'), 'utf8')).toBe(settings)
    expect((await glob('**/*', { cwd: extra, dot: true, onlyFiles: true })).sort()).toEqual(sourceFiles.sort())
  })

  it('preserves an existing output and cleans staging when extra copying is cancelled', async () => {
    const controller = new AbortController()
    const extra = join(fixture, 'personal')
    await mkdir(extra, { recursive: true })
    await writeFile(join(extra, 'extra.txt'), 'personal file')
    await mkdir(directory)
    await writeFile(join(directory, 'original'), 'keep')

    await expect(writeOutput({
      directory,
      replace: true,
      extra,
      signal: controller.signal,
      onProgress: (message) => {
        if (message.startsWith('merging extra files'))
          controller.abort()
      },
      populate: async (staging) => {
        await writeFile(join(staging, 'new'), 'new pack')
      },
    })).rejects.toThrow('aborted')

    expect(await readFile(join(directory, 'original'), 'utf8')).toBe('keep')
    expect(await readFile(join(extra, 'extra.txt'), 'utf8')).toBe('personal file')
    expect(await glob('.atmosphere-up-*', { cwd: fixture, onlyDirectories: true, dot: true })).toEqual([])
  })

  it.each([false, true])('orders only installed built-in overlays with consecutive priorities and pack=%s', async (pack) => {
    const destination = `${directory}${pack ? '.zip' : ''}`

    await writeOutput({ directory: destination, pack, populate: async (staging) => {
      await mkdir(join(staging, 'switch/.overlays'), { recursive: true })
      for (const filename of ['sys-patch-overlay.ovl', 'ovlEdiZon.ovl', 'breezehand.ovl', 'Status-Monitor-Deux.ovl', 'ovlmenu.ovl', 'mhgu-overlay.ovl', 'feth-overlay.ovl'])
        await writeFile(join(staging, 'switch/.overlays', filename), 'overlay')
    } })

    const path = 'config/ultrahand/overlays.ini'
    const content = pack ? new AdmZip(destination).readAsText(path) : await readFile(join(destination, path), 'utf8')

    expect(content).toBe('[ovlEdiZon.ovl]\npriority=1\n\n[breezehand.ovl]\npriority=2\n\n[Status-Monitor-Deux.ovl]\npriority=3\n\n[sys-patch-overlay.ovl]\npriority=4\n')
  })
})
