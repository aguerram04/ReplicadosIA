import Vapor

public func configure(_ app: Application) throws {
    app.middleware.use(CORSMiddleware(configuration: .init(
        allowedOrigin: .all,
        allowedMethods: [.GET, .POST, .OPTIONS],
        allowedHeaders: [.accept, .contentType, .origin, .authorization]
    )))

    try routes(app)
}


