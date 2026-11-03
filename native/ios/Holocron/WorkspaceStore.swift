import Foundation

// Immutable revisions make concurrent offline edits branches, never overwrites.
// A resolution adds a revision with all current heads as parents; history remains intact.
struct Revision: Codable {
    let id: String
    let parents: [String]
    let created: Date
    let device: String
    let workspace: Data
}

@MainActor final class WorkspaceStore {
    private let fm = FileManager.default
    private let local: URL
    private var cloud: URL?
    private var revisions: [String: Revision] = [:]
    private var selected = ""
    private var query: NSMetadataQuery?
    private var accountChanged = false
    private var syncError: String?
    private var importedCloud = Set<String>()
    private let empty = Data(#"{"collection":[],"decks":[]}"#.utf8)

    init(localURL: URL? = nil) throws {
        if let localURL { local = localURL }
        else { local = try fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("Holocron/Revisions", isDirectory: true) }
        try fm.createDirectory(at: local, withIntermediateDirectories: true)
        for url in try fm.contentsOfDirectory(at: local, includingPropertiesForKeys: nil) where url.pathExtension == "json" {
            let revision = try JSONDecoder().decode(Revision.self, from: Data(contentsOf: url))
            revisions[revision.id] = revision
        }
        selected = UserDefaults.standard.string(forKey: "selectedRevision") ?? ""
        NotificationCenter.default.addObserver(self, selector: #selector(identityChanged), name: NSNotification.Name.NSUbiquityIdentityDidChange, object: nil)
    }

    @objc private func identityChanged() {
        accountChanged = true
        query?.stop()
        cloud = nil
        UserDefaults.standard.set(true, forKey: "accountChanged")
    }

    func startCloud() async {
        if UserDefaults.standard.bool(forKey: "accountChanged") { accountChanged = true; return }
        // Resolving the ubiquity container can block. Keep it off the UI thread.
        let url = await Task.detached { FileManager.default.url(forUbiquityContainerIdentifier: nil) }.value
        guard let url else { return }
        if let token = fm.ubiquityIdentityToken,
           let data = try? NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true) {
            if let previous = UserDefaults.standard.data(forKey: "iCloudIdentity"), previous != data {
                identityChanged(); return
            }
            UserDefaults.standard.set(data, forKey: "iCloudIdentity")
        }
        cloud = url.appendingPathComponent("Documents/Revisions", isDirectory: true)
        do { try fm.createDirectory(at: cloud!, withIntermediateDirectories: true) }
        catch { syncError = error.localizedDescription; cloud = nil; return }
        let query = NSMetadataQuery()
        query.searchScopes = [NSMetadataQueryUbiquitousDocumentsScope]
        query.predicate = NSPredicate(format: "%K ENDSWITH '.json'", NSMetadataItemFSNameKey)
        self.query = query
        query.start()
        synchronize()
    }

    var heads: [Revision] {
        let parents = Set(revisions.values.flatMap(\.parents))
        return revisions.values.filter { !parents.contains($0.id) }.sorted { $0.created < $1.created }
    }

    private var complete: Bool { revisions.values.allSatisfy { $0.parents.allSatisfy { revisions[$0] != nil } } }

    func synchronize() {
        guard let cloud, !accountChanged else { return }
        do {
            // Query includes files not downloaded yet; never interpret a placeholder as an empty workspace.
            query?.disableUpdates()
            let items = query?.results.compactMap { ($0 as? NSMetadataItem)?.value(forAttribute: NSMetadataItemURLKey) as? URL } ?? []
            query?.enableUpdates()
            for url in items where url.deletingLastPathComponent().standardizedFileURL == cloud.standardizedFileURL {
                if importedCloud.contains(url.lastPathComponent) { continue }
                try fm.startDownloadingUbiquitousItem(at: url)
                let values = try url.resourceValues(forKeys: [.ubiquitousItemDownloadingStatusKey])
                guard values.ubiquitousItemDownloadingStatus == .current else { continue }
                var coordinationError: NSError?
                var readError: Error?
                NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) { readable in
                    do {
                        let bytes = try Data(contentsOf: readable)
                        let revision = try JSONDecoder().decode(Revision.self, from: bytes)
                        guard UUID(uuidString: revision.id) != nil, url.lastPathComponent == revision.id + ".json" else { throw CocoaError(.fileReadCorruptFile) }
                        _ = try JSONSerialization.jsonObject(with: revision.workspace)
                        let destination = local.appendingPathComponent(url.lastPathComponent)
                        if !fm.fileExists(atPath: destination.path) { try bytes.write(to: destination, options: .atomic) }
                        revisions[revision.id] = revision
                        importedCloud.insert(url.lastPathComponent)
                    } catch { readError = error }
                }
                if let error = coordinationError ?? readError as NSError? { throw error }
            }
            for revision in revisions.values {
                let destination = cloud.appendingPathComponent(revision.id + ".json")
                if fm.fileExists(atPath: destination.path) { continue }
                var coordinationError: NSError?
                var writeError: Error?
                NSFileCoordinator().coordinate(writingItemAt: destination, options: [], error: &coordinationError) { writable in
                    do { try Data(contentsOf: local.appendingPathComponent(revision.id + ".json")).write(to: writable, options: .atomic) }
                    catch { writeError = error }
                }
                if let error = coordinationError ?? writeError as NSError? { throw error }
            }
            syncError = nil
        } catch { syncError = error.localizedDescription }
    }

    func load() throws -> [String: Any] {
        synchronize()
        if complete, heads.count == 1 { selected = heads[0].id }
        if revisions[selected] == nil, complete { selected = heads.last?.id ?? "" }
        UserDefaults.standard.set(selected, forKey: "selectedRevision")
        return try response()
    }

    func save(workspace: Any, parent: String) throws -> [String: Any] {
        guard parent.isEmpty || revisions[parent] != nil else { throw CocoaError(.fileReadCorruptFile) }
        let data = try JSONSerialization.data(withJSONObject: workspace, options: [.sortedKeys])
        guard let object = workspace as? [String: Any], object["collection"] is [Any], object["decks"] is [Any], data.count < 5_000_000 else { throw CocoaError(.fileWriteInvalidFileName) }
        try commit(data, parents: parent.isEmpty ? [] : [parent])
        return try response()
    }

    private func commit(_ data: Data, parents: [String]) throws {
        let revision = Revision(id: UUID().uuidString, parents: parents, created: Date(), device: UserDefaults.standard.string(forKey: "deviceName") ?? "Apple device", workspace: data)
        // A successful save reply means durable local write, not just a JavaScript state update.
        try JSONEncoder().encode(revision).write(to: local.appendingPathComponent(revision.id + ".json"), options: .atomic)
        revisions[revision.id] = revision
        selected = revision.id
        UserDefaults.standard.set(selected, forKey: "selectedRevision")
        synchronize()
    }

    func resolve(id: String) throws {
        guard complete, let chosen = revisions[id] else { throw CocoaError(.fileReadUnknown) }
        try commit(chosen.workspace, parents: heads.map(\.id))
    }

    func status() -> String {
        if accountChanged { return "Saved locally · Apple Account changed; sync paused" }
        if !complete { return "Saved locally · Downloading iCloud history" }
        if heads.count > 1 { return "Saved locally · Review iCloud conflict" }
        guard let cloud else { return "Saved locally · iCloud unavailable" }
        if syncError != nil { return "Saved locally · iCloud needs attention" }
        for revision in revisions.values {
            let values = try? cloud.appendingPathComponent(revision.id + ".json").resourceValues(forKeys: [.ubiquitousItemIsUploadedKey])
            if values?.ubiquitousItemIsUploaded != true { return "Saved locally · Syncing to iCloud" }
        }
        // Upload completion is not a guarantee that another device has downloaded it.
        return "Saved locally · Uploaded to iCloud"
    }

    func response() throws -> [String: Any] {
        ["data": try JSONSerialization.jsonObject(with: revisions[selected]?.workspace ?? empty), "revision": selected, "status": status(), "conflicts": max(0, heads.count - 1)]
    }
    var detail: String { syncError ?? "Changes save automatically on this device. iCloud transfers them when connected. Keep both devices on the same Apple Account. History is retained so conflicting edits are recoverable. ForceTable requires internet." }
}
