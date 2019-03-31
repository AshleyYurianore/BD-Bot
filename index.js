let localConfig;
try { localConfig = require("./localConfig.js"); } catch (e) { }

const DiscordJS = require("discord.js");
const _ = require("underscore");
const moment = require("moment");
const client = new DiscordJS.Client();
const prefix = _.isUndefined(localConfig) ? process.env.PREFIX : localConfig.PREFIX;

let server;
let logsChannel = "accalia-logs";
let channel;
let AsheN;

const startUpMod = {
    'initialize': function (serverName, channelName, startUpMessage) {
        try {
            server = client.guilds.find(guild => _.isEqual(guild.name, serverName));
            logsChannel = server.channels.find(channel => _.isEqual(channel.name, logsChannel));
            channel = server.channels.find(channel => _.isEqual(channel.name, channelName));
            AsheN = client.users.find(user => _.isEqual(user.id, 105301872818028544));
            client.user.setActivity("Serving the Den").catch(util.reportToAsheN);
            util.sendTextMessage(channel, startUpMessage);
            util.log("INITIALIZED.", "Startup", util.logLevel.INFO);
        } catch (e) {
            if (!_.isUndefined(localConfig)) console.log("(" + moment().format('MMM DD YYYY - HH:mm:ss.SSS') + ") Failed to start up.");
        }
    },
};

client.on("ready", () => {
    startUpMod.initialize("ASDF", "accalia-main", "I'M AWAKE! AWOOO~");
});

client.on("message", (message) => {
    if (_.isEqual(message.author.username, client.user.username)) return;

    // Prefix as first character -> command
    if (_.isEqual(message.content.indexOf(prefix), 0)) {
        cmd.call(message);
        return;
    }
    console.log();
});

const cmd = {
    'ping': async function (message) {
        try {
            const m = await message.channel.send("Ping!");
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
            util.log('used command: ping', "ping", util.logLevel.INFO);
        } catch (e) {
            this.log('Failed to process command (ping)', 'ping', this.logLevel.ERROR);
        }
    },
    'staff': async function (message) {
        try {
            const m = await message.channel.send("Checking!");
            let isStaff = util.isStaff(message);
            m.edit(`You are ${(!isStaff) ? 'not ' : '' }a staff member!`);
            util.log('used command: staff', "staff", util.logLevel.INFO);
        } catch (e) {
            this.log('Failed to process command (staff)', 'staff', this.logLevel.ERROR);
        }
    },
    'call': function (message) {
        try {
            const args = message.content.slice(prefix.length).trim().split(/ +/g);
            const command = args.shift().toLowerCase();
            if (_.isEqual(command, "call")) return;
            if (_.isUndefined(this[command])) return;
            this[command](message, args);
            util.log('calling command: ' + command, command, util.logLevel.INFO);
        } catch (e) {
            this.log('Failed to process (call)', 'call', this.logLevel.ERROR);
        }
    },
};

const util = {
    'sendTextMessage': function (channel, message) {
        try {
            if (channel) {
                channel.startTyping();
                setTimeout(function(){
                    channel.send(message);
                    channel.stopTyping(true);
                }, 1500);
            }
        } catch (e) {
            this.log('Failed to send message: ' + message, this.logLevel.ERROR);
        }
    },

    'isStaff': function (message) {
        return message.author.lastMessage.member.roles.find(role => _.isEqual(role.name, 'Staff')) || message.author === AsheN;
    },

    'reportToAsheN': function (errMsg) {
        try {
            AsheN.send(errMsg);
        } catch (e) {
            if (!_.isUndefined(localConfig)) console.log("(" + moment().format('MMM DD YYYY - HH:mm:ss.SSS') + ") Failed to start up.");
        }
    },

    'log': function (message, moduleName, level) {
        if (_.isUndefined(logsChannel)) return;
        level = ((_.isUndefined(level)) ? this.logLevel.INFO : level);
        let logMessage = level + " | " + moment().format('MMM DD YYYY - HH:mm:ss.SSS') + " | " + moduleName + ": " + message;

        if (_.isEqual(level, this.logLevel.FATAL)) this.reportToAsheN(message);
        logsChannel.send(logMessage);

        if (_.isUndefined(localConfig)) return;
        console.log(logMessage);
    },

    'logLevel': {
        'INFO':  "INFO ",
        'WARN':  "WARN ",
        'ERROR': "ERROR",
        'FATAL': "FATAL",
    },
};

client.login(_.isUndefined(localConfig) ? process.env.BOT_TOKEN : localConfig.TOKEN);