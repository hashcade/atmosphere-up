import type { Resource } from '../core/plan'
import type { TaskOptions } from '../types'
import type { AmiiboEntry } from './amiibo-data'
import type { CheatSettings } from './cheats'

export interface ExtensionContext extends TaskOptions {
  hos?: string
  resources?: Resource[]
  cheats?: CheatSettings
  amiibos?: AmiiboEntry[]
}

export interface Extension<T extends string> {
  value: string
  label: string
  initialSelected?: boolean
  options: { value: T, label: string, hint: string }[]
  prompt: (controller: AbortController) => Promise<T[]>
  promptSettings?: (controller: AbortController) => Promise<Partial<ExtensionContext>>
  resolve: (modules: T[], context?: ExtensionContext) => Promise<Resource[]>
}
