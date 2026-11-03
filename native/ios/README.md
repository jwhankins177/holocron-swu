# Holocron for iPhone and iPad

This is a native Apple app shell around the same collection/deck interface as the hosted site. It bundles React, the catalog, styles, icons, and downloaded art. It needs no hosted backend, ChatGPT login, Node installation, or third-party runtime on the device. Apple's WebKit and iCloud frameworks are system components.

## Build status

The web bundle can be built and checked on Linux. The Swift app requires compilation, signing, and device verification on a Mac; it has not been verified on iOS yet. Do not treat these sources as an installed or production-tested iCloud app. The hosted site continues to use its existing cloud database and does not synchronize with this Apple app.

## Build on a Mac

1. From the repository root, install the project's locked JavaScript dependencies and run `node scripts/build-offline.mjs`. This resumes cached artwork downloads and refuses to silently produce a complete-art build when downloads fail. `--allow-missing-art` explicitly permits an incomplete preview; missing images show the card's text fallback. `offline/art-report.json` lists every unavailable URL.
2. Install Xcode and the build-only XcodeGen utility (`brew install xcodegen`). Run `cd native/ios && xcodegen generate` and open `Holocron.xcodeproj`.
3. Select your Apple development team. Replace `com.jonathon.holocron` with a bundle ID registered to that team if necessary. Update the matching `iCloud.com.jonathon.holocron` entitlement values. Enable iCloud Documents in Signing & Capabilities and associate the container with the app. Both devices must run a build using that same container.
4. Build and run on your iPhone and iPad. Distribution to other devices requires your Apple signing/distribution setup. An Apple developer membership supporting iCloud is required. For distribution, add an app icon and complete Apple's required app metadata.
5. Turn on iCloud Drive for the same Apple Account on both devices. Verify the checklist below before relying on sync.

XcodeGen and JavaScript tooling are only needed to build the application, not to use it. Downloaded art is not checked into Git. Preserve a generated bundle separately if you need protection against the upstream art service disappearing. New cards require rebuilding the catalog/bundle; there is no automatic catalog updater in this version.

## Bring your current collection across

In the hosted site, choose **Backup**. Save the JSON in Files. In the Apple app, choose Import collection → Full backup, select that JSON, preview it, and confirm. Import it once on the first device; wait for its iCloud upload before opening the second device. SWUDB collection CSV and deck JSON remain supported. Native exports open the iOS share sheet, including Save to Files. The Apple app does not fetch private collections from the hosted site.

## Persistence and sync

Each successful edit writes an immutable JSON revision into Application Support/Holocron/Revisions. Each revision holds the workspace and parent revision IDs. These files are mirrored to the app's private iCloud Documents/Revisions container using coordinated file access. NSMetadataQuery discovers cloud files, including undownloaded placeholders. Incomplete history is never treated as proof that a newer revision should replace an older one.

A single descendant becomes the active workspace automatically. Concurrent edits produce multiple heads. The iCloud button presents the differing device/date/row/deck summaries. Choosing one commits a new revision that resolves all heads; original revisions remain preserved. It is a whole-workspace choice, not a field-by-field merge. No conflict version is silently discarded. You can export a backup before choosing; historical revisions can be recovered from their embedded workspace data by a developer. There is not yet a history browser.

“Saved locally” confirms a disk write. “Uploaded to iCloud” uses Apple's upload metadata; it does not assert that an iPad has already downloaded the change. Sync is asynchronous and runs while the app is active; Apple's transfer may continue afterward. Do not rely on force-closing as a sync trigger. If iCloud is unavailable, local saves continue. A changed Apple Account pauses sync to prevent transferring the previous account's collection into a different account.

Local-only data can still be lost by deleting the app or losing the device. Keep exported backups. All revisions are currently retained, so history grows with edits; there is no compaction yet. Card art is bundled per device and is not copied into the iCloud workspace. ForceTable and external links open Safari and need internet.

## Required device acceptance checks

- Launch in airplane mode. Browse/search cards and both art faces, filter foil/Heroism, build a deck, inspect stats, export/import JSON and CSV. ForceTable should only work when connected.
- Edit offline, background and relaunch the app; verify edits survive. Export a backup and verify exact quantities, foil flags, deck IDs and notes.
- On the same Apple Account, edit on iPhone, wait for uploaded status, then foreground iPad; verify exact state. Repeat in reverse.
- Edit on both devices while offline. Reconnect. Confirm a conflict is shown and neither version disappears. Choose a version, verify convergence and preserved history.
- Exercise empty/new iCloud container, undownloaded placeholder files, low storage, iCloud disabled, unavailable network, and an Apple Account switch. Errors must never reset the collection to empty.
- Confirm the modal blocks the background, share sheets anchor correctly on iPad, file picker works on both, and external links cannot navigate the app's privileged web view.

Artwork remains copyrighted by its owners. This is an unofficial personal collection tool.

## Verification in this workspace

- 9,388 unique front/back art files downloaded successfully; no missing artwork in the generated bundle.
- Bundle size approximately 2.8 GiB including artwork (about 3 GB decimal); the app's compiled native executable adds to this. This is the full catalog, including alternate art and promo printings.
- Offline Vite production build and TypeScript checks passed. Eleven JavaScript model/bridge tests passed.
- Hosted preview still loaded its collection and decks and displayed the new Backup control.
- Four Swift persistence/conflict tests are supplied under HolocronTests. They and real-device iCloud checks remain unrun because this environment has no Xcode or Swift compiler.
