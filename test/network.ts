import chai from "chai";
import winston from "winston";
import websocket from "websocket";

import DiscordLinkServer from "../src/server";
import * as network from "../src/network";
import * as dprotocol from "../src/protocol";

let assert = chai.assert;

const testServerConfig = {
    protocolRoot: "protocol",
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
    var packets: network.Packets;

    before(async () => {
        packets = new network.Packets();
        await packets.load("protocol");
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
                    receivedPacket = true;

                    assert.equal(message.type, 'binary');
                    let id = message.binaryData.readUInt8(0);
                    assert.equal(id, dprotocol.ID_ClientAuthenticationAccepted);

                    connection.close();
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

                let packet = packets.ClientAuthenticationRequest.create(payload);
                let packetData = packets.ClientAuthenticationRequest.encode(packet).finish();
                let buf = Buffer.alloc(packetData.length + 5);
                buf.writeUInt8(dprotocol.ID_ClientAuthenticationRequest, 0);
                buf.writeUInt32LE(packetData.length, 1);
                buf.fill(packetData, 5);

                connection.sendBytes(buf);
            });

            client.connect("ws://localhost:" + testServerConfig.server.port, 'discord-link-protocol')
        });
    });
});