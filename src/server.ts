import websocket from "websocket";
import winston from "winston";

import http from "http";

import DiscordLinkBot from "./bot";

export default class DiscordLinkServer {
    config;
    logger: winston.Logger;

    private httpServer: http.Server;
    private server: websocket.server;
    private bot: DiscordLinkBot;

    constructor(config, logger: winston.Logger) {
        this.config = config;
        this.logger = logger;

        this.httpServer = http.createServer(this.httpServerCallback);
        this.server = new websocket.server({ httpServer: this.httpServer, autoAcceptConnections: false});
        this.server.on('request', this.onWebsocketRequest);

        this.bot = new DiscordLinkBot(this);
    }

    httpServerCallback(request, response) {
        // 400 BAD REQUEST for all requests, this is a websocket only endpoint
        response.writeHead(400);
        response.end();
    }

    onWebsocketRequest(request: websocket.request) {
        if(request.origin == null || request.origin == "*") {
            let connection = request.accept("discord-bridge-protocol", request.origin);
            this.logger.debug("Accepted WebSocket connection from: " + connection.remoteAddress);
            //TODO : create connection instance and such
        } else request.reject(); // Origin isn't null or *, client is a web browser which we have no business with
    }

    onPing(req, res) {
        // TODO: Process pings
    }

    run() {
        this.httpServer.listen(this.config.server.port, () => {
            this.logger.info("Listening on port " + this.config.server.port);
        });
    }
}