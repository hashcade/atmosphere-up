import type { Options } from './types'
import pkg from '../package.json'

export const NAME = pkg.name

export const VERSION = pkg.version

export const MODE_CHOICES = ['build', 'upgrade'] as const

export const DEFAULT_OPTIONS: Partial<Options> = {
  mode: 'build',
  ext: true,
  pack: false,
  firmware: true,
}

export const FIRMWARE_REPO = 'THZoria/NX_Firmware'

export const DBI_TRANSLATION_REPO = 'rashevskyv/DBIPatcher'

/// keep-sorted
export const CORE_REPO_CONFIG = {
  '90dns-tester': 'meganukebmp/Switch_90DNS_tester',
  'atmosphere': 'Atmosphere-NX/Atmosphere',
  'dbi': 'rashevskyv/dbi',
  'hekate': 'CTCaer/hekate',
  'lockpick-rcm': 'impeeza/Lockpick_RCMDecScots',
  'ovl-sysmodules': 'ppkantorski/ovl-sysmodules',
  'sys-patch': 'impeeza/sys-patch',
  'ultrahand': 'ppkantorski/Ultrahand-Overlay',
} as const

export const CORE_MODULE_LABELS = {
  '90dns-tester': '90DNS Tester',
  'atmosphere': 'Atmosphere',
  'dbi': 'DBI',
  'hekate': 'Hekate',
  'lockpick-rcm': 'Lockpick RCM',
  'ovl-sysmodules': 'Ovl Sysmodules',
  'sys-patch': 'Sys Patch',
  'ultrahand': 'Ultrahand',
} satisfies Record<keyof typeof CORE_REPO_CONFIG, string>

/// keep-sorted
export const EXTENSION_REPO_CONFIG = {
  'breeze': 'tomvita/Breeze-Beta',
  'breezehand': 'tomvita/Breezehand-Overlay',
  'checkpoint': 'BernardoGiordano/Checkpoint',
  'edizon-overlay': 'proferabg/EdiZon-Overlay',
  'edizon-se': 'tomvita/EdiZon-SE',
  'emuiibo': 'XorTroll/emuiibo',
  'fizeau': 'averne/Fizeau',
  'fps-locker': 'masagrator/FPSLocker',
  'horizon-oc': 'Horizon-OC/Horizon-OC',
  'jksv': 'J-D-K/JKSV',
  'mission-control': 'ndeadly/MissionControl',
  'moonlight-switch': 'XITRIX/Moonlight-Switch',
  'nx-shell': 'DefenderOfHyrule/NX-Shell',
  'reverse-nx-rt': 'masagrator/ReverseNX-RT',
  'salty-nx': 'masagrator/SaltyNX',
  'status-monitor-deux': 'masagrator/Status-Monitor-Deux',
  'status-monitor': 'ppkantorski/Status-Monitor-Overlay',
  'sys-clk-overlay-ultrahand': 'ppkantorski/sys-clk',
  'sys-clk': 'retronx-team/sys-clk',
  'sys-con': 'o0Zz/sys-con',
  'sys-dvr': 'exelix11/SysDVR',
} as const

export const PACK_DEFAULTS = new URL('../assets/defaults/', import.meta.url)

export const OVERLAY_ORDER = [
  'ovlEdiZon.ovl',
  'breezehand.ovl',
  'ReverseNX-RT-ovl.ovl',
  'sys-clk-overlay.ovl',
  'FPSLocker.ovl',
  'Status-Monitor-Overlay.ovl',
  'Status-Monitor-Deux.ovl',
  'Fizeau.ovl',
  'emuiibo.ovl',
  'ovlSysmodules.ovl',
  'horizon-oc-overlay.ovl',
  'sys-patch-overlay.ovl',
]
