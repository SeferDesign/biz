import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    private(set) var token: String?
    private(set) var user: UserProfile?
    private(set) var years: [BusinessYear] = []
    private(set) var summary: YearSummary?
    private(set) var invoices: [InvoiceRecord] = []
    private(set) var expenses: [ExpenseRecord] = []
    var selectedYearID: Int?
    var apiBaseURL: String {
        didSet { UserDefaults.standard.set(apiBaseURL, forKey: Self.apiBaseURLKey) }
    }
    private(set) var isLoading = false
    var errorMessage: String?

    private static let apiBaseURLKey = "apiBaseURL"
    private var didRestoreSession = false

    init() {
        apiBaseURL = UserDefaults.standard.string(forKey: Self.apiBaseURLKey)
            ?? "https://api.biz.seferdesign.com/v1"
        token = KeychainTokenStore.read()
    }

    func signIn(email: String, password: String, otp: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let request = LoginRequest(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password,
                otpAttempt: otp.isEmpty ? nil : otp
            )
            let response: LoginResponse = try await client.post("auth/login", body: request)
            try KeychainTokenStore.save(response.accessToken)
            token = response.accessToken
            user = response.user
            await loadBusinessData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() {
        let savedToken = token
        token = nil
        user = nil
        years = []
        summary = nil
        invoices = []
        expenses = []
        selectedYearID = nil
        KeychainTokenStore.delete()
        if let savedToken {
            Task { try? await client.perform("auth/logout", method: "POST", token: savedToken) }
        }
    }

    func refresh() async {
        await loadBusinessData()
    }

    func loadSelectedYear() async {
        guard token != nil, selectedYearID != nil else { return }
        await loadSelectedYearData()
    }

    func setServerAddress(_ value: String) {
        apiBaseURL = value.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private var client: APIClient { APIClient(baseURL: apiBaseURL) }

    func restoreSession() async {
        guard !didRestoreSession else { return }
        didRestoreSession = true
        guard let token else { return }
        do {
            let envelope: UserEnvelope = try await client.get("auth/session", token: token)
            user = envelope.user
            await loadBusinessData()
        } catch let error as APIError where error.statusCode == 401 {
            signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadBusinessData() async {
        guard let token else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            years = try await client.get("years", token: token)
            if let selectedYearID, years.contains(where: { $0.id == selectedYearID }) {
                self.selectedYearID = selectedYearID
            } else {
                selectedYearID = years.first?.id
            }
            await loadSelectedYearData()
        } catch let error as APIError where error.statusCode == 401 {
            signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadSelectedYearData() async {
        guard let token, let year = years.first(where: { $0.id == selectedYearID }) else {
            summary = nil
            invoices = []
            expenses = []
            return
        }

        isLoading = true
        defer { isLoading = false }
        do {
            async let yearRequest: YearSummary = client.get("years/\(year.id)", token: token)
            async let invoiceRequest: [InvoiceRecord] = client.get("invoices", token: token)
            async let expenseRequest: [ExpenseRecord] = client.get("expenses?all=true", token: token)
            let (loadedSummary, allInvoices, allExpenses) = try await (yearRequest, invoiceRequest, expenseRequest)
            summary = loadedSummary
            invoices = allInvoices
                .filter { $0.date?.hasPrefix(String(year.year)) == true }
                .sorted { ($0.date ?? "") > ($1.date ?? "") }
            expenses = allExpenses
                .filter { $0.date.hasPrefix(String(year.year)) }
                .sorted { $0.date > $1.date }
        } catch let error as APIError where error.statusCode == 401 {
            signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
