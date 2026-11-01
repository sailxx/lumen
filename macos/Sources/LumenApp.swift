import AppKit
import SwiftUI

@main
struct LumenApp: App {
    @StateObject private var displays = DisplayStore()

    var body: some Scene {
        MenuBarExtra("Lumen", systemImage: "sun.max.fill") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label("Lumen", systemImage: "sun.max.fill").font(.headline)
                    Spacer()
                    Button { displays.refresh() } label: { Image(systemName: "arrow.clockwise") }
                        .buttonStyle(.plain).help("Refresh displays")
                }
                Divider()
                if let error = displays.error {
                    Text(error).font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                } else if displays.items.isEmpty {
                    Text("No DDC/CI displays found.").font(.caption).foregroundStyle(.secondary)
                    Text("Connect an external display and enable DDC/CI in its on-screen menu.")
                        .font(.caption2).foregroundStyle(.tertiary).fixedSize(horizontal: false, vertical: true)
                }
                ForEach($displays.items) { $display in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack {
                            Text(display.name).lineLimit(1)
                            Spacer()
                            Text("\(Int(display.brightness.rounded()))%")
                                .monospacedDigit().foregroundStyle(.secondary)
                        }
                        Slider(value: $display.brightness, in: 0...100, step: 1) { editing in
                            if !editing { displays.set(display) }
                        }
                        .onChange(of: display.brightness) { _ in displays.scheduleSet(display) }
                    }
                }
                Divider()
                HStack {
                    Text(displays.status).font(.caption2).foregroundStyle(.secondary).lineLimit(2)
                    Spacer()
                    Button("Quit") { NSApplication.shared.terminate(nil) }.keyboardShortcut("q")
                }
            }
            .padding(14).frame(width: 300)
            .task { displays.refresh() }
        }
        .menuBarExtraStyle(.window)
    }
}

struct Display: Identifiable {
    let id: Int
    var name: String
    var brightness: Double
}

@MainActor final class DisplayStore: ObservableObject {
    @Published var items: [Display] = []
    @Published var error: String?
    @Published var status = "Apple Silicon · DDC/CI"
    private var pending: [Int: DispatchWorkItem] = [:]

    func refresh() {
        do {
            let output = try run(["display", "list"])
            let names = output.components(separatedBy: .newlines).compactMap { line -> String? in
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                guard let match = trimmed.range(of: #"^(\d+)\s*[-.):]\s*(.+)$"#, options: .regularExpression) else { return nil }
                let parsed = String(trimmed[match])
                let name = parsed.replacingOccurrences(of: #"^\d+\s*[-.):]\s*"#, with: "", options: .regularExpression)
                return name.isEmpty ? nil : name
            }
            items = try names.enumerated().map { index, name in
                let id = index + 1
                let value = try run(["display", String(id), "get", "luminance"])
                guard let percent = value.range(of: #"\d+(?:\.\d+)?"#, options: .regularExpression)
                    .flatMap({ Double(value[$0]) }) else { throw BackendError.unreadable(name) }
                return Display(id: id, name: name, brightness: min(100, max(0, percent)))
            }
            error = nil
            status = items.isEmpty ? "Waiting for a DDC/CI display" : "\(items.count) display(s)"
        } catch {
            items = []
            self.error = error.localizedDescription
            status = "Check m1ddc installation"
        }
    }

    func scheduleSet(_ display: Display) {
        pending[display.id]?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.set(display) }
        pending[display.id] = work
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(180), execute: work)
    }

    func set(_ display: Display) {
        do {
            _ = try run(["display", String(display.id), "set", "luminance", String(Int(display.brightness.rounded()))])
            error = nil
        } catch { self.error = error.localizedDescription }
    }

    private func run(_ arguments: [String]) throws -> String {
        let candidates = ["/opt/homebrew/bin/m1ddc", "/usr/local/bin/m1ddc"]
        guard let path = candidates.first(where: FileManager.default.isExecutableFile(atPath:)) else {
            throw BackendError.missingTool
        }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: path)
        process.arguments = arguments
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        try process.run()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        let text = String(decoding: data, as: UTF8.self)
        guard process.terminationStatus == 0 else { throw BackendError.command(text.trimmingCharacters(in: .whitespacesAndNewlines)) }
        return text
    }
}

enum BackendError: LocalizedError {
    case missingTool, unreadable(String), command(String)
    var errorDescription: String? {
        switch self {
        case .missingTool: return "Install m1ddc with Homebrew: brew install m1ddc"
        case .unreadable(let name): return "Could not read brightness for \(name)."
        case .command(let output): return output.isEmpty ? "m1ddc could not control this display." : output
        }
    }
}
