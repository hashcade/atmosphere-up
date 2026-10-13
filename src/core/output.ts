import type { TaskOptions } from '../types'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'pathe'
import tildify from 'tildify'
import { isParentDirectory } from '../utils'
import { compressArchive } from './archive'
import { configureOverlayOrder } from './overlays'

export function inspectOutput(directory: string, cwd: string): boolean {
  if (isParentDirectory(resolve(directory), resolve(cwd)))
    throw new Error('Output cannot be the working directory or one of its parents.')

  return existsSync(directory)
}

export interface OutputOptions extends TaskOptions {
  directory: string
  replace?: boolean
  populate: (staging: string) => Promise<void>
  pack?: boolean
  extra?: string
}

export async function writeOutput({ directory, replace = false, populate, pack = false, extra, signal, onProgress }: OutputOptions): Promise<void> {
  signal?.throwIfAborted()

  await mkdir(dirname(directory), { recursive: true })
  const temporary = await mkdtemp(join(dirname(directory), '.atmosphere-up-'))
  const staging = join(temporary, 'pack')

  try {
    await mkdir(staging)
    await populate(staging)

    signal?.throwIfAborted()
    onProgress?.('setting overlay order')
    await configureOverlayOrder(staging)

    signal?.throwIfAborted()
    if (extra) {
      onProgress?.(`merging extra files from ${tildify(extra)}`)
      await cp(extra, staging, {
        recursive: true,
        filter: () => {
          signal?.throwIfAborted()
          return true
        },
      })
    }

    signal?.throwIfAborted()
    const result = pack ? join(temporary, 'pack.zip') : staging
    if (pack) {
      onProgress?.('compressing pack into ZIP')
      await compressArchive(staging, result)
    }

    signal?.throwIfAborted()
    onProgress?.(`saving pack to ${tildify(directory)}`)
    if (replace)
      await rm(directory, { recursive: true, force: true })

    await rename(result, directory)
  }
  finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
