import type { Release } from '../../src/types'
import { Buffer } from 'node:buffer'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as p from '@clack/prompts'
import AdmZip from 'adm-zip'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installResources } from '../../src/core/install'
import { downloadAsset, getRelease } from '../../src/download'
import { promptExtensions, promptExtensionSettings, resolveAmiibo, resolveExtensions } from '../../src/extensions'
import { getAmiiboCatalog } from '../../src/extensions/amiibo-data'
import { buildUpgradePack } from '../../src/upgrade'

vi.mock('../../src/download', () => ({ getRelease: vi.fn(), downloadAsset: vi.fn() }))
vi.mock('../../src/extensions/amiibo-data', async original => ({
  ...await original<typeof import('../../src/extensions/amiibo-data')>(),
  getAmiiboCatalog: vi.fn(),
}))
vi.mock('@clack/prompts', async original => ({
  ...await original<typeof import('@clack/prompts')>(),
  select: vi.fn(),
  multiselect: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), error: vi.fn() })),
}))

const entries = [
  { name: 'Zelda', amiiboSeries: 'Legend Of Zelda', head: '01010000', tail: '00040002' },
  { name: 'Marth', amiiboSeries: 'Super Smash Bros.', head: '21000000', tail: '000b0002' },
  { name: 'Chrom', amiiboSeries: 'Fire Emblem', head: '21080000', tail: '035d1202' },
  { name: 'Tiki', amiiboSeries: 'Fire Emblem', head: '21090000', tail: '035e1202' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAmiiboCatalog).mockResolvedValue(entries)
  vi.mocked(p.select).mockResolvedValue('emuiibo')
  vi.mocked(p.multiselect).mockReset().mockResolvedValue([])
})

describe('amiibo selection', () => {
  it('offers deduplicated series alphabetically with no required or initial selection', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(['Fire Emblem', 'Legend Of Zelda'])
    const controller = new AbortController()

    expect(await promptExtensionSettings(['emuiibo'], controller)).toEqual({ amiibos: [entries[0], entries[2], entries[3]] })
    expect(p.multiselect).toHaveBeenCalledWith({
      message: 'select amiibo series (optional)',
      options: ['Fire Emblem', 'Legend Of Zelda', 'Super Smash Bros.'].map(name => ({ value: name, label: name })),
      initialValues: [],
      required: false,
      signal: controller.signal,
    })
  })

  it('allows skipping generation and does not fetch the catalog for other modules', async () => {
    expect(await promptExtensionSettings(['jksv'], new AbortController())).toEqual({})
    expect(getAmiiboCatalog).not.toHaveBeenCalled()
    expect(await promptExtensionSettings(['emuiibo'], new AbortController())).toEqual({ amiibos: [] })
  })

  it('cancels the build when the series selection is cancelled', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(p.CANCEL_SYMBOL)
    const controller = new AbortController()

    await expect(promptExtensionSettings(['emuiibo'], controller)).rejects.toThrow('aborted')
    expect(controller.signal.aborted).toBe(true)
  })

  it('passes selected series from the full build prompts to resource installation', async () => {
    vi.mocked(p.multiselect).mockResolvedValueOnce(['amiibo']).mockResolvedValueOnce(['Fire Emblem'])
    vi.mocked(getRelease).mockResolvedValueOnce({ tag_name: '1.1.3', assets: [{ name: 'emuiibo.zip' }] } as Release)
    const selection = await promptExtensions(new AbortController())
    const [resource] = await resolveExtensions(selection)
    const archive = new AdmZip()
    archive.addFile('SdOut/switch/.overlays/emuiibo.ovl', Buffer.from('overlay'))
    vi.mocked(downloadAsset).mockResolvedValueOnce(archive.toBuffer())
    const directory = await mkdtemp(join(tmpdir(), 'atmosphere-up-amiibo-'))

    try {
      await installResources([resource], directory)
      const data = JSON.parse(await readFile(join(directory, 'emuiibo/amiibo/Fire Emblem/Chrom (21080000035d1202)/amiibo.json'), 'utf8'))
      expect(data.name).toBe('Chrom')
      await expect(readFile(join(directory, 'emuiibo/amiibo/Super Smash Bros/Marth (21000000000b0002)/amiibo.json'))).rejects.toThrow()
    }
    finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

describe('resolveAmiibo', () => {
  it('includes generated amiibos in an upgrade ZIP', async () => {
    vi.mocked(getRelease).mockResolvedValueOnce({ tag_name: '1.1.3', assets: [{ name: 'emuiibo.zip' }] } as Release)
    const archive = new AdmZip()
    archive.addFile('SdOut/switch/.overlays/emuiibo.ovl', Buffer.from('overlay'))
    vi.mocked(downloadAsset).mockResolvedValueOnce(archive.toBuffer())
    const directory = await mkdtemp(join(tmpdir(), 'atmosphere-up-amiibo-'))

    try {
      const resources = await resolveAmiibo(['emuiibo'], { amiibos: [entries[2]] })
      const destination = join(directory, 'emuiibo.zip')
      await buildUpgradePack({ modules: ['emuiibo'], resources, directory: destination, pack: true })

      const output = new AdmZip(destination)
      expect(output.readAsText('switch/.overlays/emuiibo.ovl')).toBe('overlay')
      expect(JSON.parse(output.readAsText('emuiibo/amiibo/Fire Emblem/Chrom (21080000035d1202)/amiibo.json')).name).toBe('Chrom')
      expect(output.getEntry('emuiibo/amiibo/Fire Emblem/Chrom (21080000035d1202)/amiibo.flag')).not.toBeNull()
    }
    finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('installs the service and overlay at the SD root while preserving existing components', async () => {
    vi.mocked(getRelease).mockResolvedValueOnce({ tag_name: '1.1.3', assets: [{ name: 'emuiibo.zip' }, { name: 'emuiigen.jar' }] } as Release)
    const archive = new AdmZip()
    const service = 'atmosphere/contents/0100000000000352/exefs.nsp'
    const overlay = 'switch/.overlays/emuiibo.ovl'
    const language = 'emuiibo/overlay/lang/en.json'
    archive.addFile(`SdOut/${service}`, Buffer.from('service'))
    archive.addFile(`SdOut/${overlay}`, Buffer.from('overlay'))
    archive.addFile(`SdOut/${language}`, Buffer.from('{}'))
    vi.mocked(downloadAsset).mockResolvedValueOnce(archive.toBuffer())
    const directory = await mkdtemp(join(tmpdir(), 'atmosphere-up-amiibo-'))

    try {
      await writeFile(join(directory, 'payload.bin'), 'hekate')
      const [resource] = await resolveAmiibo(['emuiibo'])
      expect(getRelease).toHaveBeenCalledWith('XorTroll/emuiibo', undefined, undefined)
      expect(resource).toMatchObject({ module: 'emuiibo', asset: { name: 'emuiibo.zip' } })

      await installResources([resource], directory)

      expect(await readFile(join(directory, service), 'utf8')).toBe('service')
      expect(await readFile(join(directory, overlay), 'utf8')).toBe('overlay')
      expect(await readFile(join(directory, language), 'utf8')).toBe('{}')
      expect(await readFile(join(directory, 'payload.bin'), 'utf8')).toBe('hekate')
      await expect(readFile(join(directory, `SdOut/${overlay}`))).rejects.toThrow()
    }
    finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
