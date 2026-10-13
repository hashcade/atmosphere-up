import type { Resource } from '../core/plan'
import type { ExtensionContext } from './types'
import { cp, rm } from 'node:fs/promises'
import * as p from '@clack/prompts'
import { join } from 'pathe'
import { EXTENSION_REPO_CONFIG } from '../constants'
import { getRelease } from '../download'
import { getRepositoryUrl, selectAsset } from '../utils'
import { generateAmiibos, getAmiiboCatalog } from './amiibo-data'

export type AmiiboTool = 'emuiibo'

export const AMIIBO_OPTIONS = [
  { value: 'emuiibo', label: 'Emuiibo', hint: getRepositoryUrl(EXTENSION_REPO_CONFIG.emuiibo) },
] satisfies { value: AmiiboTool, label: string, hint: string }[]

export async function resolveAmiibo(modules: AmiiboTool[], { signal, onProgress, amiibos = [] }: ExtensionContext = {}): Promise<Resource[]> {
  const resources: Resource[] = []

  for (const module of modules) {
    signal?.throwIfAborted()

    onProgress?.(`resolving ${module} (latest)`)
    const release = await getRelease(EXTENSION_REPO_CONFIG[module], undefined, signal)

    resources.push({
      module,
      release: release.tag_name,
      page: release.html_url,
      asset: selectAsset(release, /^emuiibo\.zip$/),
      configure: async (directory) => {
        const source = join(directory, 'SdOut')
        await cp(source, directory, { recursive: true })
        await rm(source, { recursive: true })

        await generateAmiibos(amiibos, directory, { signal, onProgress })
      },
    })
  }

  return resources
}

export async function promptAmiiboSettings(controller: AbortController): Promise<Partial<ExtensionContext>> {
  const spinner = p.spinner({ onCancel: () => controller.abort() })
  spinner.start('loading amiibo series')

  let entries
  try {
    entries = await getAmiiboCatalog(controller.signal)
    spinner.stop('amiibo series loaded')
  }
  catch (error) {
    spinner.error('failed to load amiibo series')
    throw error
  }

  const series = [...new Set(entries.map(entry => entry.amiiboSeries))].sort((a, b) => a.localeCompare(b, 'en'))
  const selected = await p.multiselect({
    message: 'select amiibo series (optional)',
    options: series.map(name => ({ value: name, label: name })),
    initialValues: [],
    required: false,
    signal: controller.signal,
  })

  if (p.isCancel(selected)) {
    controller.abort()
    throw controller.signal.reason
  }

  return { amiibos: entries.filter(entry => selected.includes(entry.amiiboSeries)) }
}

export async function promptAmiibo(controller: AbortController): Promise<AmiiboTool[]> {
  const module = await p.select<AmiiboTool>({
    message: 'select amiibo tool',
    initialValue: 'emuiibo',
    signal: controller.signal,
    options: AMIIBO_OPTIONS,
  })

  if (p.isCancel(module)) {
    controller.abort()
    throw controller.signal.reason
  }

  return [module]
}
