# Holocron standalone web app

The standalone package contains the app, catalog, card art, icons, service worker, Windows server, and a bundled Node runtime. It does not call the hosted Holocron workspace API. The app saves each device's workspace in that browser's IndexedDB. The Windows server keeps a separate workspace with numbered revision files and never overwrites a newer revision with a stale upload.

## Build a complete package

On Windows, install the locked development dependencies once, then run:

```powershell
node scripts/build-offline.mjs
```

The result is `outputs/standalone/`. Confirm `app/art-report.json` has `"missing": []` before treating it as complete. The build resumes art already downloaded in `offline/art/`; it stops on unavailable images unless `--allow-missing-art` is explicitly supplied. `--skip-art` creates an incomplete smoke build for testing. The Windows build copies its current `node.exe` into `runtime/`, so users of the resulting package do not need to install Node. Keep the entire package directory together when copying it to another Windows PC.

For a fully manual card update, edit `public/catalog.json`, put any new JPG, PNG, or WebP images in `offline/manual-art/`, and set each new card's `image` or `back` field to `./manual-art/filename.png` (or the matching extension). Then run `node scripts/build-offline.mjs --offline`. This flag never downloads missing art; the build stops with a missing-art report if a referenced image is not already in `offline/art/` or `offline/manual-art/`. Distribute the rebuilt package to update the catalog on a device. A workspace backup imports owned cards and decks, but does not replace the app's catalog.

## Run locally without sync

1. Double-click `start.cmd` in the package and open exactly `http://127.0.0.1:8765/` on that Windows PC. Keep the package together and leave the command window open. The app is served from the PC itself; Tailscale and an internet connection are not needed. After replacing the package with a newer version, close and reopen `start.cmd`, then refresh the browser.
2. Open **Local only** in Holocron's toolbar and leave **Local only** selected. This is the default for new installs. No home server is contacted, and the app makes no automatic catalog update requests. The bundled catalog and artwork are used locally.
3. The first local run has the same catalog and interface as the Site, but its collection and decks start empty. On the live Site, choose **Backup**. In the local app, choose **Import full backup** and select that JSON file. This transfers your collection, decks, lists, favorites, settings, and resolution mappings once without turning on sync. Rebuild the package with a changed catalog JSON and artwork when you intentionally update the card catalog.

Turning Home sync off aborts active sync requests, removes this device's pairing key, and keeps local workspace data. You can re-enable Home sync and pair again later. ForceTable opens separately only when you choose **Play on ForceTable**. The Windows server stays on loopback unless you separately run `enable-sync.ps1`.

## Optional home sync

1. Double-click `start.cmd` in the package. Leave that window open. Open `http://127.0.0.1:8765/` on the PC. The private pairing key appears in the console. Workspace data and server identity are stored under `%LOCALAPPDATA%\Holocron`, outside the package, so app updates do not replace them.
2. For other devices, install and sign in to Tailscale on the PC and each device. Run `enable-sync.ps1` from PowerShell, or run `tailscale serve --bg --https=443 8765`. Tailscale prints the private HTTPS `.ts.net` address. [Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve) supplies the HTTPS certificate and proxies to the loopback server.
3. Open the HTTPS address on each device. In **Connections**, choose **Home sync**, then enter that address and the pairing key. Each device retains local edits when the PC is offline and syncs again when Holocron is open and reachable. Conflicting changes are shown for review rather than silently replaced.
4. In **Everything on this device**, prepare your cards for offline use. This caches the app shell, catalog, and your current artwork first; the full art download is optional and may require several gigabytes of browser storage. Install to the home screen after opening the HTTPS address if your browser offers it.

Back up from within the app before replacing a device or clearing browser data. The hosted Site and this standalone workspace are separate; move data between them with the full JSON backup. ForceTable requires internet. Cross-device sync requires the Windows PC and Tailscale to be running; local browsing and edits do not. A phone first needs a network connection to load and cache a web app served from the PC; browser-managed service-worker update checks may also contact the app's origin. For a strict no-network setup, use the loopback Windows address rather than a remote HTTPS address.

The Windows server listens only on `127.0.0.1`. Its sync API requires the pairing key. The revision history is under `%LOCALAPPDATA%\Holocron\revisions` and can be copied as a second backup. The package has no automatic Windows startup setup; run `start.cmd` when you want the server available.

To change the pairing key, stop `start.cmd`, run `rotate-key.cmd`, then restart `start.cmd`. In **Home sync** on each device, choose **Update key and sync** and enter the new key. Keep the new key private.
