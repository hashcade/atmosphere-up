# atmosphere-up

[![npm version][npm-version-src]][npm-version-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

## Usage

```sh
npx atmosphere-up
```

Atmosphere and sigpatches match the selected HOS version. Hekate, DBI, Lockpick
RCM, 90DNS Tester, Ovl Sysmodules, sys-patch, and Ultrahand use their latest releases.

<p align='center'>
<img src='./help.png' alt="help" />
</p>

### Core modules

| Module | Source | Includes |
| --- | --- | --- |
| Atmosphere | [Atmosphere-NX/Atmosphere](https://github.com/Atmosphere-NX/Atmosphere) | Atmosphere, fusee, Daybreak, hbmenu, hbloader, and other upstream tools |
| Hekate | [CTCaer/hekate](https://github.com/CTCaer/hekate) | Bootloader with CFW emuMMC, CFW sysMMC, and stock sysMMC boot entries |
| DBI | [rashevskyv/dbi](https://github.com/rashevskyv/dbi), [DBIPatcher](https://github.com/rashevskyv/DBIPatcher) | English interface, installation, file transfer, save management, and firmware export |
| 90DNS Tester | [meganukebmp/Switch_90DNS_tester](https://github.com/meganukebmp/Switch_90DNS_tester) | Check whether Nintendo domains are blocked by DNS MITM or 90DNS |
| Lockpick RCM | [impeeza/Lockpick_RCMDecScots](https://github.com/impeeza/Lockpick_RCMDecScots) | Console key export from Hekate's Payloads menu |
| Sys Patch | [impeeza/sys-patch](https://github.com/impeeza/sys-patch) | System patching service and overlay |
| Ultrahand | [ppkantorski/Ultrahand-Overlay](https://github.com/ppkantorski/Ultrahand-Overlay) | Overlay menu and nx-ovlloader |
| Ovl Sysmodules | [ppkantorski/ovl-sysmodules](https://github.com/ppkantorski/ovl-sysmodules) | Background module status, memory usage, startup settings, and controls for supported modules |
| Sigpatches | [Supported versions](./assets/sigpatches/README.md) | Patches for the selected HOS and Atmosphere versions |

Reboot to Payload returns to Hekate. Each pack includes a manifest listing its
module versions.

Ultrahand opens with **L + D-pad Down**.

### Console keys

If DBI reports missing keys in `/switch/prod.keys`, export them on your Switch:

1. Boot into Hekate and open **Payloads**.
2. Launch **Lockpick_RCM.bin**.
3. Choose **Dump from EmuNAND** for emuMMC, or **Dump from SysNAND** for sysMMC.
   Use the system where you run DBI.
4. Wait for the export to finish, return to Hekate, boot your CFW, and reopen DBI.

Lockpick saves the exported keys to `/switch/prod.keys` on the SD card. Keep this
file when replacing or updating the pack. If DBI reports missing keys after a
firmware update, export them again from the updated system.

### Module upgrades

Use `upgrade` to update individual core, optional, or configured modules.

Upgrade packs include the selected modules and their required dependencies in
SD card layout. Copy the contents to the SD card root and merge them to update.
A single module uses its name for the output; multiple modules use `upgrade`.
Use `--pack` for ZIP output.

### Optional modules

Choose optional modules by category, or use `--no-ext` to skip built-in optional modules.

| Module | Source | Includes |
| --- | --- | --- |
| JKSV | [J-D-K/JKSV](https://github.com/J-D-K/JKSV) | Save backup and restore; default save manager selection |
| Checkpoint | [BernardoGiordano/Checkpoint](https://github.com/BernardoGiordano/Checkpoint) | Save backup and restore |
| NX Shell | [DefenderOfHyrule/NX-Shell](https://github.com/DefenderOfHyrule/NX-Shell) | File copying, moving, renaming, and deletion |
| EdiZon Overlay | [proferabg/EdiZon-Overlay](https://github.com/proferabg/EdiZon-Overlay) | In-game cheat controls; the only cheat tool selected by default |
| EdiZon SE | [tomvita/EdiZon-SE](https://github.com/tomvita/EdiZon-SE) | Memory search and editing for creating cheats |
| Breeze | [tomvita/Breeze-Beta](https://github.com/tomvita/Breeze-Beta) | Cheat management, memory search, and editing |
| Breezehand Overlay | [tomvita/Breezehand-Overlay](https://github.com/tomvita/Breezehand-Overlay) | Cheat controls in an overlay |
| Sys Clk | [retronx-team/sys-clk](https://github.com/retronx-team/sys-clk) | Clock service, homebrew manager, and overlay |
| Sys Clk Overlay Ultrahand | [ppkantorski/sys-clk](https://github.com/ppkantorski/sys-clk) | Enhanced clock controls for Ultrahand, including Horizon OC support |
| Horizon OC | [Horizon-OC/Horizon-OC](https://github.com/Horizon-OC/Horizon-OC) | Advanced CPU, GPU, RAM, and voltage tuning; not selected by default |
| FPS Locker | [masagrator/FPSLocker](https://github.com/masagrator/FPSLocker) | Per-game frame rate controls |
| ReverseNx RT | [masagrator/ReverseNX-RT](https://github.com/masagrator/ReverseNX-RT) | Switch game rendering between handheld and docked modes |
| Fizeau | [averne/Fizeau](https://github.com/averne/Fizeau) | Screen color temperature, saturation, gamma, and contrast controls; not selected by default |
| Status Monitor | [ppkantorski/Status-Monitor-Overlay](https://github.com/ppkantorski/Status-Monitor-Overlay) | FPS, frequencies, load, temperatures, and power monitoring; default monitor selection |
| Status Monitor Deux | [masagrator/Status-Monitor-Deux](https://github.com/masagrator/Status-Monitor-Deux) | Performance monitoring with customizable layouts |
| Mission Control | [ndeadly/MissionControl](https://github.com/ndeadly/MissionControl) | Third-party Bluetooth controller support; selected by default when controller support is enabled |
| Sys Con | [o0Zz/sys-con](https://github.com/o0Zz/sys-con) | Third-party USB controller support; selected by default when controller support is enabled |
| Moonlight Switch | [XITRIX/Moonlight-Switch](https://github.com/XITRIX/Moonlight-Switch) | Stream PC games to Switch; selected by default when streaming is enabled |
| SysDVR | [exelix11/SysDVR](https://github.com/exelix11/SysDVR) | Stream Switch gameplay to a PC over USB or network, with a settings app; selected by default when streaming is enabled |
| Emuiibo | [XorTroll/emuiibo](https://github.com/XorTroll/emuiibo) | Virtual Amiibo emulation with a background service and in-game overlay; generate Amiibo collections by series |

All performance tuning tools except Horizon OC and Fizeau are selected by default. Selecting the
Ultrahand clock overlay also includes a clock service. FPS Locker, ReverseNx RT,
and performance monitors include their shared [SaltyNX](https://github.com/masagrator/SaltyNX) dependency.
Selecting Sys Clk Overlay Ultrahand excludes the original Sys Clk overlay while
retaining its clock service and homebrew manager.

Horizon OC uses its latest release and configures the CFW boot entries
automatically. When selected with Sys Clk, Horizon OC supplies the clock
service; the original Sys Clk manager and overlay cannot connect to it. Use
Horizon OC or Sys Clk Overlay Ultrahand for clock controls in that configuration.

Mission Control matches the selected HOS version. Sys Con uses its latest release.

Selected optional modules are included in both directory and ZIP output.

### Firmware updates

Download firmware for the selected HOS version from
[THZoria/NX_Firmware](https://github.com/THZoria/NX_Firmware).

Firmware is extracted to `firmware/<HOS version>/` in the generated pack for
installation with Daybreak. It is included in both directory and ZIP output.
Use `--no-firmware` to skip firmware downloads.

### Pack defaults

- Overlays use an 8 MiB memory allocation.
- Cheats start disabled unless configured otherwise. Toggle state is saved only
  when a toggle file already exists, or when remembering toggles is enabled.
- JKSV backs up saves as unpacked folders. Deleting, restoring, and overwriting
  backups require confirmation without holding A.
- USB 3.0 is enabled for homebrew.
- Hekate's Nyx interface runs at 544 MHz.
- CPU performance counters are accessible to userland tools in both CFW environments.
- CFW boot entries allow experimental components included in Atmosphere's package3.
- NRO authorization checks are relaxed for compatible game mods.
- Automatic cloud save downloads and uploads default to disabled.
- Serial number information is hidden while running Atmosphere on sysMMC or emuMMC.
- Nintendo services are blocked while running Atmosphere on sysMMC or emuMMC.
  Connectivity-test domains are excluded from blocking. Stock sysMMC is unaffected.

## Configuration

Create `atmosphere-up.config.ts` in the working directory:

```ts
import { defineConfig } from 'atmosphere-up'

export default defineConfig({
  output: './output',
  ext: true,
  firmware: true,
  pack: false,
})
```

The repository's config writes to `./output` by default. CLI arguments override
configuration: `--pack` enables ZIP output and `--no-pack` enables directory
output. Use `--cwd <directory>` to select a different working directory and config.
Relative output paths resolve from that working directory.

Authentication uses `GITHUB_TOKEN` when set, otherwise an existing GitHub CLI
login. Without either, downloads and release queries run anonymously.

GitHub queries and downloads support `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`,
including their lowercase forms.

### Configured modules

Add GitHub release assets to your pack with `extensions`:

```ts
export default defineConfig({
  extensions: [
    {
      name: 'mhgu-overlay',
      repository: 'jinghaihan/mhgu-overlay',
      assets: [
        {
          name: 'mhgu-overlay.ovl',
          target: 'switch/.overlays/mhgu-overlay.ovl',
        },
      ],
    },
    {
      name: 'feth-overlays',
      repository: '3096/feth-overlays',
      assets: [{ name: 'feth-overlays.zip' }],
    },
  ],
})
```

Each module's `assets` array lists the files to install. Each asset's `name`
accepts an exact filename or a regular expression. `target` saves a file at the
given SD card path. Without `target`, the asset is extracted as a ZIP, preserving
its directory structure. Set `directory` to an extraction directory; it defaults
to the SD card root. `releaseTag` pins a release; omit it to use the latest
release. Module names must be unique across built-in and configured modules.

Builds include configured modules even with `--no-ext`. Use
`npx atmosphere-up upgrade mhgu-overlay` to update a configured module separately.
Personal files from `extra` can override configured module files.

### Personal files

Set `extra` to a directory containing your mods, cheat codes, homebrew, or personal
configuration in SD card layout:

```ts
export default defineConfig({
  output: './output',
  extra: './personal',
})
```

For example, `personal/config/JKSV/JKSV.json` becomes `config/JKSV/JKSV.json` in
the generated pack. Directories are merged, and extra files replace files at the
same path. Configuration files are replaced in full. The source directory stays
unchanged. Both build and upgrade packs include extra files, with directory or
ZIP output. Relative `extra` paths resolve from the working directory.

## License

[MIT](./LICENSE) License © [jinghaihan](https://github.com/jinghaihan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/atmosphere-up?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/atmosphere-up
[npm-downloads-src]: https://img.shields.io/npm/dm/atmosphere-up?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/atmosphere-up
[bundle-src]: https://img.shields.io/bundlephobia/minzip/atmosphere-up?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=atmosphere-up
[license-src]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/jinghaihan/atmosphere-up/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/atmosphere-up
