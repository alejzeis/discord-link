import chai from "chai";
import winston from "winston";
import websocket from "websocket";
import protobuf from "protobufjs";

import Connection from "../src/network";
import DiscordLinkServer from "../src/server";
import * as dprotocol from "../src/protocol";

let assert = chai.assert;

const testServerConfig = {
    server: {
        port: 9999,
        services: {
            fakeService: {
                name: "Fake Service",
                id: 32
            }
        }
    }
};

const dummyLogger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.align(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    defaultMeta: { service: 'Discord-Link' },
    transports: [
        new winston.transports.File({ filename: "networktests.log" })
    ]
});

describe('Authentication', () => {
    var ClientAuthenticationRequest;
    var ClientAuthenticationAccepted;
    var ClientAuthenticationDenied;

    before(() => {
        protobuf.load("protocol/discordlink/protocol/auth.proto", (err, root) => {
            ClientAuthenticationRequest = root.lookupType("discordlink.protocol.auth.ClientAuthenticationRequest");
            ClientAuthenticationAccepted = root.lookupType("discordlink.protocol.auth.ClientAuthenticationAccepted");
            ClientAuthenticationDenied = root.lookupType("discordlink.protocol.auth.ClientAuthenticationDenied");
        });
    });

    describe('Service Registered', () => {
        var server: DiscordLinkServer;
        before(() => {
            server = new DiscordLinkServer(testServerConfig, dummyLogger, true);
            server.run();
        });

        after(() => {
            server.stop();
        });

        it('Should accept client authentication', (done) => {
            let client = new websocket.client();
            var receivedPacket = false;

            client.on('connect', connection => {
                connection.on('message', function(message) {
                    assert.equal(message.type, 'binary');
                    let id = message.binaryData.readInt8(0);
                    assert.equal(id, dprotocol.ID_ClientAuthenticationAccepted);
                });

                connection.on('close', () => {
                    assert.isTrue(receivedPacket);
                    done();
                });

                // Send Auth request
                let payload = {
                    timestamp: (new Date).getTime(),
                    serviceID: testServerConfig.server.services.fakeService.id,
                    serviceToken: "TODO"
                };

                let packet = ClientAuthenticationRequest.create(payload);
                connection.sendBytes(Buffer.from(ClientAuthenticationRequest.encode(packet).finish()));
            });

            client.connect("ws://localhost:" + testServerConfig.server.port, 'discord-link-protocol')
        });
    });
});