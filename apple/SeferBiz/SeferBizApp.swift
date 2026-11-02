import SwiftUI

@main
struct SeferBizApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(model)
                .task { await model.restoreSession() }
        }
        .defaultSize(width: 1100, height: 760)
    }
}
