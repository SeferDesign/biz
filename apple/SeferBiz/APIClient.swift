import Foundation

struct APIClient: Sendable {
    let baseURL: String

    private static let session: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCache = nil
        return URLSession(configuration: configuration)
    }()

    func get<Response: Decodable & Sendable>(_ path: String, token: String) async throws -> Response {
        let data = try await perform(path, method: "GET", token: token)
        return try JSONDecoder().decode(Response.self, from: data)
    }

    func post<Body: Encodable, Response: Decodable>(
        _ path: String,
        body: Body,
        token: String? = nil
    ) async throws -> Response where Body: Sendable, Response: Decodable & Sendable {
        let encodedBody = try JSONEncoder().encode(body)
        let data = try await perform(path, method: "POST", token: token, body: encodedBody)
        return try JSONDecoder().decode(Response.self, from: data)
    }

    func perform(
        _ path: String,
        method: String,
        token: String? = nil,
        body: Data? = nil
    ) async throws -> Data {
        let normalizedBase = baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(normalizedBase)/\(path)") else {
            throw APIError.invalidServerAddress
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await Self.session.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(response.statusCode) else {
            let message = (try? JSONDecoder().decode(APIErrorBody.self, from: data).error)
            throw APIError.httpStatus(response.statusCode, message ?? "The request could not be completed.")
        }
        return data
    }
}

private struct APIErrorBody: Decodable, Sendable {
    let error: String
}

enum APIError: LocalizedError {
    case invalidServerAddress
    case invalidResponse
    case httpStatus(Int, String)

    var errorDescription: String? {
        switch self {
        case .invalidServerAddress:
            return "Enter a valid API address ending in /v1."
        case .invalidResponse:
            return "The server returned an invalid response."
        case let .httpStatus(_, message):
            return message
        }
    }

    var statusCode: Int? {
        guard case let .httpStatus(status, _) = self else { return nil }
        return status
    }
}
