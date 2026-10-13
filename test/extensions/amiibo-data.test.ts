import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateAmiibos, getAmiiboCatalog } from '../../src/extensions/amiibo-data'

const marth = { name: 'Marth', amiiboSeries: 'Super Smash Bros.', head: '21000000', tail: '000b0002' }
let directory: string | undefined

afterEach(async () => {
  vi.unstubAllGlobals()
  if (directory)
    await rm(directory, { recursive: true, force: true })
  directory = undefined
})

describe('getAmiiboCatalog', () => {
  it('reads the same database as Emuiigen and passes cancellation to fetch', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ amiibo: [marth] }))
    vi.stubGlobal('fetch', fetch)
    const controller = new AbortController()

    expect(await getAmiiboCatalog(controller.signal)).toEqual([marth])
    expect(fetch).toHaveBeenCalledWith('https://www.amiiboapi.org/api/amiibo/', { signal: expect.any(AbortSignal) })
    controller.abort()
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('reports HTTP failures instead of showing an empty series list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))

    await expect(getAmiiboCatalog()).rejects.toThrow('failed to load amiibo series: HTTP 503')
  })
})

describe('generateAmiibos', () => {
  it('writes Emuiibo-compatible IDs, dates, names, UUIDs, and flag files without losing same-name variants', async () => {
    directory = await mkdtemp(join(tmpdir(), 'atmosphere-up-amiibo-data-'))
    const progress = vi.fn()
    await generateAmiibos([marth, { ...marth, tail: '000c0002' }], directory, { onProgress: progress })

    const series = join(directory, 'emuiibo/amiibo/Super Smash Bros')
    expect(await readdir(series)).toEqual(['Marth (21000000000b0002)', 'Marth (21000000000c0002)'])
    const path = join(series, 'Marth (21000000000b0002)')
    const data = JSON.parse(await readFile(join(path, 'amiibo.json'), 'utf8'))
    expect(data).toMatchObject({
      name: 'Marth',
      id: { game_character_id: 0x21, character_variant: 0, figure_type: 0, model_number: 0x0B00, series: 0 },
      mii_charinfo_file: 'mii-charinfo.bin',
      first_write_date: { year: expect.any(Number), month: expect.any(Number), day: expect.any(Number) },
      use_random_uuid: false,
      version: 0,
      write_counter: 0,
    })
    expect(data.last_write_date).toEqual(data.first_write_date)
    expect(data.uuid).toHaveLength(10)
    expect(data.uuid.slice(7)).toEqual([0, 0, 0])
    expect(await readFile(join(path, 'amiibo.flag'), 'utf8')).toBe('')
    expect(progress).toHaveBeenLastCalledWith('generating amiibo [2/2] · Marth')
  })

  it('keeps paths inside the output and clamps display names to ten characters', async () => {
    directory = await mkdtemp(join(tmpdir(), 'atmosphere-up-amiibo-data-'))
    await generateAmiibos([{ ...marth, name: 'Isabelle - Winter', amiiboSeries: '../Animal/Crossing' }], directory)

    const series = join(directory, 'emuiibo/amiibo/.._Animal_Crossing')
    const [name] = await readdir(series)
    const data = JSON.parse(await readFile(join(series, name, 'amiibo.json'), 'utf8'))
    expect(data.name).toBe('IsabelleWi')
  })

  it('creates nothing for an empty selection and stops before writing when cancelled', async () => {
    directory = await mkdtemp(join(tmpdir(), 'atmosphere-up-amiibo-data-'))
    await generateAmiibos([], directory)
    expect(await readdir(directory)).toEqual([])

    await expect(generateAmiibos([marth], directory, { signal: AbortSignal.abort() })).rejects.toThrow('aborted')
    expect(await readdir(directory)).toEqual([])
  })
})
