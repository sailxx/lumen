// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LumenMenuBar",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "Lumen", targets: ["LumenMenuBar"])],
    targets: [.executableTarget(name: "LumenMenuBar", path: "Sources")]
)
