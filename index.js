const DiscordJS = require("discord.js");
const client = new DiscordJS.Client();
const prefix = process.env.PREFIX;

let server;
let channel;
let AsheN;

client.on("ready", () => {
    startUpMod.initialize("ASDF", "general", "I'M AWAKE! AWOOO~");
});

const startUpMod = {
    'initialize': function (serverName, channelName, startUpMessage) {
        try {
            client.login(process.env.BOT_TOKEN);
            server = client.guilds.find("name", serverName);
            channel = server.channels.find("name", channelName);
            AsheN = client.users.find("id", "105301872818028544");
            channel.send(startUpMessage);
        } catch (e) {
            errMod.reportToAsheN(e.toString());
        }
    }
};

const errMod = {
    'reportToAsheN': function (moduleName, errMsg) {
        var errString = (moduleName) ? "Error (" + moduleName + "): " : "Error: ";
        AsheN.send(errString + errMsg);
    }
};

const cmd = {
    'call': function (name, params) {
        try {
            if (name[0] === prefix) {
                name = name.substring(1);
                cmd[name](params);
            }
        } catch (e) {
            errMod.reportToAsheN(name, e.toString());
        }
    },
    'test': function (params) {
        try {
            // do smth with params
        } catch (e) {
            errMod.reportToAsheN("test", e.toString());
        }
    }
};