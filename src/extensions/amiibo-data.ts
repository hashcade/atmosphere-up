import type { TaskOptions } from '../types'
import { Buffer } from 'node:buffer'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { getRepositoryFile } from '../download'

export interface AmiiboEntry {
  name: string
  amiiboSeries: string
  head: string
  tail: string
}

export async function getAmiiboCatalog(signal?: AbortSignal): Promise<AmiiboEntry[]> {
  const source = await getRepositoryFile('8bitDream/AmiiboAPI', 'database/amiibo.json', signal)
  const data = JSON.parse(source) as {
    amiibos: Record<string, { name: string }>
    amiibo_series: Record<string, string>
  }

  return Object.entries(data.amiibos).map(([id, entry]) => ({
    name: entry.name,
    amiiboSeries: data.amiibo_series[`0x${id.slice(14, 16)}`],
    head: id.slice(2, 10),
    tail: id.slice(10),
  }))
}

function directoryName(name: string): string {
  return name.normalize('NFKD').replace(/[^\w .()!&'-]/g, '_').replace(/[ .]+$/, '') || 'amiibo'
}

export async function generateAmiibos(entries: AmiiboEntry[], directory: string, { signal, onProgress }: TaskOptions = {}): Promise<void> {
  const now = new Date()
  const date = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }

  // Emuiibo's virtual format; the console creates owner Mii data on first use.
  // https://github.com/XorTroll/emuiibo/blob/master/emuiibo/src/amiibo/fmt.rs
  for (const [index, entry] of entries.entries()) {
    signal?.throwIfAborted()
    onProgress?.(`generating amiibo [${index + 1}/${entries.length}] · ${entry.name}`)

    const identifier = entry.head + entry.tail
    if (!/^[\da-f]{16}$/i.test(identifier))
      throw new Error(`invalid amiibo ID: ${entry.name}`)

    const id = Buffer.from(identifier, 'hex')
    const uuid = Buffer.alloc(10)
    randomBytes(7).copy(uuid)
    const data = {
      name: entry.name.replace(/[ .'-]/g, '').slice(0, 10),
      id: {
        game_character_id: id.readUInt16LE(0),
        character_variant: id[2],
        figure_type: id[3],
        model_number: id.readUInt16LE(4),
        series: id[6],
      },
      first_write_date: date,
      last_write_date: date,
      mii_charinfo_file: 'mii-charinfo.bin',
      uuid: [...uuid],
      use_random_uuid: false,
      version: 0,
      write_counter: 0,
    }

    const target = join(directory, 'emuiibo/amiibo', directoryName(entry.amiiboSeries), `${directoryName(entry.name)} (${identifier})`)
    await mkdir(target, { recursive: true })
    await writeFile(join(target, 'amiibo.json'), `${JSON.stringify(data, null, 2)}\n`, { signal })
    await writeFile(join(target, 'amiibo.flag'), '', { signal })
  }
}
