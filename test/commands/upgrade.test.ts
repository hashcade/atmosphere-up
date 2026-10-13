import process from 'node:process'
import * as p from '@clack/prompts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runUpgradeCommand } from '../../src/commands'
import { getBundles, inspectOutput } from '../../src/core'
import { getAmiiboCatalog } from '../../src/extensions/amiibo-data'
import { buildUpgradePack, MODULE_GROUPS, resolveUpgradeResources } from '../../src/upgrade'

vi.mock('@clack/prompts', async original => ({
  ...await original<typeof import('@clack/prompts')>(),
  groupMultiselect: vi.fn(),
  multiselect: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), message: vi.fn(), stop: vi.fn(), error: vi.fn() })),
}))
vi.mock('../../src/extensions/amiibo-data', () => ({ getAmiiboCatalog: vi.fn() }))
vi.mock('../../src/core', async original => ({
  ...await original<typeof import('../../src/core')>(),
  inspectOutput: vi.fn(),
}))
vi.mock('../../src/upgrade', async original => ({
  ...await original<typeof import('../../src/upgrade')>(),
  resolveUpgradeResources: vi.fn(),
  buildUpgradePack: vi.fn(),
}))

const config = { cwd: '/workspace', output: '/workspace/output' }
const bundle = getBundles().find(bundle => bundle.labels.hos === '22.5.0')!

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(p.groupMultiselect).mockReset().mockResolvedValue(['dbi'])
  vi.mocked(p.multiselect).mockReset().mockResolvedValue([])
  vi.mocked(p.select).mockReset().mockResolvedValue(bundle)
  vi.mocked(p.confirm).mockReset().mockResolvedValue(false)
  vi.mocked(inspectOutput).mockReturnValue(false)
  vi.mocked(resolveUpgradeResources).mockReset().mockResolvedValue([])
  vi.mocked(buildUpgradePack).mockReset().mockResolvedValue()
  process.exitCode = 0
})

describe('runUpgradeCommand', () => {
  it('collects amiibo series for Emuiibo upgrades before resolving resources', async () => {
    const amiibo = { name: 'Chrom', amiiboSeries: 'Fire Emblem', head: '21080000', tail: '035d1202' }
    vi.mocked(getAmiiboCatalog).mockResolvedValue([amiibo])
    vi.mocked(p.groupMultiselect).mockResolvedValue(['emuiibo'])
    vi.mocked(p.multiselect).mockResolvedValue(['Fire Emblem'])

    await runUpgradeCommand(config)

    expect(p.multiselect).toHaveBeenCalledWith(expect.objectContaining({ message: 'select amiibo series (optional)', required: false }))
    expect(resolveUpgradeResources).toHaveBeenCalledWith(['emuiibo'], expect.objectContaining({ amiibos: [amiibo] }))
    expect(p.select).not.toHaveBeenCalled()
  })

  it('lists and preselects configured modules without requiring HOS', async () => {
    const extensions = [
      { name: 'mhgu-overlay', repository: 'jinghaihan/mhgu-overlay', assets: [{ name: 'mhgu-overlay.ovl', target: 'switch/.overlays/mhgu-overlay.ovl' }] },
      { name: 'feth-overlays', repository: '3096/feth-overlays', assets: [{ name: 'feth-overlays.zip' }] },
    ]
    vi.mocked(p.groupMultiselect).mockResolvedValue(['feth-overlays'])

    await runUpgradeCommand({ ...config, extensions, modules: ['mhgu-overlay'] })

    expect(p.groupMultiselect).toHaveBeenCalledWith(expect.objectContaining({
      initialValues: ['mhgu-overlay'],
      options: expect.objectContaining({
        'Configured Modules': [
          { value: 'mhgu-overlay', label: 'mhgu-overlay', hint: 'https://github.com/jinghaihan/mhgu-overlay' },
          { value: 'feth-overlays', label: 'feth-overlays', hint: 'https://github.com/3096/feth-overlays' },
        ],
      }),
    }))
    expect(resolveUpgradeResources).toHaveBeenCalledWith(['feth-overlays'], expect.objectContaining({ extensions }))
    expect(buildUpgradePack).toHaveBeenCalledWith(expect.objectContaining({ modules: ['feth-overlays'], directory: '/workspace/output/feth-overlays' }))
    expect(p.select).not.toHaveBeenCalled()
  })

  it('lists all modules with nothing preselected when no module arguments are supplied', async () => {
    await runUpgradeCommand(config)

    expect(p.groupMultiselect).toHaveBeenCalledWith(expect.objectContaining({
      options: MODULE_GROUPS,
      initialValues: [],
      required: false,
    }))
    expect(Object.keys(MODULE_GROUPS)).toEqual([
      'Core Modules',
      'Save Management',
      'File Management',
      'Cheats',
      'Performance Tuning',
      'Performance Monitoring',
      'Controller Support',
      'Streaming',
      'Amiibo',
      'Dependencies',
    ])
    expect(p.select).not.toHaveBeenCalled()
    expect(resolveUpgradeResources).toHaveBeenCalledWith(['dbi'], expect.objectContaining({ bundle: undefined }))
    expect(buildUpgradePack).toHaveBeenCalledWith(expect.objectContaining({
      modules: ['dbi'],
      directory: '/workspace/output/dbi',
    }))
  })

  it('preselects batch arguments but installs only the final interactive selection', async () => {
    vi.mocked(p.groupMultiselect).mockResolvedValue(['nx-shell'])

    await runUpgradeCommand({ ...config, modules: ['dbi', 'jksv'] })

    expect(p.groupMultiselect).toHaveBeenCalledWith(expect.objectContaining({ initialValues: ['dbi', 'jksv'] }))
    expect(resolveUpgradeResources).toHaveBeenCalledWith(['nx-shell'], expect.any(Object))
  })

  it('writes a combined ZIP for multiple modules', async () => {
    vi.mocked(p.groupMultiselect).mockResolvedValue(['dbi', 'jksv'])

    await runUpgradeCommand({ ...config, pack: true })

    expect(buildUpgradePack).toHaveBeenCalledWith(expect.objectContaining({
      modules: ['dbi', 'jksv'],
      directory: '/workspace/output/upgrade.zip',
      pack: true,
    }))
  })

  it('collects cheat settings once for multiple cheat tools before resolving releases', async () => {
    vi.mocked(p.groupMultiselect).mockResolvedValue(['edizon-overlay', 'breeze'])
    vi.mocked(p.confirm).mockImplementationOnce(async () => {
      expect(resolveUpgradeResources).not.toHaveBeenCalled()
      return false
    }).mockImplementationOnce(async () => {
      expect(resolveUpgradeResources).not.toHaveBeenCalled()
      return true
    })

    await runUpgradeCommand(config)

    expect(vi.mocked(p.confirm).mock.calls.map(([options]) => options.message)).toEqual([
      'enable cheats by default?',
      'remember cheat toggles?',
    ])
    expect(resolveUpgradeResources).toHaveBeenCalledWith(['edizon-overlay', 'breeze'], expect.objectContaining({
      cheats: { enabledByDefault: false, rememberToggles: true },
    }))
  })

  it('cancels a cheat settings prompt before resolving or downloading modules', async () => {
    vi.mocked(p.groupMultiselect).mockResolvedValue(['edizon-overlay'])
    vi.mocked(p.confirm).mockResolvedValueOnce(p.CANCEL_SYMBOL)

    await runUpgradeCommand(config)

    expect(resolveUpgradeResources).not.toHaveBeenCalled()
    expect(buildUpgradePack).not.toHaveBeenCalled()
    expect(p.outro).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(130)
  })

  it.each(['atmosphere', 'sigpatches', 'mission-control'])('selects HOS for %s before resolving any releases', async (module) => {
    vi.mocked(p.groupMultiselect).mockResolvedValue([module])
    vi.mocked(p.select).mockImplementationOnce(async () => {
      expect(resolveUpgradeResources).not.toHaveBeenCalled()
      return bundle
    })

    await runUpgradeCommand(config)

    expect(resolveUpgradeResources).toHaveBeenCalledWith([module], expect.objectContaining({ bundle }))
  })

  it('uses an explicit supported HOS without a HOS prompt', async () => {
    vi.mocked(p.groupMultiselect).mockResolvedValue(['mission-control'])

    await runUpgradeCommand({ ...config, version: '22.5.0' })

    expect(p.select).not.toHaveBeenCalled()
    expect(resolveUpgradeResources).toHaveBeenCalledWith(['mission-control'], expect.objectContaining({ bundle }))
  })

  it('stops without downloads when the selection is empty or cancelled', async () => {
    const selections: (unknown[] | typeof p.CANCEL_SYMBOL)[] = [[], p.CANCEL_SYMBOL]
    for (const selection of selections) {
      vi.mocked(p.groupMultiselect).mockResolvedValueOnce(selection)
      await runUpgradeCommand(config)
    }

    expect(resolveUpgradeResources).not.toHaveBeenCalled()
    expect(buildUpgradePack).not.toHaveBeenCalled()
  })

  it('rejects unknown module arguments before showing the selection', async () => {
    await expect(runUpgradeCommand({ ...config, modules: ['unknown'] })).rejects.toThrow('unknown module: unknown')
    expect(p.groupMultiselect).not.toHaveBeenCalled()
    expect(resolveUpgradeResources).not.toHaveBeenCalled()
  })

  it('confirms replacement before resolving releases', async () => {
    vi.mocked(inspectOutput).mockReturnValue(true)

    await runUpgradeCommand(config)

    expect(p.confirm).toHaveBeenCalled()
    expect(resolveUpgradeResources).not.toHaveBeenCalled()
    expect(buildUpgradePack).not.toHaveBeenCalled()
  })

  it('waits for cleanup when an active upgrade is cancelled', async () => {
    let cleaned = false
    vi.mocked(buildUpgradePack).mockImplementationOnce(async (task) => {
      vi.mocked(p.spinner).mock.calls[0][0]!.onCancel!()
      await Promise.resolve()
      cleaned = true
      task.signal!.throwIfAborted()
    })

    await runUpgradeCommand(config)

    expect(cleaned).toBe(true)
    expect(p.cancel).toHaveBeenCalledWith('upgrade cancelled; temporary files removed')
    expect(p.outro).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(130)
    process.exitCode = 0
  })
})
