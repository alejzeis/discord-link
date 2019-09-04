import * as discord from "discord.js";
import DiscordLinkServer from "./server";

export default class DiscordLinkBot {
    private server: DiscordLinkServer;

    private dclient: discord.Client;

    constructor(server: DiscordLinkServer) {
        this.server = server;

        this.dclient = new discord.Client();

        this.dclient.on("ready", this.onReady);

        this.dclient.login(server.config.bot.token).catch((err) => this.server.logger.error("Failed to login to discord! " + err));
    }

    onReady() {
        this.server.logger.info("Connected to Discord.");
    }
}