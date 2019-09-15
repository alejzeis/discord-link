import websocket from "websocket";
import protobuf from "protobufjs";

import DiscordLinkServer from "./server";

import fs from "fs";
import {
    ID_ClientAuthenticationAccepted,
    ID_ClientAuthenticationDenied,
    ID_ClientAuthenticationRequest
} from "./protocol";

export class Packets {
    ClientAuthenticationRequest;
    ClientAuthenticationAccepted;
    ClientAuthenticationDenied;

    load(protoRoot: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if(!fs.existsSync(protoRoot)) reject(new Error("Protocol Root: " + protoRoot + " not found!"));
            else {
                protobuf.load(protoRoot + "/discordlink/protocol/auth.proto", (err, root) => {
                    if(err) reject(err);

                    this.ClientAuthenticationRequest = root.lookupType("discordlink.protocol.auth.ClientAuthenticationRequest");
                    this.ClientAuthenticationAccepted = root.lookupType("discordlink.protocol.auth.ClientAuthenticationAccepted");
                    this.ClientAuthenticationDenied = root.lookupType("discordlink.protocol.auth.ClientAuthenticationDenied");
                    resolve();
                });
            }
        });
    }
}

export default class Connection {
    private server: DiscordLinkServer;
    private connection: websocket.connection;

    constructor(server: DiscordLinkServer, connection: websocket.connection) {
        this.server = server;
        this.connection = connection;

        this.connection.on("message", this.onRawMessage.bind(this));
        this.connection.on("close", this.onClose);
    }

    onRawMessage(message) {
        if(message.type == 'binary') {
            let id = message.binaryData.readUInt8(0);
            let messageLength = message.binaryData.readUInt32LE(1);

            let messageData = message.binaryData.subarray(5, messageLength + 5);

            this.server.logger.debug("Packet from " + this.connection.remoteAddress + "[ID: " + id + ", Length: " + messageLength + "]");

            this.handleMessage(id, messageData);
        }
    }

    onClose() {

    }

    private handleMessage(id: number, messageData: Buffer) {
        switch(id) {
            case ID_ClientAuthenticationRequest:
                let decoded = this.server.packetsInstance.ClientAuthenticationRequest.decode(messageData);
                this.server.logger.info("Authentication Request from " + this.connection.remoteAddress + " [Timestamp: " + decoded.timestamp + ", serviceID: " + decoded.serviceID + "]");
                // TODO: Actually process authentication requests

                let response = this.server.packetsInstance.ClientAuthenticationDenied.create({});
                let encoded = this.server.packetsInstance.ClientAuthenticationDenied.encode(response);
                this.sendFullMessage(ID_ClientAuthenticationDenied, encoded.finish());
                break;
        }
    }

    private sendFullMessage(id: number, messageData: Buffer) {
        let fullBuf = Buffer.alloc(messageData.length + 5);
        fullBuf.writeUInt8(id, 0);
        fullBuf.writeUInt32LE(messageData.length, 1);
        fullBuf.fill(messageData, 5);

        this.connection.sendBytes(fullBuf);
    }
}