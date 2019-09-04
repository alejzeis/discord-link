import DiscordLinkServer from "./server";
import winston from "winston";
import * as YAML from "yamljs";

import fs from "fs";

function loadAndVerifyConfig() {
    // Determine configuration file location
    let args = process.argv.splice(2);
    var configLocation = "./discordlink.yml";
    if(args.length > 0) {
        // If --service is added, we will look in /etc
        if(args[0] == "--service") {
            configLocation = "/etc/discord-link/discordlink.yml"
        }
    }

    if(!fs.existsSync(configLocation)) {
        console.error("Failed to find configuration file \"" + configLocation + "\"");
        console.error("Exiting.");
        process.exit(1);
    }

    let config = YAML.load(configLocation);

    // Verify all properties present
    if (!config || !config.hasOwnProperty("logsDir")) {
        console.error("Invalid configuration file, \"logsDir\" setting not found.");
        console.error("Exiting.");
        process.exit(1);
    } else if(!config.hasOwnProperty("server") || !config.hasOwnProperty("bot")) {
        console.error("Invalid configuration file, (server and bot) sections not present.");
        console.error("Exiting.");
        process.exit(1);
    } else if(!config.server || !config.server.hasOwnProperty("port") || !config.server.hasOwnProperty("services")) {
        console.error("Invalid configuration file, not all sections present in \"server\" section.");
        console.error("Exiting.");
        process.exit(1);
    } else if(!config.bot || !config.bot.hasOwnProperty("username") || !config.bot.hasOwnProperty("token")) {
        console.error("Invalid configuration file, not all sections present in \"bot\" section.");
        console.error("Exiting.");
        process.exit(1);
    }

    return config;
}

let config = loadAndVerifyConfig();

let logger = winston.createLogger({
    level: 'info',
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
        new winston.transports.Console({format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.errors({ stack: true }),
                winston.format.align(),
                winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
            ),}),
        new winston.transports.File({ filename: config.logsDir + "/discordlink-error.log", level: 'error' }),
        new winston.transports.File({ filename: config.logsDir + "/discordlink.log" })
    ]
});

logger.info("Starting Discord-Link...");
let server = new DiscordLinkServer(config, logger);
server.run();