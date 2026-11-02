import SwiftUI
import Charts

private enum AppSection: String, CaseIterable, Identifiable {
    case overview
    case invoices
    case expenses

    var id: String { rawValue }
    var title: String { rawValue.capitalized }

    var symbol: String {
        switch self {
        case .overview: "chart.bar.xaxis"
        case .invoices: "doc.text"
        case .expenses: "creditcard"
        }
    }
}

struct ContentView: View {
    @Environment(AppModel.self) private var model
    @State private var section: AppSection = .overview

    var body: some View {
        Group {
            if model.user == nil {
                LoginView()
            } else {
                mainNavigation
            }
        }
        .tint(Color(red: 0.13, green: 0.46, blue: 0.39))
        .sensoryFeedback(.selection, trigger: section)
        .alert("Unable to load SeferBiz", isPresented: errorIsPresented) {
            Button("OK", role: .cancel) { model.errorMessage = nil }
        } message: {
            Text(model.errorMessage ?? "Please try again.")
        }
    }

    private var mainNavigation: some View {
        TabView(selection: $section) {
            Tab(AppSection.overview.title, systemImage: AppSection.overview.symbol, value: .overview) {
                BusinessSectionNavigation(model: model, title: AppSection.overview.title) {
                    OverviewView(model: model)
                }
            }
            Tab(AppSection.invoices.title, systemImage: AppSection.invoices.symbol, value: .invoices) {
                BusinessSectionNavigation(model: model, title: AppSection.invoices.title) {
                    InvoiceListView(invoices: model.invoices) { await model.refresh() }
                }
            }
            Tab(AppSection.expenses.title, systemImage: AppSection.expenses.symbol, value: .expenses) {
                BusinessSectionNavigation(model: model, title: AppSection.expenses.title) {
                    ExpenseListView(expenses: model.expenses) { await model.refresh() }
                }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
        .onChange(of: model.selectedYearID) { _, _ in
            Task { await model.loadSelectedYear() }
        }
    }

    private var errorIsPresented: Binding<Bool> {
        Binding(
            get: { model.user != nil && model.errorMessage != nil },
            set: { if !$0 { model.errorMessage = nil } }
        )
    }
}

private struct LoginView: View {
    @Environment(AppModel.self) private var model
    @State private var email = ""
    @State private var password = ""
    @State private var otp = ""

    var body: some View {
        VStack(spacing: 30) {
            VStack(spacing: 8) {
                Image(systemName: "chart.bar.xaxis")
                    .font(.system(size: 36, weight: .medium))
                    .foregroundStyle(Color(red: 0.13, green: 0.46, blue: 0.39))
                Text("SeferBiz")
                    .font(.largeTitle.weight(.bold))
                Text("Your business, in focus")
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 16) {
                Text("Sign in")
                    .font(.title2.weight(.semibold))
                TextField("Email", text: $email)
                    .textContentType(.username)
                    #if os(iOS)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    #endif
                    .autocorrectionDisabled()
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(.background.opacity(0.65), in: RoundedRectangle(cornerRadius: 12))
                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(.background.opacity(0.65), in: RoundedRectangle(cornerRadius: 12))
                TextField("Two-factor code (if enabled)", text: $otp)
                    #if os(iOS)
                    .keyboardType(.numberPad)
                    #endif
                    .textContentType(.oneTimeCode)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(.background.opacity(0.65), in: RoundedRectangle(cornerRadius: 12))

                if let error = model.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    Task { await model.signIn(email: email, password: password, otp: otp) }
                } label: {
                    HStack {
                        if model.isLoading { ProgressView().controlSize(.small) }
                        Text("Sign In")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 5)
                }
                .buttonStyle(.glassProminent)
                .disabled(model.isLoading || email.isEmpty || password.isEmpty)
            }
            .padding(24)
            .frame(maxWidth: 420)
            .glassEffect(.regular, in: .rect(cornerRadius: 26))
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background {
            LinearGradient(
                colors: [Color.mint.opacity(0.2), .clear, Color.orange.opacity(0.12)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .background(.background)
            .ignoresSafeArea()
        }
    }
}

private struct OverviewView: View {
    @Bindable var model: AppModel

    private let columns = [GridItem(.adaptive(minimum: 165), spacing: 12)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
            if let summary = model.summary {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("\(summary.year) at a glance")
                            .font(.title2.weight(.bold))
                        Spacer()
                        Text("Updated just now")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    LazyVGrid(columns: columns, spacing: 14) {
                        MetricTile(title: "Income", amount: summary.incomeTotal, symbol: "arrow.down.left", tint: .teal)
                        MetricTile(title: "Expenses", amount: summary.expensesTotal, symbol: "arrow.up.right", tint: .orange)
                        MetricTile(title: "Net Income", amount: summary.netIncome, symbol: "equal", tint: .green)
                        MetricTile(title: "Estimated Tax", amount: summary.taxOwed, symbol: "percent", tint: .blue)
                    }
                }
            }

            if let summary = model.summary {
                AnnualChart(summary: summary)
            }

            if model.invoices.isEmpty {
                ContentUnavailableView("No invoices this year", systemImage: "doc.text")
            } else {
                RecentSection(title: "Recent invoices", symbol: "doc.text") {
                    ForEach(model.invoices.prefix(5)) { invoice in
                        InvoiceRow(invoice: invoice)
                    }
                }
            }

            if model.expenses.isEmpty {
                ContentUnavailableView("No expenses this year", systemImage: "creditcard")
            } else {
                RecentSection(title: "Recent expenses", symbol: "creditcard") {
                    ForEach(model.expenses.prefix(5)) { expense in
                        ExpenseRow(expense: expense)
                    }
                }
            }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 20)
        }
        .overlay {
            if model.years.isEmpty && !model.isLoading {
                ContentUnavailableView("No financial years", systemImage: "calendar")
            }
        }
        .refreshable { await model.refresh() }
    }
}

private struct InvoiceListView: View {
    let invoices: [InvoiceRecord]
    let onRefresh: () async -> Void

    var body: some View {
        List {
            if invoices.isEmpty {
                ContentUnavailableView("No invoices this year", systemImage: "doc.text")
            } else {
                ForEach(invoices) { invoice in
                    InvoiceRow(invoice: invoice)
                }
            }
        }
        .listStyle(.inset)
        .refreshable { await onRefresh() }
    }
}

private struct ExpenseListView: View {
    let expenses: [ExpenseRecord]
    let onRefresh: () async -> Void

    var body: some View {
        List {
            if expenses.isEmpty {
                ContentUnavailableView("No expenses this year", systemImage: "creditcard")
            } else {
                ForEach(expenses) { expense in
                    ExpenseRow(expense: expense)
                }
            }
        }
        .listStyle(.inset)
        .refreshable { await onRefresh() }
    }
}

private struct MetricTile: View {
    let title: String
    let amount: Double
    let symbol: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Image(systemName: symbol)
                .font(.headline.weight(.semibold))
                .foregroundStyle(tint)
                .frame(width: 38, height: 38)
                .background(tint.opacity(0.13), in: RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(amount.formatted(.currency(code: "USD")))
                    .font(.title2.weight(.bold).monospacedDigit())
                    .minimumScaleFactor(0.75)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 136, alignment: .leading)
        .padding(18)
        .glassEffect(.regular, in: .rect(cornerRadius: 20))
    }
}

private struct InvoiceRow: View {
    let invoice: InvoiceRecord

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(invoice.title).font(.body.weight(.medium)).lineLimit(1)
                Text([invoice.displayID, invoice.clientName, invoice.date].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 4) {
                Text(invoice.cost.formatted(.currency(code: "USD")))
                    .font(.subheadline.weight(.semibold).monospacedDigit())
                Text((invoice.status ?? "draft").capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 3)
    }
}

private struct ExpenseRow: View {
    let expense: ExpenseRecord

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(expense.name).font(.body.weight(.medium)).lineLimit(1)
                Text([expense.date, expense.account].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            Text(expense.cost.formatted(.currency(code: "USD")))
                .font(.subheadline.weight(.semibold).monospacedDigit())
        }
        .padding(.vertical, 3)
    }
}

private struct SettingsView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var serverAddress: String

    init(model: AppModel) {
        self.model = model
        _serverAddress = State(initialValue: model.apiBaseURL)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("API") {
                    TextField("API address", text: $serverAddress)
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        #endif
                        .autocorrectionDisabled()
                    Text("Use the full address ending in /v1. For local development, use your machine's reachable API address.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .formStyle(.grouped)
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        model.setServerAddress(serverAddress)
                        dismiss()
                        Task { await model.refresh() }
                    }
                }
            }
            .frame(minWidth: 360, minHeight: 240)
        }
    }
}

private struct BusinessSectionNavigation<Content: View>: View {
    @Bindable var model: AppModel
    let title: String
    @ViewBuilder let content: Content
    @State private var isShowingSettings = false

    init(model: AppModel, title: String, @ViewBuilder content: () -> Content) {
        self.model = model
        self.title = title
        self.content = content()
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle(title)
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Picker("Financial year", selection: $model.selectedYearID) {
                            ForEach(model.years) { year in
                                Text(String(year.year)).tag(Optional(year.id))
                            }
                        }
                        .pickerStyle(.menu)
                        .disabled(model.years.isEmpty)
                    }
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Button("Refresh", systemImage: "arrow.clockwise") {
                                Task { await model.refresh() }
                            }
                            Button("Settings", systemImage: "gearshape") {
                                isShowingSettings = true
                            }
                            Divider()
                            Button("Sign Out", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                                model.signOut()
                            }
                        } label: {
                            Label(model.user?.displayName ?? "Account", systemImage: "person.crop.circle")
                        }
                        .help("Account actions")
                    }
                }
                .sheet(isPresented: $isShowingSettings) {
                    SettingsView(model: model)
                }
        }
    }
}

private struct RecentSection<Content: View>: View {
    let title: String
    let symbol: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title, systemImage: symbol)
                .font(.title3.weight(.semibold))
            VStack(spacing: 0) {
                content
            }
            .padding(12)
            .glassEffect(.regular, in: .rect(cornerRadius: 18))
        }
    }
}

private struct AnnualChart: View {
    let summary: YearSummary

    private var values: [ChartValue] {
        [
            ChartValue(label: "Income", amount: summary.incomeTotal, tint: .teal),
            ChartValue(label: "Expenses", amount: summary.expensesTotal, tint: .orange),
            ChartValue(label: "Net", amount: summary.netIncome, tint: .green)
        ]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Annual comparison")
                .font(.title3.weight(.semibold))
            Chart(values) { value in
                BarMark(
                    x: .value("Amount", value.amount),
                    y: .value("Metric", value.label)
                )
                .foregroundStyle(value.tint.gradient)
                .cornerRadius(7)
                .annotation(position: .trailing, alignment: .center) {
                    Text(value.amount.formatted(.currency(code: "USD")))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 150)
        }
        .padding(18)
        .glassEffect(.regular, in: .rect(cornerRadius: 20))
    }
}

private struct ChartValue: Identifiable {
    let label: String
    let amount: Double
    let tint: Color

    var id: String { label }
}
