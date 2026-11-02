import Foundation

struct UserProfile: Decodable, Sendable {
    let id: Int
    let email: String
    let firstName: String
    let lastName: String

    var displayName: String {
        let name = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? email : name
    }

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case firstName = "first_name"
        case lastName = "last_name"
    }
}

struct LoginResponse: Decodable, Sendable {
    let accessToken: String
    let user: UserProfile

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case user
    }
}

struct UserEnvelope: Decodable, Sendable {
    let user: UserProfile
}

struct LoginRequest: Encodable, Sendable {
    let email: String
    let password: String
    let otpAttempt: String?

    enum CodingKeys: String, CodingKey {
        case email
        case password
        case otpAttempt = "otp_attempt"
    }
}

struct BusinessYear: Decodable, Identifiable, Hashable, Sendable {
    let id: Int
    let year: Int
}

struct YearSummary: Decodable, Sendable {
    let year: Int
    let incomeTotal: Double
    let expensesTotal: Double
    let netIncome: Double
    let taxOwed: Double

    enum CodingKeys: String, CodingKey {
        case year
        case incomeTotal = "income_total"
        case expensesTotal = "expenses_total"
        case netIncome = "net_income"
        case taxOwed = "tax_owed"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        year = try container.decode(Int.self, forKey: .year)
        incomeTotal = try container.decodeFlexibleDouble(forKey: .incomeTotal) ?? 0
        expensesTotal = try container.decodeFlexibleDouble(forKey: .expensesTotal) ?? 0
        netIncome = try container.decodeFlexibleDouble(forKey: .netIncome) ?? 0
        taxOwed = try container.decodeFlexibleDouble(forKey: .taxOwed) ?? 0
    }
}

struct InvoiceRecord: Decodable, Identifiable, Sendable {
    let id: Int
    let date: String?
    let description: String?
    let status: String?
    let cost: Double
    let displayID: String?
    let clientName: String?

    enum CodingKeys: String, CodingKey {
        case id
        case date
        case description
        case status
        case cost
        case displayID = "display_id"
        case clientName = "client_name"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        date = try container.decodeIfPresent(String.self, forKey: .date)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        status = try container.decodeIfPresent(String.self, forKey: .status)
        cost = try container.decodeFlexibleDouble(forKey: .cost) ?? 0
        displayID = try container.decodeIfPresent(String.self, forKey: .displayID)
        clientName = try container.decodeIfPresent(String.self, forKey: .clientName)
    }

    var title: String {
        let text = description?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return text.isEmpty ? displayID ?? "Invoice #\(id)" : text
    }
}

struct ExpenseRecord: Decodable, Identifiable, Sendable {
    let id: Int
    let name: String
    let date: String
    let cost: Double
    let account: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case date
        case cost
        case account
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Expense"
        date = try container.decodeIfPresent(String.self, forKey: .date) ?? ""
        cost = try container.decodeFlexibleDouble(forKey: .cost) ?? 0
        account = try container.decodeIfPresent(String.self, forKey: .account)
    }
}

private extension KeyedDecodingContainer {
    func decodeFlexibleDouble(forKey key: Key) throws -> Double? {
        if try decodeNil(forKey: key) { return nil }
        if let number = try? decode(Double.self, forKey: key) { return number }
        if let text = try? decode(String.self, forKey: key) { return Double(text) }
        return nil
    }
}