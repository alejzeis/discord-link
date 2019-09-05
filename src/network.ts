import websocket from "websocket";

import DiscordLinkServer from "./server";

export default class Connection {
    private server: DiscordLinkServer;
    private connection: websocket.connection;

    constructor(server: DiscordLinkServer, connection: websocket.connection) {
        this.server = server;
        this.connection = connection;

        this.connection.on("message", this.onMessage);
        this.connection.on("close", this.onClose);
    }

    onMessage(message) {

    }

    onClose() {

    }
}