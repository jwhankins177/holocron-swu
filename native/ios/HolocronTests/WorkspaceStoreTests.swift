import XCTest
@testable import Holocron

@MainActor final class WorkspaceStoreTests: XCTestCase {
    private func directory() throws -> URL {
        let path = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: path, withIntermediateDirectories: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: path) }
        return path
    }
    private func data(_ count: Int) -> [String: Any] {
        ["collection": [["id": "SOR_005", "count": count, "foil": false]], "decks": []]
    }
    func testLocalSaveSurvivesReopen() throws {
        let path = try directory()
        let store = try WorkspaceStore(localURL: path)
        let saved = try store.save(workspace: data(3), parent: "")
        let reopened = try WorkspaceStore(localURL: path)
        let restored = try reopened.load()
        XCTAssertEqual(saved["revision"] as? String, restored["revision"] as? String)
        let state = restored["data"] as! [String: Any]
        XCTAssertEqual((state["collection"] as! [[String: Any]])[0]["count"] as? Int, 3)
    }
    func testConcurrentBranchesPreservedAndExplicitlyResolved() throws {
        let path = try directory()
        let store = try WorkspaceStore(localURL: path)
        let first = try store.save(workspace: data(1), parent: "")
        let parent = first["revision"] as! String
        let left = try store.save(workspace: data(2), parent: parent)
        _ = try store.save(workspace: data(5), parent: parent)
        XCTAssertEqual(store.heads.count, 2)
        XCTAssertTrue(store.status().contains("conflict"))
        try store.resolve(id: left["revision"] as! String)
        XCTAssertEqual(store.heads.count, 1)
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: path.path).count, 4)
        let state = try store.load()["data"] as! [String: Any]
        XCTAssertEqual((state["collection"] as! [[String: Any]])[0]["count"] as? Int, 2)
    }
    func testInvalidParentAndPayloadDoNotCreateRevision() throws {
        let store = try WorkspaceStore(localURL: directory())
        XCTAssertThrowsError(try store.save(workspace: data(1), parent: "missing"))
        XCTAssertThrowsError(try store.save(workspace: ["other": "value"], parent: ""))
        XCTAssertEqual(store.heads.count, 0)
    }
    func testCorruptDiskDataFailsWithoutResetting() throws {
        let path = try directory()
        try Data("broken".utf8).write(to: path.appendingPathComponent("broken.json"))
        XCTAssertThrowsError(try WorkspaceStore(localURL: path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: path.appendingPathComponent("broken.json").path))
    }
}
