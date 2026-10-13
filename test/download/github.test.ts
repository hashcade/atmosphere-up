import type { Release, ReleaseAsset } from '../../src/types'
import { Buffer } from 'node:buffer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadAsset, getRelease, getRepositoryFile } from '../../src/download'
import { resolveGithubToken } from '../../src/download/auth'
import { selectAsset, sha256 } from '../../src/utils'

vi.mock('../../src/download/auth', () => ({ resolveGithubToken: vi.fn().mockResolvedValue(undefined) }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('selectAsset', () => {
  it('rejects missing or ambiguous release assets', () => {
    const release = { tag_name: 'v1', html_url: 'https://github.com/example/core/releases/v1', assets: [] } as unknown as Release
    expect(() => selectAsset(release, /zip$/)).toThrow('found 0')
    release.assets = ['a.zip', 'b.zip'].map(name => ({ name, browser_download_url: '', size: 1 })) as ReleaseAsset[]
    expect(() => selectAsset(release, /zip$/)).toThrow('found 2')
  })
})

describe('getRelease', () => {
  it('passes the resolved credential to Octokit', async () => {
    vi.mocked(resolveGithubToken).mockResolvedValueOnce('test-token')
    vi.resetModules()
    const { getRelease } = await import('../../src/download')
    const fetch = vi.fn().mockResolvedValue(Response.json({ tag_name: 'v1', assets: [] }))
    vi.stubGlobal('fetch', fetch)
    await getRelease('example/core')
    expect(fetch.mock.calls[0][1].headers.authorization).toBe('token test-token')
  })

  it('resolves the exact prerelease tag instead of latest', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ tag_name: '1.6.1-prerelease', assets: [] }))
    vi.stubGlobal('fetch', fetch)
    await getRelease('Atmosphere-NX/Atmosphere', '1.6.1-prerelease')
    expect(fetch.mock.calls[0][0]).toBe('https://api.github.com/repos/Atmosphere-NX/Atmosphere/releases/tags/1.6.1-prerelease')
  })

  it('reports an API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'API rate limit exceeded' }, { status: 403 })))
    await expect(getRelease('example/core')).rejects.toThrow('API rate limit exceeded')
  })
})

describe('getRepositoryFile', () => {
  it('reads repository files through the shared client with cancellation', async () => {
    const source = '{"amiibos":{}}'
    const fetch = vi.fn().mockResolvedValue(Response.json({ type: 'file', encoding: 'base64', content: Buffer.from(source).toString('base64') }))
    vi.stubGlobal('fetch', fetch)
    const controller = new AbortController()

    expect(await getRepositoryFile('8bitDream/AmiiboAPI', 'database/amiibo.json', controller.signal)).toBe(source)
    expect(fetch.mock.calls[0][0]).toBe('https://api.github.com/repos/8bitDream/AmiiboAPI/contents/database%2Famiibo.json')
    expect(fetch.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('rejects directories and cancelled requests', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([]))
    vi.stubGlobal('fetch', fetch)

    await expect(getRepositoryFile('example/core', 'directory')).rejects.toThrow('expected a file')
    fetch.mockClear()
    await expect(getRepositoryFile('example/core', 'file', AbortSignal.abort())).rejects.toThrow('aborted')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('downloadAsset', () => {
  it('reports received bytes and passes cancellation to the SDK request and response stream', async () => {
    const controller = new AbortController()
    const stream = new ReadableStream<Uint8Array>({
      start(stream) { stream.enqueue(new TextEncoder().encode('part')) },
    })
    const fetch = vi.fn().mockResolvedValue(new Response(stream))
    vi.stubGlobal('fetch', fetch)
    const onProgress = vi.fn(() => controller.abort())
    const asset = { id: 1, name: 'core.zip', size: 8, browser_download_url: 'https://github.com/example/core/releases/download/v1/core.zip' } as ReleaseAsset
    await expect(downloadAsset(asset, { signal: controller.signal, onProgress })).rejects.toThrow('aborted')
    expect(onProgress).toHaveBeenCalledWith(4)
    expect(fetch.mock.calls[0][0]).toBe(asset.browser_download_url)
    expect(fetch.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('rejects an asset whose size or digest changed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response('test'))))
    const asset = { id: 1, name: 'core.zip', size: 5, browser_download_url: 'https://github.com/example/core/releases/download/v1/core.zip' } as ReleaseAsset
    await expect(downloadAsset(asset)).rejects.toThrow('Size mismatch')
    await expect(downloadAsset({ ...asset, size: 4, digest: 'sha256:invalid' })).rejects.toThrow('SHA-256 mismatch')
    const data = new TextEncoder().encode('test')
    expect(await downloadAsset({ ...asset, size: 4, digest: `sha256:${sha256(data)}` })).toEqual(data)
  })
})
