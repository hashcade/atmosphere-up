import { homedir } from 'node:os'
import { join as nativeJoin, normalize as nativeNormalize } from 'node:path'
import process from 'node:process'
import { stripVTControlCharacters } from 'node:util'
import * as p from '@clack/prompts'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runCommand } from '../../src/commands'
import { resolveConfig } from '../../src/config'
import { buildPack, getBundles, inspectOutput, resolveResources } from '../../src/core'
import { resolveAmiibo, resolveCheats, resolveControllerSupport, resolveFileManagement, resolvePerformanceMonitoring, resolvePerformanceTuning, resolveSaveManagement, resolveStreaming } from '../../src/extensions'
import { resolveSaltyNx } from '../../src/extensions/dependencies'
import { resolveFirmware } from '../../src/firmware'

vi.mock('@clack/prompts', async original => ({
  ...await original<typeof import('@clack/prompts')>(),
  intro: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), message: vi.fn(), stop: vi.fn(), error: vi.fn() })),
}))
vi.mock('../../src/config', () => ({ resolveConfig: vi.fn() }))
vi.mock('../../src/firmware', async original => ({
  ...await original<typeof import('../../src/firmware')>(),
  resolveFirmware: vi.fn(),
}))
vi.mock('../../src/extensions/amiibo', async original => ({
  ...await original<typeof import('../../src/extensions/amiibo')>(),
  resolveAmiibo: vi.fn(),
}))
vi.mock('../../src/extensions/amiibo-data', () => ({
  getAmiiboCatalog: vi.fn(async () => [{ name: 'Chrom', amiiboSeries: 'Fire Emblem', head: '21080000', tail: '035d1202' }]),
}))
vi.mock('../../src/extensions/controller-support', async original => ({
  ...await original<typeof import('../../src/extensions/controller-support')>(),
  resolveControllerSupport: vi.fn(),
}))
vi.mock('../../src/extensions/save-management', async original => ({
  ...await original<typeof import('../../src/extensions/save-management')>(),
  resolveSaveManagement: vi.fn(),
}))
vi.mock('../../src/extensions/cheats', async original => ({
  ...await original<typeof import('../../src/extensions/cheats')>(),
  resolveCheats: vi.fn(),
}))
vi.mock('../../src/extensions/file-management', async original => ({
  ...await original<typeof import('../../src/extensions/file-management')>(),
  resolveFileManagement: vi.fn(),
}))
vi.mock('../../src/extensions/performance-tuning', async original => ({
  ...await original<typeof import('../../src/extensions/performance-tuning')>(),
  resolvePerformanceTuning: vi.fn(),
}))
vi.mock('../../src/extensions/performance-monitoring', async original => ({
  ...await original<typeof import('../../src/extensions/performance-monitoring')>(),
  resolvePerformanceMonitoring: vi.fn(),
}))
vi.mock('../../src/extensions/streaming', async original => ({
  ...await original<typeof import('../../src/extensions/streaming')>(),
  resolveStreaming: vi.fn(),
}))
vi.mock('../../src/extensions/dependencies', () => ({ resolveSaltyNx: vi.fn() }))
vi.mock('../../src/core', async original => ({
  ...await original<typeof import('../../src/core')>(),
  inspectOutput: vi.fn(),
  resolveResources: vi.fn(),
  buildPack: vi.fn(),
}))

const bundle = getBundles().find(bundle => bundle.labels.hos === '21.2.0')!
const categories = ['save-management', 'file-management', 'cheats', 'performance-tuning', 'performance-monitoring', 'controller-support', 'streaming', 'amiibo']

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(p.select).mockReset()
  vi.mocked(p.confirm).mockReset()
  vi.mocked(p.multiselect).mockReset()
  vi.mocked(buildPack).mockReset()
  process.exitCode = 0
  vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', output: '/workspace/output', ext: true, firmware: true, pack: false })
  vi.mocked(p.select).mockResolvedValue(bundle)
  vi.mocked(p.confirm).mockResolvedValue(false)
  vi.mocked(p.multiselect).mockResolvedValue([])
  vi.mocked(inspectOutput).mockReturnValue(false)
  vi.mocked(resolveResources).mockResolvedValue([])
  vi.mocked(resolveSaveManagement).mockResolvedValue([{ module: 'jksv' }] as Awaited<ReturnType<typeof resolveSaveManagement>>)
  vi.mocked(resolveCheats).mockResolvedValue([])
  vi.mocked(resolvePerformanceTuning).mockResolvedValue([])
  vi.mocked(resolveStreaming).mockResolvedValue([])
  vi.mocked(resolveControllerSupport).mockResolvedValue([])
  vi.mocked(resolveSaltyNx).mockResolvedValue({ module: 'salty-nx' } as Awaited<ReturnType<typeof resolveSaltyNx>>)
  vi.mocked(resolvePerformanceMonitoring).mockResolvedValue([{ module: 'status-monitor' }] as Awaited<ReturnType<typeof resolvePerformanceMonitoring>>)
  vi.mocked(resolveFileManagement).mockResolvedValue([{ module: 'nx-shell' }] as Awaited<ReturnType<typeof resolveFileManagement>>)
  vi.mocked(resolveAmiibo).mockResolvedValue([{ module: 'emuiibo' }] as Awaited<ReturnType<typeof resolveAmiibo>>)
  vi.mocked(buildPack).mockResolvedValue()
  vi.mocked(resolveFirmware).mockResolvedValue({ module: 'firmware' } as Awaited<ReturnType<typeof resolveFirmware>>)
})

describe('runCommand', () => {
  it('passes configured extensions to the build even when built-in optional modules are disabled', async () => {
    const extensions = [{ name: 'mhgu-overlay', repository: 'jinghaihan/mhgu-overlay', assets: [{ name: 'mhgu-overlay.ovl', target: 'switch/.overlays/mhgu-overlay.ovl' }] }]
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', ext: false, firmware: false, extensions })

    await runCommand({ ext: false })

    expect(buildPack).toHaveBeenCalledWith(expect.objectContaining({ extensions, onCoreReady: undefined }))
    expect(p.multiselect).not.toHaveBeenCalled()
  })

  it.each([false, true])('offers the selected firmware after components are installed with ext=%s', async (ext) => {
    const selected = ext ? bundle : getBundles().find(bundle => bundle.labels.hos === '22.0.0')!
    let componentsInstalled = false
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', ext, firmware: true, version: ext ? undefined : selected.labels.hos })
    vi.mocked(p.confirm).mockImplementation(async (options) => {
      if (options.message.startsWith('download firmware')) {
        expect(componentsInstalled).toBe(true)
        return true
      }

      return false
    })
    vi.mocked(buildPack).mockImplementationOnce(async (options) => {
      await options.onCoreReady?.()
      componentsInstalled = true
      expect(await options.onExtensionsReady!()).toEqual([{ module: 'firmware' }])
    })

    await runCommand({})

    expect(resolveFirmware).toHaveBeenCalledWith(selected.labels.hos, expect.any(Object))
    expect(p.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ message: `download firmware for HOS ${selected.labels.hos}?` }))
    expect(p.select).toHaveBeenCalledTimes(ext ? 1 : 0)
  })

  it('skips firmware prompts and releases when firmware is disabled', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', ext: false, firmware: false })
    vi.mocked(buildPack).mockImplementationOnce(async (options) => {
      expect(options.onExtensionsReady).toBeUndefined()
    })

    await runCommand({ firmware: false })

    expect(p.confirm).not.toHaveBeenCalled()
    expect(resolveFirmware).not.toHaveBeenCalled()
  })

  it('finishes without firmware when the download is declined', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', ext: false, firmware: true })
    vi.mocked(buildPack).mockImplementationOnce(async (options) => {
      expect(await options.onExtensionsReady!()).toEqual([])
    })

    await runCommand({})

    expect(resolveFirmware).not.toHaveBeenCalled()
    expect(p.outro).toHaveBeenCalled()
  })

  it('cancels the build when the firmware prompt is cancelled', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', ext: false, firmware: true })
    vi.mocked(p.confirm).mockResolvedValueOnce(p.CANCEL_SYMBOL)
    vi.mocked(buildPack).mockImplementationOnce(async (options) => {
      await options.onExtensionsReady!()
    })

    await runCommand({})

    expect(resolveFirmware).not.toHaveBeenCalled()
    expect(p.outro).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(130)
    process.exitCode = 0
  })

  it.each([false, true])('skips all extension prompts and releases with ext disabled and pack=%s', async (pack) => {
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', output: '/workspace/output', ext: false, pack })
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      expect(task!.onCoreReady).toBeUndefined()
    })

    await runCommand({ ext: false, pack })

    expect(resolveResources).toHaveBeenCalledWith(bundle, expect.any(Object))
    expect(buildPack).toHaveBeenCalledWith(expect.objectContaining({ bundle, resources: [], directory: `/workspace/output/atmosphere-1.10.2-hos-21.2.0${pack ? '.zip' : ''}`, replace: false, pack }))
    expect(p.select).toHaveBeenCalledTimes(1)
    expect(p.confirm).not.toHaveBeenCalled()
    expect(p.multiselect).not.toHaveBeenCalled()
    expect(resolveSaveManagement).not.toHaveBeenCalled()
    expect(resolveCheats).not.toHaveBeenCalled()
    expect(resolveFileManagement).not.toHaveBeenCalled()
    expect(resolvePerformanceTuning).not.toHaveBeenCalled()
    expect(resolvePerformanceMonitoring).not.toHaveBeenCalled()
    expect(resolveSaltyNx).not.toHaveBeenCalled()
    expect(resolveStreaming).not.toHaveBeenCalled()
    expect(resolveAmiibo).not.toHaveBeenCalled()
    expect(resolveControllerSupport).not.toHaveBeenCalled()
    expect(p.outro).toHaveBeenCalled()
  })

  it('collects all extension choices before resolving releases and defaults only EdiZon Overlay', async () => {
    vi.mocked(p.select).mockResolvedValueOnce(bundle).mockResolvedValueOnce('jksv').mockImplementationOnce(async () => {
      expect(resolveSaveManagement).not.toHaveBeenCalled()
      expect(resolveCheats).not.toHaveBeenCalled()
      expect(resolveFileManagement).not.toHaveBeenCalled()
      return 'nx-shell'
    }).mockImplementationOnce(async () => {
      expect(resolveSaveManagement).not.toHaveBeenCalled()
      expect(resolveCheats).not.toHaveBeenCalled()
      expect(resolveFileManagement).not.toHaveBeenCalled()
      expect(resolvePerformanceTuning).not.toHaveBeenCalled()
      expect(resolvePerformanceMonitoring).not.toHaveBeenCalled()
      expect(resolveSaltyNx).not.toHaveBeenCalled()
      return 'status-monitor'
    }).mockImplementationOnce(async () => {
      expect(resolveSaveManagement).not.toHaveBeenCalled()
      expect(resolveCheats).not.toHaveBeenCalled()
      expect(resolveFileManagement).not.toHaveBeenCalled()
      expect(resolvePerformanceTuning).not.toHaveBeenCalled()
      expect(resolvePerformanceMonitoring).not.toHaveBeenCalled()
      expect(resolveStreaming).not.toHaveBeenCalled()
      expect(resolveAmiibo).not.toHaveBeenCalled()
      expect(resolveControllerSupport).not.toHaveBeenCalled()
      return 'emuiibo'
    })
    vi.mocked(p.multiselect)
      .mockResolvedValueOnce([...categories].reverse())
      .mockResolvedValueOnce(['edizon-overlay', 'breezehand'])
      .mockResolvedValueOnce(['sys-clk', 'sys-clk-overlay-ultrahand', 'fps-locker', 'reverse-nx-rt'])
      .mockResolvedValueOnce(['mission-control', 'sys-con'])
      .mockResolvedValueOnce(['moonlight-switch', 'sys-dvr'])
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      expect(p.confirm).not.toHaveBeenCalled()
      await task!.onCoreReady!()
    })

    await runCommand({})

    expect(p.confirm).toHaveBeenCalledTimes(2)
    expect(vi.mocked(p.multiselect).mock.calls[0][0]).toMatchObject({
      message: 'select optional module categories',
      required: false,
      initialValues: ['save-management', 'file-management', 'cheats'],
      options: [
        { value: 'save-management', label: 'Save Management' },
        { value: 'file-management', label: 'File Management' },
        { value: 'cheats', label: 'Cheats' },
        { value: 'performance-tuning', label: 'Performance Tuning' },
        { value: 'performance-monitoring', label: 'Performance Monitoring' },
        { value: 'controller-support', label: 'Controller Support' },
        { value: 'streaming', label: 'Streaming' },
        { value: 'amiibo', label: 'Amiibo' },
      ],
    })
    const messages = [p.select, p.multiselect, p.confirm].flatMap(prompt => vi.mocked(prompt).mock.calls.map(([options], index) => ({
      message: options.message,
      order: vi.mocked(prompt).mock.invocationCallOrder[index],
    }))).sort((a, b) => a.order - b.order).map(call => call.message)
    expect(messages).toEqual([
      'select HOS version',
      'select optional module categories',
      'select save manager',
      'select file manager',
      'select cheat tools',
      'enable cheats by default?',
      'remember cheat toggles?',
      'select performance tools',
      'select performance monitor',
      'select controller tools',
      'select streaming tools',
      'select amiibo tool',
      'select amiibo series (optional)',
    ])
    expect(p.multiselect).toHaveBeenCalledWith(expect.objectContaining({
      initialValues: ['edizon-overlay'],
      options: [
        { value: 'edizon-overlay', label: 'EdiZon Overlay', hint: 'https://github.com/proferabg/EdiZon-Overlay' },
        { value: 'edizon-se', label: 'EdiZon SE', hint: 'https://github.com/tomvita/EdiZon-SE' },
        { value: 'breeze', label: 'Breeze', hint: 'https://github.com/tomvita/Breeze-Beta' },
        { value: 'breezehand', label: 'Breezehand Overlay', hint: 'https://github.com/tomvita/Breezehand-Overlay' },
      ],
    }))
    expect(p.select).toHaveBeenCalledWith(expect.objectContaining({
      message: 'select file manager',
      initialValue: 'nx-shell',
      options: [{ value: 'nx-shell', label: 'NX Shell', hint: 'https://github.com/DefenderOfHyrule/NX-Shell' }],
    }))
    expect(p.multiselect).toHaveBeenCalledWith(expect.objectContaining({
      message: 'select performance tools',
      initialValues: ['sys-clk', 'sys-clk-overlay-ultrahand', 'fps-locker', 'reverse-nx-rt'],
      options: [
        { value: 'sys-clk', label: 'Sys Clk', hint: 'https://github.com/retronx-team/sys-clk' },
        { value: 'sys-clk-overlay-ultrahand', label: 'Sys Clk Overlay Ultrahand', hint: 'https://github.com/ppkantorski/sys-clk' },
        { value: 'horizon-oc', label: 'Horizon OC', hint: 'https://github.com/Horizon-OC/Horizon-OC' },
        { value: 'fps-locker', label: 'FPS Locker', hint: 'https://github.com/masagrator/FPSLocker' },
        { value: 'reverse-nx-rt', label: 'ReverseNx RT', hint: 'https://github.com/masagrator/ReverseNX-RT' },
        { value: 'fizeau', label: 'Fizeau', hint: 'https://github.com/averne/Fizeau' },
      ],
    }))
    expect(p.select).toHaveBeenCalledWith(expect.objectContaining({
      message: 'select performance monitor',
      initialValue: 'status-monitor',
      options: [
        { value: 'status-monitor', label: 'Status Monitor', hint: 'https://github.com/ppkantorski/Status-Monitor-Overlay' },
        { value: 'status-monitor-deux', label: 'Status Monitor Deux', hint: 'https://github.com/masagrator/Status-Monitor-Deux' },
      ],
    }))
    expect(resolvePerformanceMonitoring).toHaveBeenCalledWith(['status-monitor'], expect.any(Object))
    expect(resolvePerformanceTuning).toHaveBeenCalledWith(['sys-clk', 'sys-clk-overlay-ultrahand', 'fps-locker', 'reverse-nx-rt'], expect.objectContaining({ hos: '21.2.0' }))
    expect(resolveFileManagement).toHaveBeenCalledWith(['nx-shell'], expect.any(Object))
    expect(vi.mocked(resolveFileManagement).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(resolveCheats).mock.invocationCallOrder[0])
    expect(resolveSaveManagement).toHaveBeenCalledWith(['jksv'], expect.any(Object))
    expect(resolveCheats).toHaveBeenCalledWith(['edizon-overlay', 'breezehand'], expect.objectContaining({
      cheats: { enabledByDefault: false, rememberToggles: false },
    }))
    expect(p.multiselect).toHaveBeenCalledWith(expect.objectContaining({
      message: 'select streaming tools',
      initialValues: ['moonlight-switch', 'sys-dvr'],
      options: [
        { value: 'moonlight-switch', label: 'Moonlight Switch', hint: 'https://github.com/XITRIX/Moonlight-Switch' },
        { value: 'sys-dvr', label: 'SysDVR', hint: 'https://github.com/exelix11/SysDVR' },
      ],
    }))
    expect(resolveStreaming).toHaveBeenCalledWith(['moonlight-switch', 'sys-dvr'], expect.any(Object))
    expect(p.select).toHaveBeenLastCalledWith(expect.objectContaining({
      message: 'select amiibo tool',
      initialValue: 'emuiibo',
      options: [{ value: 'emuiibo', label: 'Emuiibo', hint: 'https://github.com/XorTroll/emuiibo' }],
    }))
    expect(resolveAmiibo).toHaveBeenCalledWith(['emuiibo'], expect.any(Object))
    expect(p.multiselect).toHaveBeenCalledWith(expect.objectContaining({
      message: 'select controller tools',
      initialValues: ['mission-control', 'sys-con'],
      options: [
        { value: 'mission-control', label: 'Mission Control', hint: 'https://github.com/ndeadly/MissionControl' },
        { value: 'sys-con', label: 'Sys Con', hint: 'https://github.com/o0Zz/sys-con' },
      ],
    }))
    expect(resolveControllerSupport).toHaveBeenCalledWith(['mission-control', 'sys-con'], expect.objectContaining({ hos: '21.2.0' }))
  })

  it.each(['categories', ...categories])('cancels from %s before resolving optional releases', async (category) => {
    vi.mocked(p.select).mockResolvedValueOnce(bundle).mockResolvedValue(p.CANCEL_SYMBOL)
    vi.mocked(p.multiselect).mockResolvedValueOnce(category === 'categories' ? p.CANCEL_SYMBOL : [category]).mockResolvedValue(p.CANCEL_SYMBOL)
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      await task.onCoreReady!()
    })

    await runCommand({})

    expect(resolveSaveManagement).not.toHaveBeenCalled()
    expect(resolveFileManagement).not.toHaveBeenCalled()
    expect(resolveCheats).not.toHaveBeenCalled()
    expect(resolvePerformanceTuning).not.toHaveBeenCalled()
    expect(resolvePerformanceMonitoring).not.toHaveBeenCalled()
    expect(resolveControllerSupport).not.toHaveBeenCalled()
    expect(resolveStreaming).not.toHaveBeenCalled()
    expect(resolveAmiibo).not.toHaveBeenCalled()
    expect(p.outro).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(130)
    process.exitCode = 0
  })

  it('does not resolve earlier choices when a later category is cancelled', async () => {
    vi.mocked(p.multiselect).mockResolvedValueOnce(['save-management', 'file-management', 'cheats']).mockResolvedValueOnce(p.CANCEL_SYMBOL)
    vi.mocked(p.select).mockResolvedValueOnce(bundle).mockResolvedValueOnce('jksv').mockResolvedValueOnce('nx-shell')
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      await task.onCoreReady!()
    })

    await runCommand({})

    expect(resolveSaveManagement).not.toHaveBeenCalled()
    expect(resolveFileManagement).not.toHaveBeenCalled()
    expect(resolveCheats).not.toHaveBeenCalled()
    expect(p.outro).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(130)
    process.exitCode = 0
  })

  it('skips all category prompts and downloads when no categories are selected', async () => {
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      expect(p.confirm).not.toHaveBeenCalled()
      expect(await task!.onCoreReady!()).toEqual([])
    })

    await runCommand({})

    expect(resolveSaveManagement).not.toHaveBeenCalled()
    expect(p.select).toHaveBeenCalledTimes(1)
    expect(p.multiselect).toHaveBeenCalledTimes(1)
    expect(p.confirm).not.toHaveBeenCalled()
    expect(resolveCheats).not.toHaveBeenCalled()
    expect(resolveFileManagement).not.toHaveBeenCalled()
    expect(resolveAmiibo).not.toHaveBeenCalled()
    expect(resolvePerformanceTuning).not.toHaveBeenCalled()
    expect(resolvePerformanceMonitoring).not.toHaveBeenCalled()
    expect(resolveControllerSupport).not.toHaveBeenCalled()
    expect(resolveStreaming).not.toHaveBeenCalled()
    expect(p.outro).toHaveBeenCalled()
  })

  it.each(['jksv', 'checkpoint'] as const)('selects %s after the core pack is assembled, with JKSV as the default', async (module) => {
    vi.mocked(p.multiselect).mockResolvedValueOnce(['save-management'])
    vi.mocked(p.select).mockResolvedValueOnce(bundle).mockResolvedValueOnce(module)
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      expect(p.confirm).not.toHaveBeenCalled()
      await task!.onCoreReady!()
    })

    await runCommand({})

    expect(resolveSaveManagement).toHaveBeenCalledWith([module], expect.any(Object))
    expect(vi.mocked(p.select).mock.calls[1][0]).toMatchObject({
      initialValue: 'jksv',
      options: [
        { value: 'jksv', hint: 'https://github.com/J-D-K/JKSV' },
        { value: 'checkpoint', hint: 'https://github.com/BernardoGiordano/Checkpoint' },
      ],
    })
  })

  it.each(['status-monitor', 'status-monitor-deux'] as const)('includes %s independently of performance tuning', async (module) => {
    vi.mocked(p.multiselect).mockResolvedValueOnce(['performance-monitoring'])
    vi.mocked(p.select).mockResolvedValueOnce(bundle).mockResolvedValueOnce(module)
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      await task!.onCoreReady!()
    })

    await runCommand({})

    expect(resolvePerformanceTuning).not.toHaveBeenCalled()
    expect(resolvePerformanceMonitoring).toHaveBeenCalledWith([module], expect.any(Object))
    expect(resolvePerformanceMonitoring).toHaveBeenCalledWith([module], expect.objectContaining({ resources: [] }))
    expect(p.multiselect).toHaveBeenCalledTimes(1)
  })

  it('reuses SaltyNX from performance tuning for the selected monitor', async () => {
    vi.mocked(p.select).mockResolvedValueOnce(bundle).mockResolvedValueOnce('status-monitor')
    vi.mocked(p.multiselect).mockResolvedValueOnce(['performance-tuning', 'performance-monitoring']).mockResolvedValueOnce(['fps-locker'])
    vi.mocked(resolvePerformanceTuning).mockResolvedValue([{ module: 'salty-nx' }] as Awaited<ReturnType<typeof resolvePerformanceTuning>>)
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      const resources = await task!.onCoreReady!()
      expect(resources.filter(resource => resource.module === 'salty-nx')).toHaveLength(1)
    })

    await runCommand({})

    expect(resolveSaltyNx).not.toHaveBeenCalled()
    expect(resolvePerformanceMonitoring).toHaveBeenCalledWith(['status-monitor'], expect.objectContaining({ resources: [{ module: 'salty-nx' }] }))
  })

  it.each(['21.2.0', '23.0.0'])('uses the requested HOS %s without prompting', async (version) => {
    const selected = getBundles().find(bundle => bundle.labels.hos === version)!
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', output: '/workspace/output', pack: false, version })
    await runCommand({ version })
    expect(p.select).not.toHaveBeenCalled()
    expect(resolveResources).toHaveBeenCalledWith(selected, expect.any(Object))
    expect(vi.mocked(buildPack).mock.calls[0][0].bundle).toBe(selected)
  })

  it('rejects an unsupported HOS version before checking output or querying GitHub', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ version: '99.0.0' })
    await expect(runCommand({ version: '99.0.0' })).rejects.toThrow('unsupported HOS version: 99.0.0')
    expect(p.select).not.toHaveBeenCalled()
    expect(inspectOutput).not.toHaveBeenCalled()
    expect(resolveResources).not.toHaveBeenCalled()
    expect(buildPack).not.toHaveBeenCalled()
  })

  it('stops before querying GitHub when replacing the output is declined', async () => {
    vi.mocked(inspectOutput).mockReturnValue(true)
    vi.mocked(p.confirm).mockResolvedValue(false)
    await runCommand({})
    expect(resolveResources).not.toHaveBeenCalled()
    expect(buildPack).not.toHaveBeenCalled()
    const options = vi.mocked(p.confirm).mock.calls[0][0]
    expect({ ...options, message: stripVTControlCharacters(options.message) }).toEqual({
      message: `output already exists: ${nativeNormalize('/workspace/output/atmosphere-1.10.2-hos-21.2.0')}. replace it?`,
      initialValue: false,
    })
  })

  it('builds a named ZIP inside the configured parent and forwards progress', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', output: '/workspace/output', pack: true })
    await runCommand({})
    expect(buildPack).toHaveBeenCalledWith(expect.objectContaining({ bundle, resources: [], directory: '/workspace/output/atmosphere-1.10.2-hos-21.2.0.zip', replace: false, pack: true, signal: expect.any(AbortSignal) }))
    const task = vi.mocked(resolveResources).mock.calls[0][1]!
    task.onProgress!('extracting atmosphere')
    expect(stripVTControlCharacters(vi.mocked(p.spinner).mock.results[0].value.message.mock.lastCall[0])).toBe('extracting atmosphere')
  })

  it('shortens the final display path without changing the build destination', async () => {
    const output = join(homedir(), 'packs')
    const displayPath = nativeJoin('~', 'packs', 'atmosphere-1.10.2-hos-21.2.0')
    vi.mocked(resolveConfig).mockResolvedValue({ cwd: '/workspace', output, pack: false })
    vi.mocked(inspectOutput).mockReturnValue(true)
    vi.mocked(p.confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false)
    await runCommand({})
    expect(vi.mocked(buildPack).mock.calls[0][0].directory).toBe(join(output, 'atmosphere-1.10.2-hos-21.2.0'))
    expect(stripVTControlCharacters(vi.mocked(p.confirm).mock.calls[0][0].message)).toBe(`output already exists: ${displayPath}. replace it?`)
    expect(stripVTControlCharacters(vi.mocked(p.outro).mock.calls[0][0]!)).toBe(`pack ready: ${displayPath}`)
  })

  it('waits for cancellation cleanup before reporting the abort', async () => {
    let cleaned = false
    vi.mocked(buildPack).mockImplementationOnce(async (task) => {
      vi.mocked(p.spinner).mock.calls[0][0]!.onCancel!()
      await Promise.resolve()
      cleaned = true
      task!.signal!.throwIfAborted()
    })
    await runCommand({})
    expect(cleaned).toBe(true)
    expect(p.cancel).toHaveBeenCalledWith('build cancelled; temporary files removed')
    expect(p.outro).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(130)
    process.exitCode = 0
  })
})
