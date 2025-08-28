import Vapor

func routes(_ app: Application) throws {
    app.get { _ in
        return "HeyGen Token Service is running"
    }

    app.on(.POST, "api", "heygen", "streaming", "create-token") { req async throws -> Response in
        guard let apiKey = Environment.get("HEYGEN_API_KEY"), !apiKey.isEmpty else {
            throw Abort(.internalServerError, reason: "HEYGEN_API_KEY env is missing")
        }

        var headers = HTTPHeaders()
        headers.add(name: .contentType, value: "application/json")
        headers.add(name: "X-Api-Key", value: apiKey)

        let clientResponse = try await req.client.post(URI(string: "https://api.heygen.com/v1/streaming.create_token")) { outgoing in
            outgoing.headers = headers
        }

        var body = ByteBuffer()
        if var respBody = clientResponse.body { body.writeBuffer(&respBody) }
        return Response(status: clientResponse.status, headers: clientResponse.headers, body: .init(buffer: body))
    }
}


