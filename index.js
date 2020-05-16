"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
let localConfig;
try {
    localConfig = require("./localConfig");
}
catch (e) { }
const DiscordJS = __importStar(require("discord.js"));
const client = new DiscordJS.Client();
const _ = require("underscore");
const moment = require("moment");
const assert = require("assert");
const schedule = require("node-schedule");
const debug = false;
const MongoClient = require('mongodb').MongoClient;
const db_name = (_.isUndefined(localConfig)) ? process.env.DB_NAME : debug ? localConfig.DB.TESTNAME : localConfig.DB.NAME;
const db_user = (_.isUndefined(localConfig)) ? process.env.DB_USER : localConfig.DB.USER;
const db_pw = (_.isUndefined(localConfig)) ? process.env.DB_PW : localConfig.DB.PW;
const url = `mongodb+srv://${db_user}:${db_pw}@cluster0-c0kzw.mongodb.net/${db_name}?retryWrites=true&w=majority`;
const prefix = _.isUndefined(localConfig) ? process.env.PREFIX : localConfig.PREFIX;
const server_id = _.isUndefined(localConfig) ? process.env.SERVER_ID : localConfig.SERVER;
let server;
let channels = {
    'main': "accalia-main",
    'level': "📈level-up-log",
    'logs': "accalia-logs",
    'warnings': "🚨warnings",
    'cult-info': "🗿cult-info",
    'char-sub': "📃character-submission",
    'char-archive': "📚character-archive",
    'char-index': "📕character-index",
    'reports': "📮reports-and-issues",
    'rp-fb-entry': "📒rp-feedback-entries",
    'rp-fb-index': "📒rp-feedback-index",
    'lfp-info': "📌lfp-info",
    'lfp-contact': "💬lfp-contact",
    'lfp-male': "🍆lfp-male",
    'lfp-female': "🍑lfp-female",
    'lfp-femboy': "🍌lfp-femboy",
    'lfp-vanilla': "🍦lfp-vanilla",
    'lfp-gay': "👬lfp-gay",
    'lfp-lesbian': "👭lfp-lesbian",
    'lfp-trans': "🌽lfp-trans",
    'lfp-futa': "🥕lfp-futa-herm",
    'lfp-furry': "😺lfp-furry",
    'lfp-bestiality': "🦄lfp-bestiality",
    'lfp-extreme': "✨lfp-extreme",
    'lfp-long': "📰lfp-long-term-plot",
    'lfp-vc': "🎤lfp-vc",
    'lfp-sfw': "🌺lfp-sfw",
    'general': "🔞general",
    'nsfw-media': "👅nsfw-media",
    'tinkering': "tinkering",
    'authentication-logs': "🎫authentication-logs",
    'paranoia-plaza': "🙈ashs-paranoia-plaza",
};
let roles = {
    "No_Ping": "DONT PING⛔",
    "Newcomer": "Newcomer",
    "CustomRoles": "--Custom Roles--"
};
let emojis = {
    "bancat": "bancat",
    "pingmad": "pingmad",
    "pingangry": "pingangry",
};
let lfpTimer = {};
let rpFeedbackTimer;
let lfpChannels = [];
let rpFeedbackMessage;
const rpFeedbackTemplate = "`"
    + "**User to be given a review:** <@UserID>\n"
    + "\n\n**🔹Grammar/Spelling:**"
    + "\n\n**🔹Creativity:**"
    + "\n\n**🔹Leader/Follower of the Story:**"
    + "\n\n**🔹Time to reply:**"
    + "\n\n**🔹Matching the length of replies as the partner/as set up:**"
    + "\n\n**🔹Likelihood to roleplay with again:**"
    + "\n\n**Additional Notes:**"
    + "`";
let AsheN;
let lockdown = false;
let disableMentions = true;
let ping_violation_reaction_emoji = emojis.pingangry;
const level_up_module = "Level roles";
const link_regex = /((https?|ftp):\/\/|www\.)(\w.+\w\W?)/g; //source: https://support.discordapp.com/hc/en-us/community/posts/360036244152-Change-in-text-link-detection-RegEx
let mediaTextonlyMessageCounter = 0;
const dbMod = {
    'warnUser': function (member, level, warner, reason) {
        util.log(`Calling DB Module`, 'DB/warnUser', util.logLevel.INFO);
        try {
            util.log(`Attempting to connect to DB`, 'DB/warnUser', util.logLevel.INFO);
            this.connect(function (db) {
                util.log(`Successfully established DB Connection`, 'DB/warnUser', util.logLevel.INFO);
                let warnings = db.collection('warnings');
                let warnedUser = {
                    id: member.id,
                    currName: member.username,
                    formerName: member.username,
                    level: level,
                    reason: reason,
                    warnedAt: new Date(Date.now())
                };
                warnings.findOne({ id: member.id })
                    .then((userFound) => {
                    if (userFound == null)
                        return;
                    warnedUser.formerName = userFound.formerName;
                    level = userFound.level + 1;
                    // TODO: REPLACE FORMERNAME AND LEVEL IF EXISTS IN DB --> PREREQUISITE: SCHEDULED WARNING DELETION
                })
                    .catch((err) => {
                    util.log(`Failed to do command warning (findOneAndUpdate): ${err}.`, 'DB/warnUser', util.logLevel.FATAL);
                });
                util.log(`Attempting updating/inserting warning for ${member}`, 'DB/warnUser', util.logLevel.INFO);
                // Upsert command
                warnings.findOneAndUpdate({ id: member.id }, { $set: warnedUser }, { upsert: true, returnOriginal: true })
                    .then(() => {
                    util.log(`Successfully added/updated warning for ${member} (lvl ${level})`, 'DB/warnUser', util.logLevel.INFO);
                    let dateFormat = 'Do MMMM YYYY';
                    let warnDate = [
                        moment(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)).format(dateFormat) + " (14 Days)",
                        moment(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)).format(dateFormat) + " (30 Days)",
                        'indefinite'
                    ];
                    let lvlMsg = ['1st Warning', '2nd Warning', '3rd Warning'];
                    let expirationMsg = [
                        `in 2 weeks.`,
                        `in 1 month.`,
                        `whenever the staff team decides for it.`
                    ];
                    member.send(`You have been given a Level ${level} warning in the server **${server.name}** with reason: '${reason}'\n` +
                        `This warning expires ${expirationMsg[level - 1]}`);
                    util.log(`warned: ${member} (${level - 1}->${level})`, "warn", util.logLevel.INFO);
                    util.sendTextMessage(channels.warnings, `${member} | **${lvlMsg[level - 1]}**\n` +
                        `__Reason:__ ${!_.isEmpty(reason) ? reason : 'Not specified'} (Warned by ${warner})\n` +
                        `__When:__ ${moment().format(dateFormat)}\n` +
                        `__Ends:__ ${warnDate[level - 1]}\n` +
                        `-------------------`);
                })
                    .catch((err) => {
                    util.log(`Failed to do command warning (findOneAndUpdate): ${err}.`, 'DB/warnUser', util.logLevel.FATAL);
                });
            });
        }
        catch (err) {
            util.log('Failed to do "warnUser": ' + err, 'DB/warnUser', util.logLevel.FATAL);
        }
    },
    'checkWarnings': function () {
        util.log(`Calling DB Module`, 'DB/checkWarnings', util.logLevel.INFO);
        try {
            return;
            util.log(`Attempting to connect to DB`, 'DB/checkWarnings', util.logLevel.INFO);
            this.connect(function (db) {
                let warnings = db.collection('warnings');
                warnings.findAll()
                    .then(() => {
                    //util.log(`Successfully added/updated warning for ${member} (lvl ${level})`, 'DB/warnUser', util.logLevel.INFO);
                })
                    .catch((err) => {
                    util.log(`Failed to do command warning (findOneAndUpdate): ${err}.`, 'DB/warnUser', util.logLevel.FATAL);
                });
            });
        }
        catch (err) {
            util.log('Failed to do "checkWarnings":' + err, 'DB/checkWarnings', util.logLevel.FATAL);
        }
    },
    'connect': function (callback) {
        MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
            if (err)
                util.log(err, 'DB/connect', util.logLevel.FATAL);
            else {
                const db = client.db(db_name);
                callback(db);
            }
            client.close();
        });
    }
};
const startUpMod = {
    'initialize': function (startUpMessage) {
        try {
            if (!_.isUndefined(localConfig))
                server = localConfig.SERVER;
            server = client.guilds.resolve(server_id);
            _.each(channels, function (channel, channelID) {
                const c = server.channels.cache.find(ch => _.isEqual(ch.name, channels[channelID]));
                if (!c) {
                    console.log(`Error: Failed filling channel ${channels[channelID]} because it was not found`);
                }
                else if (c.type === "text") {
                    channels[channelID] = c;
                }
                else {
                    console.log(`Error: Failed filling channel ${channels[channelID]} because it's not a text channel`);
                }
            });
            _.each(Object.keys(util.roles.LVL), role_name => util.roles.LVL[role_name] = server.roles.cache.find(role => role.name === util.roles.LVL[role_name]));
            _.each(Object.keys(roles), role_name => roles[role_name] = server.roles.cache.find(role => role.name === roles[role_name]));
            _.each(Object.keys(emojis), emojiname => emojis[emojiname] = server.emojis.cache.find(emoji => emoji.name === emojiname));
            client.users.fetch("528957906972835850") //"105301872818028544"));
                .then(user => AsheN = user);
            if (!client.user) {
                throw "I don't know what's happening";
            }
            client.user.setActivity("Serving the Den").catch(util.reportToAsheN);
            ping_violation_reaction_emoji = emojis[ping_violation_reaction_emoji];
            util.sendTextMessage(channels.main, startUpMessage);
            util.log("INITIALIZED.", "Startup", util.logLevel.INFO);
            fnct.serverStats(['users', 'online', 'new', 'bots', 'roles', 'channels', 'age']);
            lfpChannels.push(channels["lfp-bestiality"]);
            lfpChannels.push(channels["lfp-extreme"]);
            lfpChannels.push(channels["lfp-female"]);
            lfpChannels.push(channels["lfp-femboy"]);
            lfpChannels.push(channels["lfp-furry"]);
            lfpChannels.push(channels["lfp-futa"]);
            lfpChannels.push(channels["lfp-gay"]);
            lfpChannels.push(channels["lfp-lesbian"]);
            lfpChannels.push(channels["lfp-long"]);
            lfpChannels.push(channels["lfp-male"]);
            lfpChannels.push(channels["lfp-sfw"]);
            lfpChannels.push(channels["lfp-vc"]);
            lfpChannels.push(channels["lfp-trans"]);
            lfpChannels.push(channels["lfp-vanilla"]);
            channels["rp-fb-entry"].messages.fetch({ limit: 1 })
                .then(msg => {
                rpFeedbackMessage = msg.first();
                if (rpFeedbackMessage) {
                    rpFeedbackMessage.react('✉️');
                }
                else {
                    util.log('Failed finding last feedback entry message', "Feedback", util.logLevel.ERROR);
                }
            });
            cmd.cn();
            this.startSchedules();
        }
        catch (e) {
            if (!_.isUndefined(localConfig))
                console.log(`(${moment().format('MMM DD YYYY - HH:mm:ss.SSS')}) Failed to start up.`);
        }
    },
    'startSchedules': function () {
        // Cron-format: second 0-59 optional; minute 0-59; hour 0-23; day of month 1-31; month 1-12; day of week 0-7
        let j = schedule.scheduleJob('*/60 * * * *', function (fireDate) {
            cmd.cn();
        });
        return;
        let k = schedule.scheduleJob('*/60 * * * *', function (fireDate) {
            cmd.cn();
        });
    }
};
client.on("ready", () => {
    startUpMod.initialize("I'M AWAKE! AWOOO~");
    //Catch up on missed level-ups
    if (!(channels.level instanceof DiscordJS.TextChannel)) {
        return;
    }
    channels.level.messages.fetch({ "limit": 100 })
        .then(messages => {
        //Remove duplicates so that when someone levels from lvl 3 to 4 and lvl 4 to 5 it doesn't trigger 2 level-up handles
        let seen_users = new DiscordJS.Collection();
        messages.sort((left, right) => right.createdTimestamp - left.createdTimestamp); //newest to oldest
        messages.forEach(message => {
            var _a, _b;
            const id = (_b = (_a = message.mentions.members) === null || _a === void 0 ? void 0 : _a.first()) === null || _b === void 0 ? void 0 : _b.id;
            if (id && !seen_users.get(id)) {
                seen_users.set(id, message);
            }
        });
        //Handle level ups that we may have missed
        seen_users.forEach(util.handle_level_up);
    })
        .catch(error => {
        util.log(`Failed reading old messages from ${channels.level} because of ${error}`, level_up_module, util.logLevel.ERROR);
    });
});
client.on("guildMemberAdd", (member) => {
    fnct.serverStats(['users', 'online', 'new']);
});
client.on("guildMemberRemove", (member) => {
    fnct.serverStats(['users', 'online', 'new']);
});
client.on("guildUpdate", (oldGuild, newGuild) => {
    fnct.serverStats(['users', 'online', 'new', 'bots', 'roles', 'channels', 'age']);
});
client.on('messageReactionAdd', async (messagereaction, user) => {
    if (user === client.user)
        return;
    if (!(user instanceof DiscordJS.User)) {
        user = await client.users.fetch(user.id);
    }
    const reaction = messagereaction.emoji.name;
    if (messagereaction.emoji instanceof DiscordJS.GuildEmoji)
        return;
    if (_.isEqual(reaction, "⭐") || _.isEqual(reaction, "✅")) {
        fnct.approveChar(messagereaction.message, messagereaction.emoji, user);
    }
    if (_.isEqual(reaction, "✉️")) {
        fnct.addFeedback(messagereaction.message, user);
    }
    if (_.isEqual(reaction, "⭐") || _.isEqual(reaction, "✅")) {
        fnct.approveFeedback(messagereaction.message, messagereaction.emoji, user);
    }
});
client.on('messageReactionRemove', async (messagereaction, user) => {
    if (user === client.user)
        return;
    if (!(user instanceof DiscordJS.User)) {
        user = await client.users.fetch(user.id);
    }
    const reaction = messagereaction.emoji.name;
    if (_.isEqual(reaction, "✉️")) {
        fnct.revokeFeedback(messagereaction.message, user);
    }
});
/*
client.on('raw', packet => {
    // We don't want this to run on unrelated packets
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
    // Grab the channel to check the message from
    const channel = client.channels.get(packet.d.channel_id);
    // There's no need to emit if the message is cached, because the event will fire anyway for that
    if (channel.messages.has(packet.d.message_id)) return;
    // Since we have confirmed the message is not cached, let's fetch it
    channel.fetchMessage(packet.d.message_id).then(message => {
        // Emojis can have identifiers of name:id format, so we have to account for that case as well
        const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
        // This gives us the reaction we need to emit the event properly, in top of the message object
        const reaction = message.reactions.get(emoji);
        // Adds the currently reacting user to the reaction's users collection.
        if (reaction) reaction.users.set(packet.d.user_id, client.users.get(packet.d.user_id));
        // Check which type of event it is before emitting
        if (packet.t === 'MESSAGE_REACTION_ADD') {
            client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
        }
        if (packet.t === 'MESSAGE_REACTION_REMOVE') {
            // client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
        }
    });
});
*/
client.on("channelUpdate", (oldChannel, newChannel) => {
    if (!(oldChannel instanceof DiscordJS.GuildChannel) || !(newChannel instanceof DiscordJS.GuildChannel)) {
        return;
    }
    if (newChannel.guild.id !== server.id)
        return; // Ignore non-main servers
    if (oldChannel.parent && newChannel.parent && oldChannel.parent.id !== newChannel.parent.id) {
        util.log(`:warning: Channel ${newChannel} was moved! Category ${oldChannel.parent} position ${oldChannel.position} -> ${newChannel.parent} position ${newChannel.position}`, "Channel Position", util.logLevel.WARN);
    }
    else if (oldChannel.position !== newChannel.position && Math.abs(oldChannel.position - newChannel.position) != 1) {
        util.log(`:warning: Channel ${newChannel} was moved! Position ${oldChannel.position} -> ${newChannel.position}`, "Channel Position", util.logLevel.WARN);
    }
});
client.on("message", (message) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (client === null || client.user === null) {
        return;
    }
    if (message.channel.type !== "text")
        return; // Ignore DMs
    if (typeof channels.tinkering === "string" ||
        typeof channels.general === "string" ||
        typeof channels["nsfw-media"] === "string" ||
        typeof channels["paranoia-plaza"] === "string" ||
        typeof channels["lfp-contact"] === "string" ||
        typeof channels["authentication-logs"] === "string") {
        return;
    }
    if (_.isEqual(message.author.username, client.user.username))
        return;
    if (message.author.bot) {
        if (!((_.isEqual(message.author.id, "159985870458322944") && _.isEqual(message.channel.name, "📈level-up-log")) ||
            (_.isEqual(message.author.id, "155149108183695360") && _.isEqual(message.channel.name, "🚨reports-log")) ||
            (_.isEqual(message.author.username, "Carl-bot Logging") && _.isEqual(message.channel.name, "🎫authentication-logs")))) {
            return;
        }
    }
    if (!message.channel.guild)
        return; // Ignore DMs
    if (message.channel.guild.id !== server.id)
        return; // Ignore non-main servers
    if (lockdown)
        return;
    // Prefix as first character -> command
    if (_.isEqual(message.content.indexOf(prefix), 0)) {
        cmd.call(message);
    }
    if (lfpChannels.includes(message.channel)) {
        let number_of_attached_images = message.attachments.filter(embed => !!embed.height).size;
        let violationMode = 0;
        if ((util.image_link_count(message.content) + number_of_attached_images) > 3) { // check for msg which have >3 images in any LFP channel
            violationMode = 1;
        }
        // Check for messages sent in lfp channels
        message.channel.messages.fetch({ "before": message.id, "limit": 100 })
            .then(messages => {
            let time_passed_s = 0;
            let previous_message;
            if (_.isEmpty(messages)) {
                previous_message = messages.reduce((m1, m2) => {
                    if (!_.isEqual(m1.message.author.id, m2.author.id))
                        return m1;
                    return m1.createdTimestamp > m2.createdTimestamp ? m1 : { message: m2, createdTimestamp: m2.createdTimestamp };
                }, { "message": message, "createdTimestamp": 0 });
                // Previous message sent was less than 24h ago
                if (previous_message.createdTimestamp !== 0) {
                    time_passed_s = ~~((message.createdTimestamp - previous_message.createdTimestamp) / 1000);
                    if (time_passed_s < 60 * 60 * 24) {
                        previous_message.message.delete()
                            .then(() => util.log(`Deleted previous LFP message from ${message.author} (${message.author.id}) in ${message.channel} from ${util.time(time_passed_s)}.`, 'lfpMsgDelete', util.logLevel.INFO))
                            .catch(() => util.log(`Couldn't delete previous LFP message from ${message.author} (${message.author.id}) in ${message.channel} from ${util.time(time_passed_s)}.`, 'lfpMsgDelete', util.logLevel.WARN));
                    }
                }
            }
            if (violationMode === 0) {
                return;
            }
            let warnMsg = `${message.author}, your Looking For Partner ad in ${message.channel} `;
            let reason = "";
            if (violationMode === 1) {
                reason = `contains more than 3 images.`;
            }
            message.react('❌')
                .then() // react success
                .catch(e => {
                util.sendTextMessage(channels.main, `HALP, I cannot warn ${message.author} for violating the LFP rules in ${message.channel}! Their ad ${reason}\n` +
                    `Violating Message Link: ${message.url}\n` +
                    `Previous Message Link: ${previous_message.message.url}`);
            });
            warnMsg += `${reason} \nPlease follow the guidelines as described in ${channels["lfp-info"]}. Thanks! :heart:`;
            util.sendTextMessage(channels["lfp-contact"], warnMsg);
            util.log(`${message.author}'s lfp ad in ${message.channel} ${reason}`, "lfpAdViolation", util.logLevel.INFO);
        })
            .catch(e => {
            util.log('Failed: ' + e.toString(), 'lfpAdViolation', util.logLevel.WARN);
        });
    }
    // delete links in general
    if (_.isEqual(message.channel.id, channels["general"].id)) {
        if (message.content.match(link_regex)) {
            if (util.isStaff(message)) { //have mercy on staff and don't delete messages
                message.react(emojis.bancat).catch(console.error);
                return;
            }
            const logBody = `link in ${message.channel} from ${message.author}\nMessage content: ${message}`;
            message.delete()
                .then(() => {
                util.log(`Removed ${logBody}`, 'Automatic Link Removal', util.logLevel.WARN);
            })
                .catch((e) => {
                util.log(`Failed to remove ${logBody}\nError: ${e.toString()}`, 'Automatic Link Removal', util.logLevel.ERROR);
            });
            util.sendTextMessage(message.channel, `${message.author} Sorry, no media or links of any kind in this channel. Put it in ${channels["nsfw-media"]} or another media channel please.`);
            return;
        }
    }
    // react to too many text messages in nsfw-media
    if (_.isEqual(message.channel.id, channels["nsfw-media"].id)) {
        if (_.isNull(message.content.match(link_regex)) && message.attachments.size === 0) {
            if (util.isStaff(message)) { // staff
                return;
            }
            else if (mediaTextonlyMessageCounter % 7 === 0 && mediaTextonlyMessageCounter !== 0) {
                util.sendTempTextMessage(message.channel, `**Please refrain from having a lengthy conversation in the __media__ channel!** Thank you...`);
                util.sendTextMessage(channels.main, `There's too much discussion in ${message.channel}...`);
                mediaTextonlyMessageCounter = 15;
            }
            else if (mediaTextonlyMessageCounter > 7) {
                util.sendTempTextMessage(message.channel, `**Please refrain from having a lengthy conversation in the __media__ channel!** Thank you...`);
                message.delete().catch(console.error);
                //message.react("💢").catch(console.error);
            }
            mediaTextonlyMessageCounter++;
            return;
        }
        else {
            mediaTextonlyMessageCounter--;
        }
    }
    // delete links in Hentai Corner and Pornhub categories
    if (!util.isUserStaff(message.author) &&
        !_.contains(["SOURCE", "NSFW-DISCUSSION", "EXTREME-FETISHES-BOT", "NSFW-BOT-IMAGES"], message.channel.name.toUpperCase()) &&
        !_.isNull(message.channel.parent) && _.contains(["HENTAI CORNER", "PORNHUB"], (_a = message.channel.parent) === null || _a === void 0 ? void 0 : _a.name.toUpperCase())) {
        if (!message.content.match(link_regex) && message.attachments.size < 1) {
            const logBody = `Non-Media/-Link in ${message.channel} from ${message.author}\nMessage content: ${message}`;
            message.delete()
                .then(() => {
                util.log(`Removed ${logBody}`, 'Media Channel Text Filtering', util.logLevel.WARN);
            })
                .catch((e) => {
                util.log(`Failed to remove ${logBody}\nError: ${e.toString()}`, 'Media Channel Text Filtering', util.logLevel.ERROR);
            });
            message.reply(`Sorry, messages without media or links are removed in these media channels. Please put it in #nsfw-discussion instead.`)
                .then(msg => {
                setTimeout(() => {
                    msg.delete();
                }, 7000);
            });
            return;
        }
    }
    // be paranoid about newcomers who invite people
    if (_.isEqual(message.channel.id, channels.tinkering.id)) {
        const invite_regex = /<@\d+> \*\*joined\*\*; Invited by \*\*.*\*\* \(\*\*\d+\*\* invites\)/g;
        if (!message.content.match(invite_regex)) { //not an invite message
            return;
        }
        const before_name = "> **joined**; Invited by **";
        const after_name = "** (**";
        const name_start_pos = message.content.indexOf(before_name) + before_name.length;
        const name_end_pos = message.content.indexOf(after_name);
        const name = message.content.substr(name_start_pos, name_end_pos - name_start_pos);
        if (name === "[!d] DISBOARD" || name === "AsheN") { //Can't be paranoid about people joining via their invites. Or can we? :tinfoilhat:
            return;
        }
        const before_invites = before_name + name + "** (**";
        const after_invites = "** invites)";
        const before_invites_pos = message.content.indexOf(before_invites) + before_invites.length;
        const after_invites_pos = message.content.indexOf(after_invites);
        const invites = parseInt(message.content.substr(before_invites_pos, after_invites_pos - before_invites_pos));
        const members = server.members.cache.filter(member => member.displayName === name);
        if (members.size === 0) {
            //Didn't find the user. This happens when the inviter left or Invite Manager didn't notice that someone changed their Discord name.
            util.sendTextMessage(channels.tinkering, `Failed figuring out who **${name}** is.`);
            return;
        }
        const inferred_members_text = members.reduce((member, result) => `${member} ${result}`, "").trim();
        util.sendTextMessage(channels.tinkering, new DiscordJS.MessageEmbed().setDescription(`Invited by ${inferred_members_text}`));
        //warn if any of the potentials are newer than 1 day
        const newcomer_member = members.find(member => (member.joinedTimestamp || 0) > new Date().getTime() - 1000 * 60 * 60 * 24);
        if (newcomer_member) {
            util.sendTextMessage(channels["paranoia-plaza"], new DiscordJS.MessageEmbed().setDescription(`:warning: Got invite number ${invites} for ${(_b = message.mentions.members) === null || _b === void 0 ? void 0 : _b.first()} from recent member ${members.size === 1 ? "" : "one of "}${inferred_members_text}.`));
        }
        return;
    }
    //copy new account joins from auth log to paranoia plaza
    if (message.channel.id === channels["authentication-logs"].id) {
        if (!message.embeds) { //Stop chatting in the auth log channel :reeeee:
            return;
        }
        message.embeds.forEach(embed => {
            var _a;
            if ((((_a = embed.description) === null || _a === void 0 ? void 0 : _a.indexOf("**NEW ACCOUNT**")) || 0) > 0) {
                channels["paranoia-plaza"].send(new DiscordJS.MessageEmbed(embed))
                    .catch(console.error);
            }
        });
        return;
    }
    // If not from Mee6 and contains mentions
    if (((_c = message.mentions.members) === null || _c === void 0 ? void 0 : _c.size) && !_.isEqual(message.author.id, "159985870458322944") && !_.isEqual(message.channel.id, channels["lfp-contact"].id)) {
        // react with :pingangry: to users who mention someone with the Don't Ping role
        const dontPingRole = server.roles.cache.find(r => _.isEqual(r.name, util.roles.DONTPING));
        if (!dontPingRole) {
            return;
        }
        const no_ping_mentions = message.mentions.members.filter(member => (member.roles.cache.has(dontPingRole.id) && !_.isEqual(member.user, message.author)));
        if (no_ping_mentions.size !== 0) {
            const no_ping_mentions_string = no_ping_mentions.reduce((prev_member, next_member) => prev_member + `${next_member} `, "");
            const log_message = `${message.author} pinged people with <@&${dontPingRole.id}>:\n${no_ping_mentions_string}\nMessage Link: <${message.url}>`;
            if (!util.isUserStaff(message.author)) { // exclude staff
                util.log(log_message, "Ping role violation", util.logLevel.INFO);
                message.react(!_.isNull(ping_violation_reaction_emoji) ? ping_violation_reaction_emoji : '🚫')
                    .catch(error => {
                    util.log(`Failed reacting to <${message.url}>`, "Ping role violation", util.logLevel.WARN);
                    util.sendTextMessage(channels.main, `HALP, I'm blocked by ${message.author}!\n` +
                        `They pinged people with the <@&${dontPingRole.id}> role!\nMessage Link: <${message.url}>`);
                });
            }
        }
    }
    if (_.isEqual(message.channel.name, "📈level-up-log")) {
        util.handle_level_up(message);
    }
    if ((_d = message.mentions.members) === null || _d === void 0 ? void 0 : _d.has(client.user.id)) {
        const args = message.content.trim().split(/ +/g).splice(1);
        util.log(message.content, `mentioned by (${message.author})`, util.logLevel.INFO);
        if (disableMentions && !util.isStaff(message))
            return;
        if (args.length === 0) {
            util.sendTextMessage(message.channel, `Awoo!`);
        }
        else {
            switch (args[0]) {
                case "prefix": {
                    util.sendTextMessage(message.channel, `${message.author}, the prefix is ${prefix} ... don't tell me you already forgot... qwq`);
                    break;
                }
                case "help": {
                    util.sendTextMessage(message.channel, `${message.author}, please be patient, the help page is under construction KAPPACINNOOOO...`);
                    break;
                }
                default: {
                    util.sendTextMessage(message.channel, `dafuk is this MATE?!`);
                    break;
                }
            }
        } // _.isEqual(message.author.id, "159985870458322944") &&
    }
    if (_.isEqual(message.channel.name, "🚨reports-log")) {
        const was_mute = (_f = (_e = message.embeds[0].author) === null || _e === void 0 ? void 0 : _e.name) === null || _f === void 0 ? void 0 : _f.indexOf('Mute');
        if (was_mute) {
            const usr = message.embeds[0].fields[0].value;
            const usrid = (_g = usr.match(/([0-9])+/g)) === null || _g === void 0 ? void 0 : _g[0];
            if (!usrid) {
                return;
            }
            const userM = (_h = message.guild) === null || _h === void 0 ? void 0 : _h.members.cache.get(usrid);
            if (userM && userM.roles.cache.find(role => _.isEqual(role.name, util.roles.NEW))) {
                util.log(`Attempting to ban Muted Newcomer: ${message.embeds[0].fields[0].value}`, 'Mute check', util.logLevel.INFO);
                let options = {
                    reason: "Violating Automoderator chat rules as a Newcomer",
                    days: 7
                };
                userM.ban(options)
                    .then(() => {
                    util.log(`${userM} banned for: ${options.reason}`, 'Mute check', util.logLevel.INFO);
                    util.sendTextMessage(channels.warnings, `${userM} banned for: ${options.reason}\n`);
                })
                    .catch(() => util.log(`${userM} failed to kick.`, 'Mute check', util.logLevel.WARN));
            }
        }
    }
    if (_.isEqual(message.channel, channels["rp-fb-entry"])) {
        if (!_.isUndefined(rpFeedbackTimer)) {
            clearTimeout(rpFeedbackTimer);
        }
        rpFeedbackTimer = setTimeout(() => {
            message.channel.messages.fetch()
                .then(messages => {
                let msg = messages.filter(m => { var _a; return _.isEqual(m.author.id, (_a = client.user) === null || _a === void 0 ? void 0 : _a.id); });
                if (msg.size !== 4) {
                    util.log(`Deleting ${msg.size} of my messages in ${message.channel} which shouldn't happen.`, "rpFeedbackInfo", util.logLevel.WARN);
                }
                msg.forEach(m => m.delete());
            });
            let infoMsg = "**__Roleplaying Feedbacks__**\n"
                + "\nThis channel is for giving __constructive__ feedback on a member you roleplayed with!"
                + "\nThe RP feedback should serve to help the member to see what they're doing well and what they're doing not "
                + "well so they can improve on their execution of RPs (if they want to). This should **not** be about "
                + "criticizing one-liners or people with unorthodox kinks into oblivion, but rather"
                + " to make sure people get feedback, as well as to let others know what to expect from these RPers."
                + "\nBelow is a template you can use with criteria you can give feedback on. You can always "
                + "add more points if you feel the need to, though keep the discord message limit of 2000 characters in mind."
                + "\n\n__Tip about giving feedbacks:__ Try to construct your feedback like a sandwich and make it more 'digestible'"
                + " (positive-negative-positive) for the person you're providing feedback for. :)"
                + "\n\n__Feedback Template:__";
            message.channel.send({
                files: ['https://cdn.discordapp.com/attachments/549695897156583426/693040596276740096/rpfeedback.png']
            })
                .then(() => {
                message.channel.send(infoMsg);
                message.channel.send(rpFeedbackTemplate);
                message.channel.send(`_React below to start the process for submitting a feedback! (and remove the reaction to cancel)_`)
                    .then(msg => {
                    rpFeedbackMessage = msg;
                    rpFeedbackMessage.react('✉️');
                });
            });
        }, 2000);
    }
    // Post the LFP rules in LFP channels
    if (_.contains(lfpChannels, message.channel)) {
        const channel = message.channel;
        if (!_.isUndefined(lfpTimer[channel.name])) {
            clearTimeout(lfpTimer[channel.name]);
        }
        lfpTimer[channel.name] = setTimeout(() => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            channel.messages.fetch()
                .then(messages => {
                let msg = messages.filter(m => { var _a; return _.isEqual(m.author.id, (_a = client.user) === null || _a === void 0 ? void 0 : _a.id); });
                if (msg.size !== 1) {
                    util.log(`Deleting ${msg.size} of my messages in ${channel} which shouldn't happen.`, "lfpInfo", util.logLevel.WARN);
                }
                msg.forEach(m => m.delete());
            });
            let title = "";
            let color = 0;
            let target = "";
            switch (channel.name.substr(6).split(/-/g)[0]) {
                case "male":
                    title = "MALES";
                    color = ((_a = server.roles.cache.find(role => _.isEqual(role.name, "Male"))) === null || _a === void 0 ? void 0 : _a.color) || 0;
                    target = "Males, people with the \"Male\" role (not Femboys)";
                    break;
                case "female":
                    title = "FEMALES";
                    color = ((_b = server.roles.cache.find(role => _.isEqual(role.name, "Female"))) === null || _b === void 0 ? void 0 : _b.color) || 0;
                    target = "Females, Tomboys, etc.";
                    break;
                case "femboy":
                    title = "FEMBOYS";
                    color = ((_c = server.roles.cache.find(role => _.isEqual(role.name, "Trap"))) === null || _c === void 0 ? void 0 : _c.color) || 0;
                    target = "People with the \"Trap/Femboy\" role";
                    break;
                case "vanilla":
                    title = "VANILLA RP";
                    color = ((_d = server.roles.cache.find(role => _.isEqual(role.name, "Vanilla"))) === null || _d === void 0 ? void 0 : _d.color) || 0;
                    target = "People with Vanilla Kinks and the \"Vanilla\" role";
                    break;
                case "gay":
                    title = "GAY (Male x Male) RP";
                    color = ((_e = server.roles.cache.find(role => _.isEqual(role.name, "Gay"))) === null || _e === void 0 ? void 0 : _e.color) || 0;
                    target = "Males with the \"Gay\" and/or \"Bi/Pansexual\" role";
                    break;
                case "lesbian":
                    title = "LESBIAN (Female x Female) RP";
                    color = ((_f = server.roles.cache.find(role => _.isEqual(role.name, "Lesbian"))) === null || _f === void 0 ? void 0 : _f.color) || 0;
                    target = "Females with the \"Lesbian\" and/or \"Bi/Pansexual\" role";
                    break;
                case "trans":
                    title = "TRANS";
                    color = ((_g = server.roles.cache.find(role => _.isEqual(role.name, "MtF"))) === null || _g === void 0 ? void 0 : _g.color) || 0;
                    target = "People with the MtF and FtM roles";
                    break;
                case "futa":
                    title = "FUTANARI / HERMAPHRODITE";
                    color = ((_h = server.roles.cache.find(role => _.isEqual(role.name, "Futa"))) === null || _h === void 0 ? void 0 : _h.color) || 0;
                    target = "Futanari and Hermaphrodites (not trans)";
                    break;
                case "furry":
                    title = "FURRY / ANTHRO";
                    color = ((_j = server.roles.cache.find(role => _.isEqual(role.name, "Furry"))) === null || _j === void 0 ? void 0 : _j.color) || 0;
                    target = "Furries and Anthromorphs (not beasts/bestiality rp)";
                    break;
                case "bestiality":
                    title = "BESTIALITY RP";
                    color = ((_k = server.roles.cache.find(role => _.isEqual(role.name, "Beast"))) === null || _k === void 0 ? void 0 : _k.color) || 0;
                    target = "Beasts, people interested in Bestiality RP (not furries)";
                    break;
                case "xtreme":
                    title = "EXTREME KINKS RP";
                    color = ((_l = server.roles.cache.find(role => _.isEqual(role.name, "Extreme"))) === null || _l === void 0 ? void 0 : _l.color) || 0;
                    target = "People with Extreme Kinks and the \"Extreme\" role";
                    break;
                case "long":
                    title = "LONG TERM / PLOT DRIVEN RP";
                    color = 0x00FFCA;
                    target = "People who would like a long term and/or plot driven RP";
                    break;
                case "vc":
                    title = "VOICE CHATS  / ETC.";
                    color = 0xA8A8A8;
                    target = "People wanting to find others to go in a Voice Chat session or etc. with";
                    break;
                case "sfw":
                    title = "NON-EROTIC";
                    color = 0xCA2C92;
                    target = "People who would like a non-erotic RP";
                    break;
            }
            let lfpEmbed = new DiscordJS.MessageEmbed()
                .setColor(color)
                .setTitle("Looking for " + title + " Channel Info")
                .setDescription("This channel is specifically for posts, which are **looking for " + title + "**.\n\n" +
                "If you do see posts, which are __not clearly looking for these kinds of RP/things__ in this channel, **please** let the staff team know in " + channels.reports + "!\n\n" +
                "If you want to **contact** someone who posted in this channel, **please check their DM Roles** first before doing so and please use " + channels["lfp-contact"] + "!\n\n" +
                "*More info in:* " + channels["lfp-info"])
                .addField("What posts are to be expected and to be posted in this channel?", "LFP Ads, which explicitly state that they are __looking for " + title + "__")
                .addField("Target Audience for LFP posts:", target);
            let lfpMsg = `>>> __**Looking for ${title} Channel Info**__\n` +
                `This channel is specifically for posts, which are **looking for ${title}**.\n\n` +
                `🔹 __What posts are to be expected and to be posted in this channel?__\n` +
                `LFP Ads, which explicitly state that they are **looking for ${title}**\n\n` +
                `🔹 __Target Audience for LFP posts:__\n` +
                `${target}\n\n` +
                `If you do see posts, which are __not clearly looking for these kinds of RP/things__ in this channel, **please** let the staff team know in ${channels.reports}!\n\n` +
                `If you want to **contact** someone who posted in this channel, **please check their DM Roles** first before doing so and please use ${channels["lfp-contact"]}!\n\n` +
                `*More info in:* ${channels["lfp-info"]}\n\n`;
            channel.send(lfpMsg)
                .then(() => util.log('Updated lfp info in ' + channel, "lfpInfo", util.logLevel.INFO))
                .catch(error => util.log(`Failed updating lfp info in ${channel} because ${error}`, "lfpInfo", util.logLevel.ERROR));
        }, 2000);
    }
});
const get_permission_diff_string = (old_permissions, new_permissions) => {
    let added = "";
    let removed = "";
    const permissions = [
        DiscordJS.Permissions.FLAGS.ADMINISTRATOR,
        DiscordJS.Permissions.FLAGS.CREATE_INSTANT_INVITE,
        DiscordJS.Permissions.FLAGS.KICK_MEMBERS,
        DiscordJS.Permissions.FLAGS.BAN_MEMBERS,
        DiscordJS.Permissions.FLAGS.MANAGE_CHANNELS,
        DiscordJS.Permissions.FLAGS.MANAGE_GUILD,
        DiscordJS.Permissions.FLAGS.ADD_REACTIONS,
        DiscordJS.Permissions.FLAGS.VIEW_AUDIT_LOG,
        DiscordJS.Permissions.FLAGS.PRIORITY_SPEAKER,
        DiscordJS.Permissions.FLAGS.STREAM,
        DiscordJS.Permissions.FLAGS.VIEW_CHANNEL,
        DiscordJS.Permissions.FLAGS.SEND_MESSAGES,
        DiscordJS.Permissions.FLAGS.SEND_TTS_MESSAGES,
        DiscordJS.Permissions.FLAGS.MANAGE_MESSAGES,
        DiscordJS.Permissions.FLAGS.EMBED_LINKS,
        DiscordJS.Permissions.FLAGS.ATTACH_FILES,
        DiscordJS.Permissions.FLAGS.READ_MESSAGE_HISTORY,
        DiscordJS.Permissions.FLAGS.MENTION_EVERYONE,
        DiscordJS.Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
        DiscordJS.Permissions.FLAGS.VIEW_GUILD_INSIGHTS,
        DiscordJS.Permissions.FLAGS.CONNECT,
        DiscordJS.Permissions.FLAGS.SPEAK,
        DiscordJS.Permissions.FLAGS.MUTE_MEMBERS,
        DiscordJS.Permissions.FLAGS.DEAFEN_MEMBERS,
        DiscordJS.Permissions.FLAGS.MOVE_MEMBERS,
        DiscordJS.Permissions.FLAGS.USE_VAD,
        DiscordJS.Permissions.FLAGS.CHANGE_NICKNAME,
        DiscordJS.Permissions.FLAGS.MANAGE_NICKNAMES,
        DiscordJS.Permissions.FLAGS.MANAGE_ROLES,
        DiscordJS.Permissions.FLAGS.MANAGE_WEBHOOKS,
        DiscordJS.Permissions.FLAGS.MANAGE_EMOJIS,
    ];
    const permissions_strings = [
        "Administrator",
        "Create Instant Invite",
        "Kick Members",
        "Ban Members",
        "Manage Channels",
        "Manage Server",
        "Add Reactions",
        "View Audit Log",
        "Priority Speaker",
        "Stream",
        "View Channels",
        "Send Messages",
        "Send Text To Speech Messages",
        "Manage Messages",
        "Embed Links",
        "Attach Files",
        "Read Message History",
        "Use External Emojis",
        "View Guild Insights",
        "External Emojis",
        "Connect To VC",
        "Speak In VC",
        "Mute Members in VC",
        "Deafen Members in VC",
        "Move Members in VC",
        "Use VAD",
        "Chane Nickname",
        "Manage Nicknames",
        "Manage Roles",
        "Manage Webhooks",
        "Manage Emojis",
    ];
    _.forEach(permissions, (permission, index) => {
        if ((old_permissions & permission) !== 0 && (new_permissions & permission) === 0) {
            removed += permissions_strings[index] + ", ";
        }
        if ((old_permissions & permission) === 0 && (new_permissions & permission) !== 0) {
            added += permissions_strings[index] + ", ";
        }
    });
    let result = "";
    if (added.length) {
        result += "Added Permission(s): *" + added.slice(0, -2) + "* ";
    }
    if (removed.length) {
        result += "Removed Permission(s): *" + removed.slice(0, -2) + "* ";
    }
    return result;
};
const audit_changes_to_string = (changes) => {
    if (changes === null) {
        return "";
    }
    return _.reduce(changes, (curr, change) => {
        curr += change.key ? `${change.key}: ` : "";
        if (change.key === "permissions") {
            curr += `${get_permission_diff_string(change.old, change.new)}`;
        }
        else if (change.key === "color") {
            curr += `#${change.old.toString(16)}->#${change.new.toString(16)}`;
        }
        else {
            curr += change.old === null ? "" : `${change.old}`;
            curr += (change.old !== null && change.new !== null) ? "->" : "";
            curr += change.new === null ? "" : `${change.new}`;
        }
        return curr + " ";
    }, "");
};
const audits_to_string = (audits, snowflake) => {
    return "";
    /*
    return audits.entries.reduce((current, audit) => {
        if (audit.target instanceof DiscordJS.Invite) { //can't audit invites because invites don't have an ID
            return current;
        }
        if (audit.target?.id != snowflake) { //not an entry where something was done to the target
            return current;
        }
        current += `**${util.time(new Date().getTime() - audit.createdAt.getTime())} ago:** `;
        if (audit.action === "MEMBER_ROLE_UPDATE") {
            const action = audit.changes?.[0].key === "$add" ? "added" : "removed";
            current += `${audit.executor} ${action} role ${server.roles.cache.has(audit.changes[0].new[0].id) ? `<@&${audit.changes[0].new[0].id}>` : audit.changes[0].new[0].name}`;
        }
        else if (audit.action === "MEMBER_UPDATE") {
            current += `${audit.executor} changed nickname from ${audit.changes[0].old || "none"} to ${audit.changes[0].new || "none"}`;
        }
        else if (audit.action === "MEMBER_KICK") {
            current += `Was kicked by ${audit.executor}`;
        }
        else if (audit.action === "CHANNEL_CREATE") {
            current += `Was created by ${audit.executor}`;
        }
        else if (audit.action === "CHANNEL_OVERWRITE_UPDATE") {
            current += `Permissions updated by ${audit.executor}: ${get_permission_diff_string(audit.changes[0].old, audit.changes[0].new)}`;
        }
        else if (audit.action === "CHANNEL_UPDATE") {
            current += `${audit.executor} updated ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "ROLE_UPDATE") {
            current += `${audit.executor} ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "EMOJI_CREATE") {
            current += `${audit.executor} created emoji. ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "GUILD_UPDATE") {
            current += `${audit.executor} updated server ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "MEMBER_BAN_ADD") {
            current += `Banned by ${audit.executor}`;
        }
        else if (audit.action === "MEMBER_BAN_REMOVE") {
            current += `Unbanned by ${audit.executor}`;
        }
        else {
            current += `${audit.executor} performed `;
            current += `__Action__: ${audit.action} `;
            if (audit.changes) {
                current += `__Changes__: `;
                current += audit_changes_to_string(audit.changes);
            }
            if (audit.extra) {
                if (audit.changes) {
                    current += " ";
                }
                current += `__Extra__: `;
                if ("setMentionable" in audit.extra || "kick" in audit.extra) {
                    //the extra is a role or a member
                    current += `${audit.extra}`;
                }
                else {
                    //the extra is an object
                    current += `{${_.reduce(Object.keys(audit.extra),
                        (current, key) => current + `${key}: ${audit.extra[key]} `, "")}}`;
                }
            }
        }
        if (audit.extra) {
            current += `__Extra__: `;
            if (audit.extra.setMentionable || audit.extra.kick) {
                //the extra is a role or a member
                current += `${audit.extra}`;
            }
            else {
                //the extra is an object
                current += `{${_.reduce(Object.keys(audit.extra),
                    (current, key) => current + `${key}: ${audit.extra[key]} `, "")}} `;
            }
        }
        if (audit.reason) {
            current += ` because ${audit.reason}`;
        }
        return current + "\n";
    }, "");
    */
};
const audit_send_result = (target_string, string, channel) => {
    const result_string = `**Audit for ${target_string}**:\n` + string;
    let message_pieces = DiscordJS.Util.splitMessage(result_string);
    if (!Array.isArray(message_pieces)) {
        message_pieces = [message_pieces];
    }
    _.forEach(message_pieces, message_piece => {
        channel.send(new DiscordJS.MessageEmbed().setDescription(message_piece));
    });
};
const audit_log_search = (target_string, message, snowflake, result_string = "", latest_entry, counter = 0) => {
    if (!latest_entry) {
        message.channel.startTyping();
    }
    //DiscordJS.GuildAuditLogsFetchOptions;
    server.fetchAuditLogs(latest_entry ? { limit: 100, before: latest_entry } : { limit: 100 })
        .then(audits => {
        const new_results = audits_to_string(audits, snowflake);
        result_string += new_results;
        if (result_string.length > 1500 || audits.entries.size < 100 || counter > 100) {
            audit_send_result(target_string, result_string, message.channel);
            message.channel.stopTyping();
        }
        else {
            assert(audits.entries.lastKey());
            audit_log_search(target_string, message, snowflake, result_string, audits.entries.lastKey(), counter + 1 || 1);
        }
    }).catch(error => {
        message.channel.send(new DiscordJS.MessageEmbed()
            .setDescription(`Results so far for ${target_string}:\n${result_string}`)
            .setAuthor(`Failed fetching more audits because ${error}`));
        message.channel.stopTyping();
    });
};
const cmd = {
    'ping': async function (message) {
        if (!message) {
            return;
        }
        try {
            const m = await message.channel.send("Ping!");
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
            util.log('used command: ping', "ping", util.logLevel.INFO);
        }
        catch (e) {
            util.log('Failed to process command (ping)', 'ping', util.logLevel.ERROR);
        }
    },
    'staff': async function (message) {
        if (!message) {
            return;
        }
        try {
            const m = await message.channel.send("Checking!");
            let isStaff = util.isStaff(message);
            m.edit(`${message.author} is${(!isStaff) ? ' not' : ''} a staff member!`);
            util.log('used command: staff', "staff", util.logLevel.INFO);
        }
        catch (e) {
            util.log('Failed to process command (staff)', 'staff', util.logLevel.ERROR);
        }
    },
    'warn': async function (message, args) {
        var _a, _b;
        if (!message) {
            return;
        }
        try {
            if (!util.isStaff(message)) {
                util.sendTextMessage(message.channel, `${message.author} Shoo! You don't have the permissions for that!`);
                return;
            }
            if (!args) {
                console.error("Somehow we got a warn call without args.");
                return;
            }
            let member = ((_a = message.mentions.members) === null || _a === void 0 ? void 0 : _a.first()) || ((_b = message.guild) === null || _b === void 0 ? void 0 : _b.members.cache.get(args[0]));
            if (!member)
                return util.sendTextMessage(message.channel, `Please mention a valid member of this server! REEEEEEE`);
            if (member.roles.cache.find(role => _.isEqual(role.name, 'Staff')))
                return util.sendTextMessage(message.channel, `I cannot warn ${member.user.username}... :thinking:`);
            if (!server.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_1)))
                return util.sendTextMessage(message.channel, `I can't find the role for '${util.roles.WARN_1}' ... :thinking:`);
            if (!server.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_2)))
                return util.sendTextMessage(message.channel, `I can't find the role for '${util.roles.WARN_2}' ... :thinking:`);
            let innocentRole = server.roles.cache.find(role => _.isEqual(role.name, util.roles.INNOCENT));
            let warnRole1 = server.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_1));
            let warnRole2 = server.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_2));
            let hasWarn1 = member.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_1));
            let hasWarn2 = member.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_2));
            let level = 0;
            let reason = message.content.substring(message.content.indexOf(args[0]) + args[0].length + 1);
            let err = false;
            if (!warnRole1 || !warnRole2) {
                console.log("Error in warnings: Warning roles are not defined!");
                return;
            }
            // Warn functionality
            if (hasWarn2) {
                level = 3;
            }
            else if (hasWarn1) {
                await member.roles.add(warnRole2)
                    .then(() => {
                    if (!member || !warnRole1) {
                        console.log("Error in warnings: Member or warning roles are not defined!");
                        return;
                    }
                    member.roles.remove(warnRole1)
                        .catch(() => {
                        util.log(`Failed to remove Warning level 1 from ${member}.`, 'Warn: remove level 1', util.logLevel.ERROR);
                        err = true;
                    });
                    level = 2;
                })
                    .catch(() => {
                    err = true;
                    util.log(`Failed to add Warning level 2 to ${member}.`, 'Warn: 1->2', util.logLevel.ERROR);
                });
            }
            else {
                await member.roles.add(warnRole1)
                    .then(() => {
                    if (!member || !innocentRole) {
                        console.log("Error in warnings: Member or warning roles are not defined!");
                        return;
                    }
                    member.roles.remove(innocentRole)
                        .catch(() => {
                        util.log(`Failed to remove Innocent role from ${member}.`, 'Warn: remove Innocent role', util.logLevel.ERROR);
                        err = true;
                    });
                    level = 1;
                })
                    .catch(() => {
                    err = true;
                    util.log(`Failed to add Warning level 1 to ${member}.`, 'Warn: 0->1', util.logLevel.ERROR);
                });
            }
            if (err)
                return;
            const author = server.members.cache.get(message.author.id);
            if (!author) {
                console.log(message.channel, `Error: ${message.author} tried to warn ${member} but is not in the server ... what?`);
                return;
            }
            dbMod.warnUser(member.user, level, author, reason);
            message.delete();
        }
        catch (e) {
            util.log('Failed to process command (warn)', 'warn', util.logLevel.ERROR);
        }
    },
    'stopmention': function (message) {
        if (!message) {
            return;
        }
        if (util.isStaff(message)) {
            disableMentions = true;
            util.sendTextMessage(message.channel, 'No longer listening to non-staff mentions... :(');
            util.log('Disabling responses to non-staff mentions ...', 'disable mentions', util.logLevel.INFO);
        }
    },
    'startmention': function (message) {
        if (!message) {
            return;
        }
        if (util.isStaff(message)) {
            disableMentions = false;
            util.sendTextMessage(message.channel, 'Start listening to non-staff mentions... :3');
            util.log('Enabling responses to non-staff mentions', 'enable mentions', util.logLevel.INFO);
        }
    },
    'quit': function (message) {
        if (!message) {
            return;
        }
        if (message.author === AsheN) {
            lockdown = true;
            util.log('Locking down...', 'quit', util.logLevel.FATAL);
        }
    },
    'cn': function (message) {
        if (message && !util.isStaff(message)) {
            return;
        }
        let successCount = 0;
        let kickCount = 0;
        let errorCount = 0;
        const newcomerRole = server.roles.cache.find(role => role.name === "Newcomer");
        if (!newcomerRole) {
            util.log(`Failed finding newcomer role`, "Clear Newcomers", util.logLevel.ERROR);
            if (message) {
                util.sendTextMessage(message.channel, `Failed finding newcomer role`);
            }
            return;
        }
        const newcomerMembers = newcomerRole.members.map(m => m.user);
        const channel = message ? message.channel : channels.main;
        if (typeof channel === "string") {
            console.log("Fucking channels are strings and not channels :reeee:");
            return;
        }
        _.each(newcomerMembers, (member, index) => {
            var _a, _b, _c;
            util.log(`Clearing newcomer role from: <@${member.id}> (${index + 1} / ${newcomerMembers.length} )`, "clearNewcomer", util.logLevel.INFO);
            try {
                if ((new Date().getTime() - (((_b = (_a = server.member(member)) === null || _a === void 0 ? void 0 : _a.joinedAt) === null || _b === void 0 ? void 0 : _b.getTime()) || 0)) / 1000 / 60 <= 10) { // joined less than 10 minutes ago
                    return;
                }
                (_c = server.member(member)) === null || _c === void 0 ? void 0 : _c.roles.remove(newcomerRole).then((guildMember) => {
                    var _a;
                    if (_.isNull(guildMember.roles.cache.find(role => role.name === "NSFW")) && ((new Date().getTime() - (((_a = guildMember.joinedAt) === null || _a === void 0 ? void 0 : _a.getTime()) || 0)) / 1000 / 60 > 10)) { // joined more than 10 minutes ago
                        const reason = guildMember + " kicked from not having NSFW role for a longer period of time.";
                        guildMember.kick(reason)
                            .then(() => util.log(reason, 'clearNewcomer', util.logLevel.INFO))
                            .catch(() => util.log("Failed to kick inactive member: " + guildMember, 'clearNewcomer', util.logLevel.WARN));
                        kickCount++;
                    }
                    else {
                        successCount++;
                    }
                    if (index + 1 === newcomerMembers.length) {
                        const logText = successCount + '/' + (successCount + errorCount) + " users cleared of Newcomer role. " + kickCount + " users kicked from not having the NSFW role until now.";
                        util.log(logText, 'clearNewcomer', util.logLevel.INFO);
                        util.sendTextMessage(channels.main, logText);
                    }
                });
            }
            catch (e) {
                errorCount++;
                util.log("Couldn't remove Newcomer from: " + member + "\n" + e, 'clearNewcomer', util.logLevel.ERROR);
                if (index + 1 === newcomerMembers.length) {
                    const logText = successCount + '/' + (successCount + errorCount) + " users cleared of Newcomer role. " + kickCount + " users kicked from not having the NSFW role until now.";
                    util.log(logText, 'clearNewcomer', util.logLevel.INFO);
                    channel.send(logText);
                }
            }
        });
        if (newcomerMembers.length === 0) {
            channel.send("0" + " Newcomers found.");
        }
    },
    'ancient': function (message) {
        return;
        if (!message) {
            return;
        }
        if (util.isStaff(message)) {
            const ancientrole = server.roles.cache.find(role => _.isEqual(role.name, util.roles.ANCIENT));
            if (!ancientrole) {
                console.error(`Ancient role not found!`);
                return;
            }
            let ancientTimeThreshold = new Date(server.createdTimestamp + (new Date().getTime() - server.createdTimestamp) / 5);
            util.sendTextMessage(message.channel, `Threshold for "Ancient Member" is at: ${ancientTimeThreshold.toString()}`);
            let ancientMembers = server.members.cache.filter(m => {
                return ((m.joinedTimestamp || 0) <= ancientTimeThreshold.getTime()) && (!m.user.bot) && _.isNull(m.roles.cache.find(r => _.isEqual(r.name, util.roles.ANCIENT)));
            });
            ancientMembers.forEach(member => {
                var _a;
                member.roles.add(ancientrole).then();
                console.log(member.user.username + ", last message: " + (((_a = member.lastMessage) === null || _a === void 0 ? void 0 : _a.createdAt) || " too old"));
            });
        }
        else {
            util.sendTextMessage(message.channel, "Shoo! You don't have permissions for that!");
        }
    },
    'clear': function (message, args) {
        if (!message) {
            return;
        }
        if (util.isStaff(message)) {
            if (!(args === null || args === void 0 ? void 0 : args[0])) {
                return;
            }
            const number = parseInt(args[0]);
            if (args === null || args === void 0 ? void 0 : args[0]) {
                message.channel.messages.fetch({ limit: (number + 1) })
                    .then(messages => {
                    let count = 0;
                    messages.forEach(m => {
                        m.delete();
                        if (++count === messages.size - 1) {
                            setTimeout(() => {
                                message.channel.send(`\`Cleared ${count - 1} message(s)!\``)
                                    .then(d => setTimeout(() => d.delete(), 5000));
                                util.log(`${message.author} cleared ${count - 1} meessages in ${message.channel}`, 'clear', util.logLevel.INFO);
                            }, 1000);
                        }
                    });
                });
            }
        }
    },
    'age': function (message) {
        if (!message) {
            return;
        }
        const snowflakes = (message.content.match(/\d+/g) || [message.author.id]).filter(match => match.length > 15);
        snowflakes.forEach(async (snowflake) => {
            const deconstructed_snowflake = DiscordJS.SnowflakeUtil.deconstruct(snowflake);
            if (deconstructed_snowflake.timestamp === 1420070400000) { //that seems to be the default time when the ID was not found
                util.sendTextMessage(message.channel, "Unknown ID");
                return;
            }
            //Figure out the origin of the ID
            let target_string;
            if (server.members.cache.get(snowflake)) { //is it a server member?
                target_string = `member ${server.members.cache.get(snowflake)}`;
            }
            else if (server.roles.cache.get(snowflake)) { //a role?
                const role = server.roles.cache.get(snowflake);
                if ((role === null || role === void 0 ? void 0 : role.id) === server.id) { //the everyone role ID is the same as the server ID, let's assume they meant the server and not the role
                    target_string = `server **${server.name}**`;
                }
                else { //a role that is not the everyone role
                    target_string = `role ${server.roles.cache.get(snowflake)}`;
                }
            }
            else if (server.channels.cache.get(snowflake)) { //a channel?
                target_string = `channel ${server.channels.cache.get(snowflake)}`;
            }
            else if (server.emojis.cache.get(snowflake)) { //an emoji?
                target_string = `emoji ${server.emojis.cache.get(snowflake)}`;
            }
            else {
                const user = await client.users.fetch(snowflake).catch(err => { return null; });
                if (user) { //a user who is not a guild member?
                    target_string = `user ${client.users.cache.get(snowflake)}`;
                }
                else { //ok I give up
                    //unfortunately we can't look up servers by ID
                    target_string = `unknown ID **${snowflake}**`;
                }
            }
            //add generic fields Created and Age
            let embed = new DiscordJS.MessageEmbed().setDescription(`Age of ${target_string}`);
            embed.addField("Created", `${deconstructed_snowflake.date.toUTCString()}`);
            embed.addField("Age", `${util.time((new Date).getTime() - deconstructed_snowflake.timestamp)}`);
            const member = server.members.cache.get(snowflake);
            const member_age = member ? member.joinedAt : null;
            if (member_age) { //add member fields Joined, Member Since and Eligible
                const ancientTimeThreshold = new Date(server.createdTimestamp + (new Date().getTime() - server.createdTimestamp) / 5);
                const ancient_date = new Date(server.createdTimestamp + (member_age.getTime() - server.createdTimestamp) * 5);
                const ancient_string = member_age.getTime() < ancientTimeThreshold.getTime() ? "Yes" : `on ${ancient_date.toUTCString()} in ${util.time(ancient_date.getTime() - new Date().getTime())}`;
                embed.addField("Joined", `${member_age.toUTCString()}`);
                embed.addField("Member Since", `${util.time(new Date().getTime() - member_age.getTime())}`);
                embed.addField(`Eligible For **${util.roles.ANCIENT}**`, `${ancient_string}`);
            }
            util.sendTextMessage(message.channel, embed);
        });
    },
    'pfp': function (message) {
        if (!message) {
            return;
        }
        const snowflakes = (message.content.match(/\d+/g) || [message.author.id]).filter(match => match.length > 15);
        snowflakes.forEach(snowflake => {
            client.users.fetch(snowflake).then(user => {
                if (user) {
                    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`${user}'s Avatar`).setImage(user.displayAvatarURL()));
                }
                else {
                    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Invalid User: <@${snowflake}>`));
                }
            }).catch(error => util.sendTextMessage(message.channel, `Invalid user ID: <@${snowflake}>`));
        });
    },
    'audit': function (message) {
        if (!message) {
            return;
        }
        util.sendTextMessage(message.channel, "Sorry, currently broken because TS is a bitch");
        let b = true;
        if (b)
            return;
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author} You audition for a porn movie where you get used like a slut.\n` +
                `The audition video sells well, but you never hear from them again.`);
            return;
        }
        const snowflakes = (message.content.match(/\d+/g) || [message.author.id]).filter(match => match.length > 15);
        snowflakes.forEach(async (snowflake) => {
            if (server.members.cache.has(snowflake)) { //is it a server member?
                audit_log_search(`member ${server.members.cache.get(snowflake)}`, message, snowflake);
            }
            else if (server.roles.cache.has(snowflake)) { //a role?
                if (snowflake === server.id) {
                    audit_log_search(`role ${server.roles.cache.get(snowflake)} / server ${server.name}`, message, snowflake);
                }
                else {
                    audit_log_search(`role ${server.roles.cache.get(snowflake)}`, message, snowflake);
                }
            }
            else if (server.channels.cache.has(snowflake)) { //a channel?
                audit_log_search(`channel ${server.channels.cache.get(snowflake)}`, message, snowflake);
            }
            else if (server.emojis.cache.has(snowflake)) { //an emoji?
                audit_log_search(`emoji ${server.emojis.cache.get(snowflake)}`, message, snowflake);
            }
            else {
                const user = await client.users.fetch(snowflake).catch(err => { return null; });
                if (user) { //a user who is not a guild member?
                    audit_log_search(`user ${client.users.cache.get(snowflake)}`, message, snowflake);
                }
                else { //ok I give up
                    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Wtf is that ID?`));
                }
            }
        });
    },
    'slowmode': function (message) {
        var _a, _b, _c;
        if (!message) {
            return;
        }
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author} Too slow!`);
            return;
        }
        if (!("setRateLimitPerUser" in message.channel)) {
            util.sendTextMessage(message.channel, `Error: Command unavailable in this discord.js version. Required version: 11.5.0+`);
            return;
        }
        const matches = message.content.match(/\d+/g);
        if (!(matches === null || matches === void 0 ? void 0 : matches[0])) {
            util.sendTextMessage(message.channel, `Error: Failed parsing channel. Example usage: \`slowmode #channel 3h 5m 2s\``);
            return;
        }
        const target_channel = server.channels.cache.get(matches[0]);
        if (target_channel === undefined) {
            util.sendTextMessage(message.channel, `Error: Failed finding channel \`<#${matches[0]}>\``);
            return;
        }
        if (!(target_channel instanceof DiscordJS.TextChannel)) {
            util.sendTextMessage(message.channel, `Error: Cannot set slowmode on non-text channel \`<#${matches[0]}>\``);
            return;
        }
        const hours = parseInt(((_a = message.content.match(/\d+h/g)) === null || _a === void 0 ? void 0 : _a[0]) || "0");
        const minutes = parseInt(((_b = message.content.match(/\d+m/g)) === null || _b === void 0 ? void 0 : _b[0]) || "0");
        const seconds = parseInt(((_c = message.content.match(/\d+s/g)) === null || _c === void 0 ? void 0 : _c[0]) || "0");
        const time_s = hours * 60 * 60 + minutes * 60 + seconds;
        const time_str = `${hours}h ${minutes}m ${seconds}s`;
        target_channel.setRateLimitPerUser(time_s, `Set by @${message.author.tag} in #${message.channel.name}`)
            .then(() => {
            util.sendTextMessage(message.channel, `Successfully set slowmode in ${target_channel} to ${time_str}.`);
            util.log(`${message.author} set the slowmode in ${target_channel} to ${time_str}.`, `Channel Administration`, util.logLevel.INFO);
        })
            .catch(error => {
            util.sendTextMessage(message.channel, `Failed setting slowmode to ${time_str} because of:\n${error}`);
            util.log(`${message.author} failed setting slowmode in ${target_channel} to ${time_str} because of:\n${error}`, `Channel Administration`, util.logLevel.ERROR);
        });
    },
    'sm': function (message) {
        cmd.slowmode(message);
    },
    'cultinfo': function (message) {
        if (!message) {
            return;
        }
        if (typeof channels["cult-info"] === "string") {
            util.sendTextMessage(message.channel, "Error: cultinfo channel could not be resolved");
            return;
        }
        message.channel.startTyping();
        channels["cult-info"].messages.fetch({ limit: 1 })
            .then(messages => {
            let cultMsg = messages.first();
            if (cultMsg && cultMsg.mentions.roles) {
                const embed = new DiscordJS.MessageEmbed()
                    .setAuthor(`Cult Info`)
                    .setTimestamp(new Date());
                let description = "";
                let cultsString = cultMsg.content.split("\n\n");
                class Cult {
                    constructor(iconId, roleId, leaderId, memberCount) {
                        this.iconId = iconId;
                        this.roleId = roleId;
                        this.leaderId = leaderId;
                        this.memberCount = memberCount;
                    }
                }
                ;
                let cults = [];
                cultsString.forEach(cult => {
                    var _a, _b, _c, _d, _e;
                    if (!cult.match("<@&[0-9]*>"))
                        return;
                    const roleId = (_a = cult.match("<@&[0-9]*>")) === null || _a === void 0 ? void 0 : _a[0].slice(3, -1);
                    if (!roleId)
                        return;
                    const iconId = cult.slice(0, 2) === "<:" ? (_b = cult.match("<:[a-zA-Z_0-9]*:[0-9]*>")) === null || _b === void 0 ? void 0 : _b[0] : cult.slice(0, 2);
                    if (!iconId)
                        return;
                    const leaderId = (_d = (_c = cult.match("<@!?[0-9]*>")) === null || _c === void 0 ? void 0 : _c[0].match("[0-9]+")) === null || _d === void 0 ? void 0 : _d[0];
                    if (!leaderId)
                        return;
                    const memberCount = (_e = server.roles.cache.get(roleId)) === null || _e === void 0 ? void 0 : _e.members.map(m => m.user.tag).length;
                    if (memberCount === undefined)
                        return;
                    cults.push({
                        iconId: iconId,
                        roleId: roleId,
                        leaderId: leaderId,
                        memberCount: memberCount
                    });
                });
                cults = cults.sort((a, b) => b.memberCount - a.memberCount);
                cults.forEach(cult => {
                    description +=
                        `${cult.iconId} <@&${cult.roleId}>\n`
                            + `Leader: <@!${cult.leaderId}>\n`
                            + `**${cult.memberCount}** members\n\n`;
                });
                embed.setDescription(description);
                message.channel.send(embed)
                    .then(() => message.channel.stopTyping())
                    .catch(err => util.log(err, 'cultInfo', util.logLevel.ERROR));
            }
        })
            .catch(err => {
            util.log(err, 'cultInfo', util.logLevel.ERROR);
            message.channel.stopTyping();
        });
    },
    'checkwarn': function (message) {
    },
    'cw': function (message) {
        cmd.checkwarn(message);
    },
    'roles': function (message, args) {
        if (!message) {
            return;
        }
        if (!util.isStaff(message)) { //the commands are really spammy
            return;
        }
        if ((args === null || args === void 0 ? void 0 : args.length) === 0) {
            util.sendTempTextMessage(message.channel, 'That didn\'t work out... maybe try `_roles who <roleID>` or `_roles usage` or `_roles usage list`');
            return;
        }
        if ((args === null || args === void 0 ? void 0 : args[0]) === "usage") {
            args = args.slice(1);
            return cmd["roles usage"](message, args);
        }
        if ((args === null || args === void 0 ? void 0 : args[0]) === "who") {
            return cmd["roles who"](message);
        }
        util.sendTempTextMessage(message.channel, 'That didn\'t work out... maybe try `_roles who <roleID>` or `_roles usage` or `_roles usage list`');
    },
    'roles usage': function (message, args) {
        if (!message) {
            return;
        }
        let sortOrder = "";
        if (args && _.isEqual(args[0], "list")) {
            sortOrder = "list";
        }
        let roles = new DiscordJS.Collection();
        server.roles.cache.forEach(role => roles.set(role.id, 0));
        server.members.cache.forEach(member => {
            member.roles.cache.forEach(role => roles.set(role.id, (roles.get(role.id) || 0) + 1));
        });
        roles = roles.sort((count_left, count_right, role_left, role_right) => {
            const left_role = server.roles.cache.get(role_left);
            const right_role = server.roles.cache.get(role_right);
            if (!left_role || !right_role) {
                //something is very broken
                return 0;
            }
            if (sortOrder !== "list") {
                if (count_right - count_left) { //sort by use-count first
                    return count_right - count_left;
                }
                //sort by name second
                return left_role.name < right_role.name ? -1 : 1;
            }
            else if (sortOrder === "list") { //sort by name second
                return DiscordJS.Role.comparePositions(right_role, left_role);
            }
            return 0;
        });
        const roles_str = roles.reduce((current, count, role) => current + `${server.roles.cache.get(role)}: ${count}\n`, "");
        util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`${roles.size}/250 roles:\n${roles_str}`));
    },
    'roles who': function (message) {
        if (!message) {
            return;
        }
        const ids = message.content.match(/\d+/g);
        if (!ids) {
            util.sendTempTextMessage(message.channel, 'Please specify the ID of the role you want to check on!');
            return;
        }
        ids.forEach(id => {
            const role = server.roles.cache.get(id);
            if (!role)
                return;
            const users_str = server.members.cache.reduce((curr, member) => {
                if (member.roles.cache.has(role.id)) {
                    curr += `${member} `;
                }
                return curr;
            }, "");
            util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Users with role ${role}:\n${users_str}`));
        });
    },
    'call': async function (message) {
        var _a;
        if (!message) {
            return;
        }
        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = ((_a = args.shift()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
        try {
            if (_.isEqual(command, "call"))
                return;
            if (_.isUndefined(this[command]))
                return;
            if (command in this) {
                this[command](message, args);
                util.log(message.author.username + ' is calling command: ' + command, command, util.logLevel.INFO);
            }
        }
        catch (e) {
            util.log(`Failed to process (${command})`, command, util.logLevel.ERROR);
        }
    },
    'stop typing': function (message) {
        message === null || message === void 0 ? void 0 : message.channel.stopTyping(true);
    },
    'help': function (message) {
        if (!message) {
            return;
        }
        util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`I understand the following commands. *Italic* commands are staff-only.

**\`_ping\`**
Show practical reaction delay and Discord delay.

**\`_staff\`**
Checks if you are staff.

***\`_warn\`*** \`[@user] [?reason]\`
Applies appropriate warning role (Warned 1x or Warned 2x), sends a DM about the warning and enters it into database.

***\`_stopmention\`***
Makes me no longer listen to non-staff.

***\`_startmention\`***
Makes me listen to non-staff again.

***\`_cn\`***
Kick newcomers who do not have the NSFW role for over 10 minutes. The command is run automatically every full hour.

***\`_clear\`*** \`[number]\`
Deletes the laste [number] messages.

**\`_age\`** \`[@user|#channel|emoji|ID]*\`
Display the age of an ID. If the ID is of a member of the server also display when they joined and will be eligible for the ancient role. If you don't specify an ID it displays your own info.

**\`_pfp\`** \`[@user|userID]*\`
Display the profile picture of a user in big.

***\`_audit\`*** \`[mention|ID]*\`
Go through the last 10000 audit entries and display all entries (up to message limit) that contain moderator action of the given target. This command tends to take ~10-20 seconds, please be patient.

***\`_slowmode\`*** | ***\`_sm\`*** \`[#channel|channelID] [number][h|m|s]*\`
Sets slowmode to the channel. Example: \`_slowmode #🔞general 30s 2m\`. The time is optional and defaults to 0. The maximum time is 6 hours. Use this command if you need to set a slowmode that is not supported by the UI such as 4 hours.

**\`_cultinfo\`**
Displays a list of the current cults and their symbol, cult role, leader and number of members sorted by members.

***\`_roles usage\`***
Displays a list of all roles and the number of their uses sorted by use-count.

***\`_roles usage list\`***
Displays a list of all roles and the number of their uses sorted by name.

***\`_roles who\`*** \`[@role|roleID]*\`
Displays a list of members who have the specified role(s).

**\`_help\`**
Display this text.`));
    },
};
const fnct = {
    'serverStats': function (modes) {
        try {
            _.forEach(modes, mode => {
                var _a;
                let channel = "";
                let str = "";
                switch (mode) {
                    case 'users':
                        channel = "582321301142896652";
                        str = "📊User Count: " + server.members.cache.filter(member => !member.user.bot).size;
                        break;
                    case 'online':
                        channel = "582321302837133313";
                        str = "📊Online users: " + server.members.cache.filter(member => !member.user.bot && !_.isEqual(member.user.presence.status, "offline")).size;
                        break;
                    case 'new':
                        channel = "582309343274205209";
                        str = "📈New users: " + server.members.cache.filter(member => !member.user.bot && ((new Date().getTime() - (member.joinedTimestamp || 0)) / 1000 / 60 / 60 / 24) <= 1).size;
                        break;
                    case 'bots':
                        channel = "582309344608124941";
                        str = "🤖Bot Count: " + server.members.cache.filter(member => member.user.bot).size;
                        break;
                    case 'roles':
                        channel = "606773795142893568";
                        str = "🎲Roles: " + server.roles.cache.size;
                        break;
                    case 'channels':
                        channel = "606773807306506240";
                        str = "📇Channels: " + server.channels.cache.size;
                        break;
                    case 'age':
                        channel = "606773822284365874";
                        let age = Math.floor((new Date().getTime() - server.createdTimestamp) / 1000 / 60 / 60 / 24);
                        let ageDays = age % 365;
                        let ageDstr = `${ageDays > 0 ? ageDays + (ageDays > 1 ? ' days' : ' day') : '0 days'}`;
                        let ageYears = Math.floor(age / 365);
                        let ageYstr = `${ageYears > 0 ? ageYears + (ageYears > 1 ? ' years ' : ' year ') : ''}`;
                        str = `📅Age: ${ageYstr} ${ageDstr}`;
                        break;
                    default:
                        break;
                }
                (_a = server.channels.cache.get(channel)) === null || _a === void 0 ? void 0 : _a.setName(str);
            });
        }
        catch (e) {
            util.log(`Failed to update server stats for ${modes}: ${e}`, 'Server Stats', util.logLevel.ERROR);
        }
        util.log('Successfully updated server stats! (' + modes + ')', 'Server Stats', util.logLevel.INFO);
    },
    'approveChar': function (message, reaction, user) {
        try {
            if (!(message.channel instanceof DiscordJS.TextChannel))
                return;
            if (typeof channels["char-sub"] === "string")
                return;
            if (typeof channels["char-archive"] === "string")
                return;
            if (_.isEqual(message.channel.name, channels["char-sub"].name) && util.isUserStaff(user)) {
                let msgType = _.isEqual(reaction.name, "⭐") ? 1 : _.isEqual(reaction.name, "✅") ? 2 : 0;
                if (msgType === 0) {
                    return;
                }
                let msgAttachments = message.attachments.map(a => a.url);
                let msgImagesString = "";
                _.each(msgAttachments, imgUrl => msgImagesString += imgUrl + "\n");
                util.log(`${user} approved character message:\n ${message.content}\n ${msgImagesString}`, "approveCharacter", util.logLevel.INFO);
                let msgContent = `User: ${message.author}\n${message.content}`;
                channels["char-archive"].send(msgType === 1 ? msgContent : message.content, { files: msgAttachments })
                    .then(msg => {
                    if (typeof channels["char-index"] === "string")
                        return;
                    if (msgType === 1) {
                        channels["char-index"].send(`\`${message.author} Your character has been approved/updated and can be found in the index under \"\"\``);
                    }
                    let msgImages = msg.attachments.map(a => a.url);
                    let msgImagesString = "";
                    _.each(msgImages, imgUrl => msgImagesString += imgUrl + "\n");
                    channels["char-index"].send(`\`r!addchar \"charName\"\n\``);
                    channels["char-index"].send(`\`${message.content}\``);
                    channels["char-index"].send(`${msgImagesString}`);
                });
            }
        }
        catch (e) {
            util.log(e, 'approveCharacter', util.logLevel.ERROR);
        }
    },
    'addFeedback': function (message, user) {
        if (_.isEqual(message, rpFeedbackMessage)) {
            util.log(`${user} has started RP Feedback`, 'addFeedback', util.logLevel.INFO);
            if (typeof channels["rp-fb-index"] === "string")
                return;
            channels["rp-fb-index"].overwritePermissions([{
                    id: user.id,
                    allow: ["VIEW_CHANNEL"]
                }], 'Add Feedback entry')
                .then(() => {
                if (typeof channels["rp-fb-index"] === "string")
                    return;
                channels["rp-fb-index"].send(`${user}, please submit your RP Feedback in this channel! It's highly advised ` +
                    `to use the template below, but whether you use all the fields or add more is ` +
                    `completely up to you. If you have any questions, feel free to ask right away!`);
                channels["rp-fb-index"].send(rpFeedbackTemplate);
            })
                .catch((err) => util.log(err, 'addFeedback', util.logLevel.ERROR));
        }
    },
    'revokeFeedback': function (message, user) {
        if (_.isEqual(message, rpFeedbackMessage)) {
            util.log(`${user} has revoked RP Feedback`, 'revokeFeedback', util.logLevel.INFO);
            if (typeof channels["rp-fb-index"] === "string")
                return;
            channels["rp-fb-index"].overwritePermissions([{
                    id: user.id,
                    deny: ["VIEW_CHANNEL"]
                }], 'Remove Feedback entry')
                .then(() => {
                if (typeof channels["rp-fb-index"] === "string")
                    return;
                channels["rp-fb-index"].messages.fetch()
                    .then(messages => {
                    let msg = messages.filter(m => { var _a; return _.isEqual(m.author.id, (_a = client.user) === null || _a === void 0 ? void 0 : _a.id); });
                    let messagesToDelete = [];
                    msg.forEach((m, key) => {
                        var _a;
                        if ((_a = m.mentions.members) === null || _a === void 0 ? void 0 : _a.has(user.id)) {
                            messagesToDelete.push(m);
                        }
                        else if (messagesToDelete.length !== 2) {
                            messagesToDelete = [];
                            messagesToDelete.push(m);
                        }
                    });
                    _.each(messagesToDelete, m => m.delete());
                });
            })
                .catch((err) => util.log(err, 'revokeFeedback', util.logLevel.ERROR));
        }
    },
    'approveFeedback': function (message, reaction, user) {
        if (_.isEqual(message.channel, channels["rp-fb-index"]) && util.isUserStaff(user)) {
            if (message.author === client.user) {
                return;
            }
            util.log(`${user} has approved ${message.author}'s RP Feedback`, 'approveFeedback', util.logLevel.INFO);
            if (typeof channels["rp-fb-index"] === "string")
                return;
            channels["rp-fb-index"].overwritePermissions([{
                    id: message.author.id,
                    deny: ["VIEW_CHANNEL"]
                }], 'Approve Feedback: Remove Feedback index read permissions')
                .then(() => {
                message.channel.messages.fetch()
                    .then(messages => {
                    const msg = messages.filter(m => { var _a; return _.isEqual(m.author.id, (_a = client.user) === null || _a === void 0 ? void 0 : _a.id) && m.createdTimestamp < message.createdTimestamp; });
                    msg.forEach(m => m.delete());
                });
                const feedback = (_.isEqual(reaction.name, "⭐") ? `\`` : `\`RP Feedback for: <@UserID>\n`) +
                    `Writen by: ${message.author}\n\n` +
                    message.content + `\``;
                message.channel.send(feedback);
            })
                .catch((err) => util.log(`${err}`, 'approveFeedback', util.logLevel.ERROR));
        }
    }
};
const split_text_message = (message) => {
    let message_pieces;
    try {
        //try splitting after newlines
        message_pieces = DiscordJS.Util.splitMessage(message);
    }
    catch (error) {
        //fall back to splitting after spaces
        message_pieces = DiscordJS.Util.splitMessage(message, { char: ' ' });
    }
    return Array.isArray(message_pieces) ? message_pieces : [message_pieces]; //always return an array
};
const util = {
    'sendTextMessage': function (channel, message) {
        if (!channel || typeof channel === "string")
            return;
        try {
            channel.startTyping();
            const message_pieces = split_text_message(typeof message === "string" ? message : message.description || "");
            setTimeout(function () {
                _.forEach(message_pieces, message_piece => {
                    if (message instanceof DiscordJS.MessageEmbed) {
                        channel.send(new DiscordJS.MessageEmbed(message).setDescription(message_piece));
                    }
                    else {
                        channel.send(message_piece);
                    }
                });
                channel.stopTyping();
            }, 500);
        }
        catch (e) {
            const text = typeof message === "string" ? message : message.description || "";
            this.log('Failed to send message: ' + text.slice(1970), "", this.logLevel.ERROR);
            channel.stopTyping();
        }
    },
    'sendTempTextMessage': function (channel, message, embed) {
        try {
            if (!channel) {
                return;
            }
            channel.startTyping();
            const message_pieces = split_text_message(message);
            setTimeout(function () {
                _.forEach(message_pieces, message_piece => {
                    if (embed) {
                        channel.send(new DiscordJS.MessageEmbed(embed).setDescription(message_piece))
                            .then(d => setTimeout(() => d.delete(), 5000));
                    }
                    else {
                        channel.send(message_piece)
                            .then(d => setTimeout(() => d.delete(), 5000));
                        ;
                    }
                });
                channel.stopTyping();
            }, 500);
        }
        catch (e) {
            this.log('Failed to send message: ' + message.slice(1970), "", this.logLevel.ERROR);
            channel.stopTyping();
        }
    },
    'isStaff': function (message) {
        var _a, _b;
        return ((_b = (_a = message.author.lastMessage) === null || _a === void 0 ? void 0 : _a.member) === null || _b === void 0 ? void 0 : _b.roles.cache.find(role => _.isEqual(role.name, this.roles.STAFF) || _.isEqual(role.name, this.roles.TRIALMOD))) || message.author === AsheN;
    },
    'isUserStaff': function (user) {
        var _a;
        const staffRole = server.roles.cache.find(role => role.name === util.roles.STAFF || role.name === util.roles.TRIALMOD);
        if (!staffRole || !staffRole.id)
            return;
        return (((_a = server.roles.cache.get(staffRole.id)) === null || _a === void 0 ? void 0 : _a.members.map(m => m.user).filter(staffMember => _.isEqual(staffMember, user)).length) || 0) > 0;
    },
    'roles': {
        'DONTPING': "DONT PING⛔",
        'STAFF': "Staff",
        'TRIALMOD': "Trial-Moderator",
        'ANCIENT': "💠Ancient Member",
        'NEW': "Newcomer",
        'NSFW': "NSFW",
        'MUTED': "Muted",
        'INNOCENT': "Innocent",
        'WARN_1': "Warned 1x",
        'WARN_2': "Warned 2x",
        'LVL': {
            'LVL_0': "Lewd (Lvl 0+)",
            'LVL_5': "Pervert (Lvl 5+)",
            'LVL_10': "Tainted (Lvl 10+)",
            'LVL_20': "Slut (Lvl 20+)",
            'LVL_30': "Whore (Lvl 30+)",
            'LVL_40': "Cumdump (Lvl 40+)",
            'LVL_50': "Pornstar (Lvl 50+)",
            'LVL_60': "Sex-Toy (Lvl 60+)",
            'LVL_70': "Server Bus (Lvl 70+)",
            'LVL_80': "Doesn't leave bed (Lvl 80+)",
            'LVL_90': "Sperm Bank (Lvl 90+)",
            'LVL_100': "Retired Pornstar (Lvl 100+)",
        },
        'LFP_BANNED': "Banned from LFP",
        'LFP': {
            'VANILLA': "Vanilla",
            'BI': "Bi/Pansexual",
            'GAY': "Gay",
            'LESBIAN': "Lesbian",
            'FUTA': "Futa",
            'RPFUTA': "RP with Futas",
            'FURRY': "Furry",
            'RPFURRY': "RP with Furries",
            'BEAST': "Beast",
            'HYBRID': "Hybrid",
            'RPBEAST': "RP with Beasts",
            'EXTREME': "Extreme",
        }
    },
    'reportToAsheN': function (errMsg) {
        try {
            AsheN.send(errMsg);
        }
        catch (e) {
            if (!_.isUndefined(localConfig))
                console.log("(" + moment().format('MMM DD YYYY - HH:mm:ss.SSS') + ") Failed to start up.");
        }
    },
    'log': function (message, moduleName, level) {
        if (_.isUndefined(channels.logs))
            return;
        level = ((_.isUndefined(level)) ? this.logLevel.INFO : level);
        let embedColor = 0xE0FFFF;
        switch (level) {
            case util.logLevel.WARN:
                embedColor = 0xFFD700;
                break;
            case util.logLevel.ERROR:
                embedColor = 0xFF7F50;
                break;
            case util.logLevel.FATAL:
                embedColor = 0xDC143C;
                break;
            default:
                break;
        }
        let currDateTime = moment().format('MMM DD YYYY - HH:mm:ss.SSS');
        let logMessage = level + " | " + currDateTime + " | " + moduleName + ": " + message;
        if (_.isEqual(level, this.logLevel.FATAL))
            this.reportToAsheN(message);
        // channels.logs.send(logMessage);
        let logEmbed = new DiscordJS.MessageEmbed()
            .setAuthor(level)
            .setColor(embedColor)
            .setDescription(message)
            .setFooter(moduleName)
            .setTimestamp(new Date());
        if (typeof channels.logs === "string")
            return;
        channels.logs.send(logEmbed);
        if (_.isUndefined(localConfig))
            return;
        console.log(logMessage);
    },
    'logLevel': {
        'INFO': "INFO",
        'WARN': "WARN",
        'ERROR': "**ERROR**",
        'FATAL': "__**FATAL**__",
    },
    'image_link_count': function (message_string) {
        return (message_string.toUpperCase().match(/\.PNG|\.JPG|\.JPEG|\.TIFF|\.BMP|\.PPM|\.PGM|\.PBM|\.PNM|\.WEBP|\.SVG|\.GIF/g) || []).length;
    },
    'level_to_role': function (level) {
        let result;
        if (level < 5) {
            result = util.roles.LVL.LVL_0;
        }
        else if (level < 10) {
            result = util.roles.LVL.LVL_5;
        }
        else if (level < 20) {
            result = util.roles.LVL.LVL_10;
        }
        else if (level < 30) {
            result = util.roles.LVL.LVL_20;
        }
        else if (level < 40) {
            result = util.roles.LVL.LVL_30;
        }
        else if (level < 50) {
            result = util.roles.LVL.LVL_40;
        }
        else if (level < 60) {
            result = util.roles.LVL.LVL_50;
        }
        else if (level < 70) {
            result = util.roles.LVL.LVL_60;
        }
        else if (level < 80) {
            result = util.roles.LVL.LVL_70;
        }
        else if (level < 90) {
            result = util.roles.LVL.LVL_80;
        }
        else if (level < 100) {
            result = util.roles.LVL.LVL_90;
        }
        else {
            result = util.roles.LVL.LVL_100;
        }
        return result;
    },
    'handle_level_up': function (message) {
        var _a, _b, _c;
        const member = (_a = message.mentions.members) === null || _a === void 0 ? void 0 : _a.first();
        if (!member)
            return;
        const user = member.user;
        const level_string = (_b = message.content.match(/level \d+/g)) === null || _b === void 0 ? void 0 : _b[0];
        if (!level_string)
            return;
        const level = parseInt(((_c = level_string.match(/\d+/g)) === null || _c === void 0 ? void 0 : _c[0]) || "");
        const new_role = util.level_to_role(level);
        const old_roles = member.roles.cache.filter(role => _.contains(util.roles.LVL, role));
        let role_gain_string = "";
        if (!old_roles.find(role => role == new_role)) {
            role_gain_string = `${new_role}`;
        }
        const outdated_roles = old_roles.filter(role => role != new_role);
        let role_lose_string = "";
        if (outdated_roles.size > 0) {
            const outdated_roles_string = outdated_roles.reduce((current, next) => current + `${next}`, "");
            role_lose_string = `${outdated_roles_string}`;
        }
        const reason = `${user.username} gained level ${level}`;
        //Note: Need to be careful to add first and then remove, otherwise Yag adds the lvl0 role
        const role_remover = () => {
            if (role_lose_string) {
                member.roles.remove(outdated_roles, reason)
                    .then(() => {
                    message.react('✅').catch(console.error);
                    util.log(`Successfully removed ${role_lose_string} from ${user}\nMessage Link: <${message.url}>.`, level_up_module, util.logLevel.INFO);
                })
                    .catch(error => {
                    util.log(`Failed to remove ${role_lose_string} from ${user}\nMessage Link: <${message.url}>\nError: ${error}`, level_up_module, util.logLevel.ERROR);
                });
            }
        };
        // add role
        if (role_gain_string) {
            member.roles.add(new_role, reason)
                .then(() => {
                role_remover();
                util.log(`Successfully added ${role_gain_string} to ${user}\nMessage Link: <${message.url}>.`, level_up_module, util.logLevel.INFO);
                if (level === 5) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 5` in the Breeding Den Server! You're now able to submit characters and join Voice Channels if you want to!" +
                        "\n\n(_P.S. I'm a bot, so please don't reply!_)");
                }
                else if (level === 20) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 20` in the Breeding Den Server! You've unlocked the <#560869811157073920> " +
                        "and you're able to create your own cult, as long as certain criterias are met too!" +
                        "For more detailed information, please check out the very top message in <#538901164897337347>" +
                        "\nIf you're interested, simply ask a Staff member and they will guide you through the process!\n\n(_P.S. I'm a bot, so please don't reply!_)");
                }
                else if (level === 30) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 30` in the Breeding Den Server! You're now able to get yourself a __Custom Role__ if you want to!" +
                        "\nSimply ask a Staff member and tell them the __Name__ and __Color__ (ideally in Hexcode) of the Custom role!\n\n(_P.S. I'm a bot, so please don't reply!_)");
                }
            })
                .catch(error => {
                util.log(`Failed to add ${role_gain_string} to ${user}\nMessage Link: <${message.url}>\nError: ${error}`, level_up_module, util.logLevel.ERROR);
            });
        }
        else {
            // remove role
            role_remover();
        }
    },
    'time': function (time_ms) {
        let time = ~~(time_ms / 1000);
        const s = ~~time % 60;
        time /= 60;
        const m = ~~time % 60;
        time /= 60;
        const h = ~~time % 24;
        time /= 24;
        const d = ~~time % 365;
        time /= 365;
        const y = ~~time;
        if (y) {
            return `${y}y ${d}d`;
        }
        if (d) {
            return `${d}d ${h}h`;
        }
        if (h) {
            return `${h}h ${m}m`;
        }
        if (m) {
            return `${m}m ${s}s`;
        }
        return `${s}s`;
    },
};
client.login(_.isUndefined(localConfig) ? process.env.BOT_TOKEN : localConfig.TOKEN);
