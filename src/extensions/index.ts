import type { Resource } from '../core/plan'
import type { Extension, ExtensionContext } from './types'
import * as p from '@clack/prompts'
import { AMIIBO_OPTIONS, promptAmiibo, promptAmiiboSettings, resolveAmiibo } from './amiibo'
import { CHEAT_OPTIONS, promptCheats, promptCheatSettings, resolveCheats } from './cheats'
import { CONTROLLER_SUPPORT_OPTIONS, promptControllerSupport, resolveControllerSupport } from './controller-support'
import { FILE_MANAGEMENT_OPTIONS, promptFileManagement, resolveFileManagement } from './file-management'
import { PERFORMANCE_MONITORING_OPTIONS, promptPerformanceMonitoring, resolvePerformanceMonitoring } from './performance-monitoring'
import { PERFORMANCE_TUNING_OPTIONS, promptPerformanceTuning, resolvePerformanceTuning } from './performance-tuning'
import { promptSaveManagement, resolveSaveManagement, SAVE_MANAGEMENT_OPTIONS } from './save-management'
import { promptStreaming, resolveStreaming, STREAMING_OPTIONS } from './streaming'

export * from './amiibo'
export * from './cheats'
export * from './configured'
export * from './controller-support'
export * from './file-management'
export * from './performance-monitoring'
export * from './performance-tuning'
export * from './save-management'
export * from './streaming'

export interface SelectedExtension {
  modules: string[]
  resolve: (context: ExtensionContext) => Promise<Resource[]>
}

export type ExtensionSelection = SelectedExtension[]

function defineExtension<T extends string>({ prompt, promptSettings, resolve, ...option }: Extension<T>) {
  return {
    ...option,
    promptSettings,
    selectModules: (modules: string[]): SelectedExtension => {
      const selected = modules.filter((module): module is T => option.options.some(item => item.value === module))

      return { modules: selected, resolve: context => resolve(selected, context) }
    },
    select: async (controller: AbortController): Promise<SelectedExtension> => {
      const modules = await prompt(controller)
      const settings = modules.length ? await promptSettings?.(controller) : undefined

      return { modules, resolve: context => resolve(modules, { ...context, ...settings }) }
    },
  }
}

const extensions = [
  defineExtension({
    value: 'save-management',
    options: SAVE_MANAGEMENT_OPTIONS,
    label: 'Save Management',
    initialSelected: true,
    prompt: promptSaveManagement,
    resolve: resolveSaveManagement,
  }),
  defineExtension({
    value: 'file-management',
    options: FILE_MANAGEMENT_OPTIONS,
    label: 'File Management',
    initialSelected: true,
    prompt: promptFileManagement,
    resolve: resolveFileManagement,
  }),
  defineExtension({
    value: 'cheats',
    options: CHEAT_OPTIONS,
    label: 'Cheats',
    initialSelected: true,
    prompt: promptCheats,
    promptSettings: async controller => ({ cheats: await promptCheatSettings(controller) }),
    resolve: resolveCheats,
  }),
  defineExtension({
    value: 'performance-tuning',
    options: PERFORMANCE_TUNING_OPTIONS,
    label: 'Performance Tuning',
    prompt: promptPerformanceTuning,
    resolve: resolvePerformanceTuning,
  }),
  defineExtension({
    value: 'performance-monitoring',
    options: PERFORMANCE_MONITORING_OPTIONS,
    label: 'Performance Monitoring',
    prompt: promptPerformanceMonitoring,
    resolve: resolvePerformanceMonitoring,
  }),
  defineExtension({
    value: 'controller-support',
    options: CONTROLLER_SUPPORT_OPTIONS,
    label: 'Controller Support',
    prompt: promptControllerSupport,
    resolve: resolveControllerSupport,
  }),
  defineExtension({
    value: 'streaming',
    options: STREAMING_OPTIONS,
    label: 'Streaming',
    prompt: promptStreaming,
    resolve: resolveStreaming,
  }),
  defineExtension({
    value: 'amiibo',
    options: AMIIBO_OPTIONS,
    label: 'Amiibo',
    prompt: promptAmiibo,
    promptSettings: promptAmiiboSettings,
    resolve: resolveAmiibo,
  }),
]

export async function promptExtensions(controller: AbortController): Promise<ExtensionSelection> {
  const categories = await p.multiselect({
    message: 'select optional module categories',
    options: extensions.map(({ value, label }) => ({ value, label })),
    initialValues: extensions.filter(extension => extension.initialSelected).map(extension => extension.value),
    required: false,
    signal: controller.signal,
  })

  if (p.isCancel(categories)) {
    controller.abort()
    throw controller.signal.reason
  }

  const selection: ExtensionSelection = []

  for (const extension of extensions) {
    if (categories.includes(extension.value))
      selection.push(await extension.select(controller))
  }

  return selection
}

export async function resolveExtensions(selection: ExtensionSelection, context: ExtensionContext = {}): Promise<Resource[]> {
  const resources: Resource[] = []

  for (const extension of selection) {
    if (extension.modules.length)
      resources.push(...await extension.resolve({ ...context, resources: [...context.resources ?? [], ...resources] }))
  }

  return resources
}

export function getExtensionGroups() {
  return Object.fromEntries(extensions.map(({ label, options }) => [label, options]))
}

export async function promptExtensionSettings(modules: string[], controller: AbortController): Promise<Partial<ExtensionContext>> {
  const settings: Partial<ExtensionContext> = {}

  for (const extension of extensions) {
    if (extension.promptSettings && extension.options.some(option => modules.includes(option.value)))
      Object.assign(settings, await extension.promptSettings(controller))
  }

  return settings
}

export async function resolveSelectedExtensions(modules: string[], context: ExtensionContext = {}): Promise<Resource[]> {
  return resolveExtensions(extensions.map(extension => extension.selectModules(modules)), context)
}
