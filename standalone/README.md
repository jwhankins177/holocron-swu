# Holocron standalone web app and home sync

The standalone package contains the app, catalog, card art, icons, service worker, Windows server, and a bundled Node runtime. It does not call the hosted Holocron workspace API. The app saves each device's workspace in that browser's IndexedDB. The Windows server keeps a separate workspace with numbered revision files and never overwrites a newer revision with a stale upload.

## Build a complete package

On Windows, install the locked development dependencies once, then run:

```powershell
node scripts/build-offline.mjs
```

The result is `outputs/standalone/`. Confirm `app/art-report.json` has `"missing": []` before treating it as complete. The build resumes art already downloaded in `offline/art/`; it stops on unavailable images unless `--allow-missing-art` is explicitly supplied. `--skip-art` creates an incomplete smoke build for testing. The Windows build copies its current `node.exe` into `runtime/`, so users of the resulting package do not need to install Node. Keep the entire package directory together when copying it to another Windows PC.

## Run and sync

1. Double-click `start.cmd` in the package. Leave that window open. Open `http://127.0.0.1:8765/` on the PC. The private pairing key appears in the console. Workspace data and server identity are stored under `%LOCALAPPDATA%\Holocron`, outside the package, so app updates do not replace them.
2. For other devices, install and sign in to Tailscale on the PC and each device. Run `enable-sync.ps1` from PowerShell, or run `tailscale serve --bg --https=443 8765`. Tailscale prints the private HTTPS `.ts.net` address. [Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve) supplies the HTTPS certificate and proxies to the loopback server.
3. Open the HTTPS address on each device. In **Home sync**, enter that address and the pairing key. Each device retains local edits when the PC is offline and syncs again when Holocron is open and reachable. Conflicting changes are shown for review rather than silently replaced.
4. In **Everything on this device**, prepare your cards for offline use. This caches the app shell, catalog, and your current artwork first; the full art download is optional and may require several gigabytes of browser storage. Install to the home screen after opening the HTTPS address if your browser offers it.

Back up from within the app before replacing a device or clearing browser data. The hosted Site and this standalone workspace are separate; move data between them with the full JSON backup. ForceTable and other external links still require internet. Cross-device sync requires the Windows PC and Tailscale to be running; local browsing and edits do not.

The Windows server listens only on `127.0.0.1`. Its sync API requires the pairing key. The revision history is under `%LOCALAPPDATA%\Holocron\revisions` and can be copied as a second backup. The package has no automatic Windows startup setup; run `start.cmd` when you want the server available.

To change the pairing key, stop `start.cmd`, run `rotate-key.cmd`, then restart `start.cmd`. In **Home sync** on each device, choose **Update key and sync** and enter the new key. Keep the new key private.
