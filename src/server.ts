import websocket from "websocket";
import winston from "winston";

import http from "http";

import DiscordLinkBot from "./bot";
import Connection, {Packets} from "./network";

// Main Server class which listens for data from bridged services and pushes data to them
export default class DiscordLinkServer {
    config;
    logger: winston.Logger;

    packetsInstance: Packets;

    bot: DiscordLinkBot;
    private httpServer: http.Server;
    private server: websocket.server;

    constructor(config, logger: winston.Logger, serverOnly:boolean = false) {
        this.config = config;
        this.logger = logger;

        this.packetsInstance = new Packets();
        this.packetsInstance.load(config.protocolRoot);

        this.httpServer = http.createServer(this.httpServerCallback);
        this.server = new websocket.server({ httpServer: this.httpServer, autoAcceptConnections: false});
        this.server.on('request', this.onWebsocketRequest.bind(this));

        if(!serverOnly) this.bot = new DiscordLinkBot(this);
    }

    httpServerCallback(request, response) {
        // 400 BAD REQUEST for all requests, this is a websocket only endpoint
        response.writeHead(400);
        response.end();
    }

    onWebsocketRequest(request: websocket.request) {
        if(request.origin == null || request.origin == "*") {
            let wsconnection = request.accept("discord-link-protocol", request.origin);
            this.logger.debug("Accepted WebSocket connection from: " + wsconnection.remoteAddress);

            new Connection(this, wsconnection);
        } else request.reject(); // Origin isn't null or *, client is a web browser which we have no business with
    }

    run() {
        this.httpServer.listen(this.config.server.port, () => {
            this.logger.info("Listening on port " + this.config.server.port);
        });
    }

    stop() {
        this.logger.info("Shutting down server.");
        this.server.shutDown();
        this.httpServer.close();
    }
}

// Represents a connected Service, which handles bridging between the service itself and discord.
export class Service {
    name: string;

    private server: DiscordLinkServer;
    private connection: Connection;

    constructor(server: DiscordLinkServer, connection: Connection) {
        this.server = server;
        this.connection = connection;
    }
}