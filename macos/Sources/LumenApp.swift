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
                        .onChange(of: display.brightness) { newValue in displays.scheduleSet(display, to: newValue) }
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
        }.menuBarExtraStyle(.window)
    }
}

struct DisplayItem: Identifiable {
    let id: Int
    let name: String
    var brightness: Double
}

@MainActor
final class DisplayStore: ObservableObject {
    @Published var items: [DisplayItem] = []
    @Published var status: String = "Scanning displays..."
    @Published var error: String? = nil

    private var pending: [Int: DispatchWorkItem] = [:]

    init() { refresh() }

    func refresh() {
        do {
            let output = try Self.run(["display", "list"])
            let parsed = output.components(separatedBy: .newlines).compactMap { line -> (id: Int, name: String)? in
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                guard !trimmed.isEmpty else { return nil }
                
                guard let match = trimmed.range(of: #"^(?:\[?(\d+)\]?|Display\s+(\d+))[:\s-]+(.*)$"#, options: .regularExpression) else {
                    return nil
                }
                let matchedStr = String(trimmed[match])
                let idDigits = matchedStr.components(separatedBy: CharacterSet.decimalDigits.inverted).filter { !$0.isEmpty }
                guard let firstId = idDigits.first, let num = Int(firstId) else { return nil }
                let rawName = trimmed.replacingOccurrences(of: #"^(?:\[?\d+\]?|Display\s+\d+)[:\s-]+"#, with: "", options: .regularExpression)
                    .replacingOccurrences(of: #"\s*\(.*\)$"#, with: "", options: .regularExpression)
                    .trimmingCharacters(in: .whitespaces)
                return (id: num, name: rawName.isEmpty ? "Display \(num)" : rawName)
            }
            
            items = parsed.compactMap { display in
                let percent: Double
                if let value = try? Self.run(["display", String(display.id), "get", "luminance"]),
                   let parsedVal = value.range(of: #"\d+(?:\.\d+)?"#, options: .regularExpression)
                    .flatMap({ Double(value[$0]) }) {
                    percent = min(100, max(0, parsedVal))
                } else {
                    percent = 50.0
                }
                return DisplayItem(id: display.id, name: display.name, brightness: percent)
            }
            error = nil
            status = items.isEmpty ? "Waiting for a DDC/CI display" : "\(items.count) display(s)"
        } catch {
            items = []
            self.error = error.localizedDescription
            status = "Check m1ddc installation"
        }
    }

    func scheduleSet(_ display: DisplayItem, to newValue: Double) {
        pending[display.id]?.cancel()
        var target = display
        target.brightness = newValue
        let work = DispatchWorkItem { [weak self] in self?.set(target) }
        pending[display.id] = work
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(180), execute: work)
    }

    func set(_ display: DisplayItem) {
        let id = display.id
        let val = String(Int(display.brightness.rounded()))
        Task.detached { [weak self] in
            do {
                _ = try Self.run(["display", String(id), "set", "luminance", val])
                await MainActor.run { [weak self] in self?.error = nil }
            } catch {
                let message = error.localizedDescription
                await MainActor.run { [weak self] in self?.error = message }
            }
        }
    }

    private static func run(_ arguments: [String]) throws -> String {
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
