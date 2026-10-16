import { defineConfig } from './src'

export default defineConfig({
  output: './output',
  extensions: [
    {
      name: 'mhgu-overlay',
      repository: 'hashcade/mhgu-overlay',
      assets: [
        {
          name: 'mhgu-overlay.ovl',
          target: 'switch/.overlays/mhgu-overlay.ovl',
        },
      ],
    },
    {
      name: 'feth-overlay',
      repository: 'hashcade/feth-overlay',
      assets: [
        {
          name: 'feth-overlay.ovl',
          target: 'switch/.overlays/feth-overlay.ovl',
        },
      ],
    },
    {
      name: 'feth-skyline',
      repository: 'three-houses-research-team/aldebaran-rs',
      assets: [{ name: 'release.zip' }],
    },
    {
      name: 'feth-skyline-heap-fix',
      repository: 'hashcade/feth-skyline-heap-fix',
      assets: [{ name: /^feth-skyline-heap-fix-v.*-atmosphere\.zip$/ }],
    },
    {
      name: 'feth-bench-exp',
      repository: 'hashcade/feth-bench-exp',
      assets: [{ name: /^feth-bench-exp-v.*\.zip$/ }],
    },
    {
      name: 'feth-fixed-growths',
      repository: 'hashcade/feth-fixed-growths',
      assets: [{ name: /^feth-fixed-growths-v.*\.zip$/ }],
    },
    {
      name: 'feth-better-durability',
      repository: 'hashcade/feth-better-durability',
      assets: [{ name: /^feth-better-durability-v.*\.zip$/ }],
    },
  ],
})
