import type { ReleaseAsset } from '../types'
import { Buffer } from 'node:buffer'
import { Octokit } from '@octokit/rest'
import { sha256 } from '../utils'
import { resolveGithubToken } from './auth'

let github: Promise<Octokit> | undefined

interface DownloadOptions {
  signal?: AbortSignal
  onProgress?: (received: number) => void
}

export async function getRepositoryFile(repository: string, path: string, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted()
  const github = await getGithub()
  signal?.throwIfAborted()

  const [owner, repo] = repository.split('/')
  const { data } = await github.rest.repos.getContent({ owner, repo, path, request: { signal } })

  if (Array.isArray(data) || data.type !== 'file' || data.encoding !== 'base64')
    throw new Error(`expected a file: ${repository}/${path}`)

  return Buffer.from(data.content, 'base64').toString('utf8')
}

export async function getRelease(repository: string, tag?: string, signal?: AbortSignal) {
  signal?.throwIfAborted()

  const github = await getGithub()

  signal?.throwIfAborted()

  const [owner, repo] = repository.split('/')
  const response = tag
    ? await github.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag,
        request: { signal },
      })
    : await github.rest.repos.getLatestRelease({
        owner,
        repo,
        request: { signal },
      })

  return response.data
}

export async function downloadAsset(asset: ReleaseAsset, { signal, onProgress }: DownloadOptions = {}): Promise<Uint8Array> {
  signal?.throwIfAborted()

  const github = await getGithub()

  signal?.throwIfAborted()

  const response = await github.request({
    method: 'GET',
    url: asset.browser_download_url,
    headers: {
      accept: 'application/octet-stream',
    },
    request: {
      parseSuccessResponseBody: false,
      signal,
    },
  })

  let received = 0
  const stream = response.data as unknown as ReadableStream<Uint8Array>
  const tracked = stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength
      onProgress?.(received)
      controller.enqueue(chunk)
    },
  }), { signal })

  const data = new Uint8Array(await new Response(tracked).arrayBuffer())
  signal?.throwIfAborted()

  if (data.byteLength !== asset.size)
    throw new Error(`Size mismatch for ${asset.name}. Expected ${asset.size}, received ${data.byteLength}.`)

  if (asset.digest?.startsWith('sha256:') && asset.digest.slice(7) !== sha256(data))
    throw new Error(`SHA-256 mismatch for ${asset.name}.`)

  return data
}

function getGithub(): Promise<Octokit> {
  github ??= resolveGithubToken().then((auth) => {
    const client = new Octokit({ auth })
    client.log.error = () => {}
    return client
  })

  return github
}
