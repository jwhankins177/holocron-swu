import SwiftUI
import WebKit
import UniformTypeIdentifiers

@main struct HolocronApp: App {
    var body: some Scene { WindowGroup { AppView().ignoresSafeArea(.container, edges: .bottom) } }
}
struct AppView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> HolocronController { HolocronController() }
    func updateUIViewController(_ controller: HolocronController, context: Context) {}
}

// Serves bundled assets under a proper origin, so ES modules work without a web server.
final class BundleScheme: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        do {
            guard let request = urlSchemeTask.request.url,
                  let root = Bundle.main.url(forResource: "Web", withExtension: nil) else { throw CocoaError(.fileNoSuchFile) }
            let path = request.path == "/" ? "index.html" : String(request.path.dropFirst())
            let url = root.appendingPathComponent(path).standardizedFileURL
            guard url.path.hasPrefix(root.path + "/") else { throw CocoaError(.fileReadNoPermission) }
            let data = try Data(contentsOf: url)
            let mime: String
            if url.pathExtension == "js" { mime = "application/javascript" }
            else if url.pathExtension == "img" {
                mime = data.starts(with: [0x89,0x50,0x4e,0x47]) ? "image/png" : data.starts(with: [0x52,0x49,0x46,0x46]) ? "image/webp" : "image/jpeg"
            } else { mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream" }
            urlSchemeTask.didReceive(HTTPURLResponse(url: request, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": mime, "Content-Length": String(data.count), "Access-Control-Allow-Origin": "*"])!)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch { urlSchemeTask.didFailWithError(error) }
    }
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

@MainActor final class HolocronController: UIViewController, WKScriptMessageHandlerWithReply, WKNavigationDelegate, WKUIDelegate {
    private var web: WKWebView!
    private var store: WorkspaceStore?
    private var storeError: Error?
    private var tick: Timer?

    override func viewDidLoad() {
        super.viewDidLoad()
        do { store = try WorkspaceStore() } catch { storeError = error }
        UserDefaults.standard.set(UIDevice.current.name, forKey: "deviceName")
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(BundleScheme(), forURLScheme: "holocron")
        configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "holocron")
        web = WKWebView(frame: .zero, configuration: configuration)
        web.navigationDelegate = self
        web.uiDelegate = self
        view = web
        web.load(URLRequest(url: URL(string: "holocron://app/index.html")!))
        Task { await store?.startCloud() }
        tick = Timer.scheduledTimer(withTimeInterval: 6, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.store?.synchronize() }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "holocron",
              let body = message.body as? [String: Any], let action = body["action"] as? String else { replyHandler(nil, "Untrusted request"); return }
        do {
            guard let store else { throw storeError ?? CocoaError(.fileReadUnknown) }
            switch action {
            case "load": replyHandler(try store.load(), nil)
            case "save":
                guard let data = body["data"], let revision = body["revision"] as? String else { throw CocoaError(.coderInvalidValue) }
                replyHandler(try store.save(workspace: data, parent: revision), nil)
            case "copy": UIPasteboard.general.string = body["text"] as? String; replyHandler(true, nil)
            case "open":
                guard let text = body["url"] as? String, let url = URL(string: text), url.scheme == "https" else { throw CocoaError(.coderInvalidValue) }
                UIApplication.shared.open(url); replyHandler(true, nil)
            case "export":
                guard let text = body["data"] as? String, let name = body["name"] as? String else { throw CocoaError(.coderInvalidValue) }
                let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                let url = folder.appendingPathComponent(URL(fileURLWithPath: name).lastPathComponent)
                try Data(text.utf8).write(to: url, options: .atomic)
                let share = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                share.popoverPresentationController?.sourceView = view
                share.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
                present(share, animated: true); replyHandler(true, nil)
            case "conflicts": showSync(); replyHandler(true, nil)
            default: replyHandler(nil, "Unknown operation")
            }
        } catch { replyHandler(nil, error.localizedDescription) }
    }

    private func showSync() {
        guard let store else { return }
        _ = try? store.load()
        let choices = store.heads
        let conflict = choices.count > 1
        let alert = UIAlertController(title: conflict ? "Choose the collection to continue with" : store.status(), message: conflict ? "Both versions are preserved in history. Choosing one uses its complete collection and decks on both devices. Export a backup before choosing if you want to combine them manually." : store.detail, preferredStyle: .alert)
        if conflict {
            for revision in choices {
                let data = (try? JSONSerialization.jsonObject(with: revision.workspace)) as? [String: Any]
                let decks = (data?["decks"] as? [Any])?.count ?? 0
                let rows = (data?["collection"] as? [Any])?.count ?? 0
                let label = "\(revision.device) · \(revision.created.formatted()) · \(rows) rows / \(decks) decks"
                alert.addAction(UIAlertAction(title: label, style: .default) { [weak self] _ in
                    do { try store.resolve(id: revision.id) }
                    catch { self?.showError(error.localizedDescription) }
                })
            }
        }
        alert.addAction(UIAlertAction(title: "Close", style: .cancel))
        present(alert, animated: true)
    }
    private func showError(_ text: String) {
        let alert = UIAlertController(title: "Could not save", message: text, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default)); present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "Holocron", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "holocron" { decisionHandler(.allow) }
        else { if url.scheme == "https" { UIApplication.shared.open(url) }; decisionHandler(.cancel) }
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, url.scheme == "https" { UIApplication.shared.open(url) }
        return nil
    }
}
