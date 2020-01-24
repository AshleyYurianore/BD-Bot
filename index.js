let localConfig;
try { localConfig = require("./localConfig"); } catch (e) { }

const DiscordJS = require("discord.js");
const client = new DiscordJS.Client();
const _ = require("underscore");
const moment = require("moment");
const assert = require('assert');
const schedule = require('node-schedule');

const MongoClient = require('mongodb').MongoClient;
const db_name = (_.isUndefined(localConfig)) ? process.env.DB_NAME : localConfig.DB.NAME;
const db_port = (_.isUndefined(localConfig)) ? process.env.DB_PORT : localConfig.DB.PORT;
const db_user = (_.isUndefined(localConfig)) ? process.env.DB_USER : localConfig.DB.USER;
const db_pw = (_.isUndefined(localConfig)) ? process.env.DB_PW : localConfig.DB.PW;
const url = `mongodb://${db_user}:${db_pw}@ds1${db_port}.mlab.com:${db_port}/${db_name}`;

const prefix = _.isUndefined(localConfig) ? process.env.PREFIX : localConfig.PREFIX;
let server = _.isUndefined(localConfig) ? process.env.SERVER_ID : localConfig.SERVER;
let channels = {
    'main': "accalia-main",
    'logs': "accalia-logs", 
    'warnings': "🚨warnings",
    'charSub': "📃character-submission", 
    'charArchive': "📚character-archive",
    'charIndex': "📕character-index",
    'reports': "📮reports-and-issues",
    'lfp-info': "📌lfp-info",
    'lfp-contact': "💬lfp-contact",
    'lfp-male': "🍆lfp-male",
    'lfp-female': "🍑lfp-female",
    'lfp-vanilla': "🍦lfp-vanilla",
    'lfp-gay': "👬lfp-gay",
    'lfp-lesbian': "👭lfp-lesbian",
    'lfp-trans': "🌽lfp-trans",
    'lfp-futa': "🥕lfp-futa-herm",
    'lfp-furry': "😺lfp-furry",
    'lfp-bestiality': "🦄lfp-bestiality",
    'lfp-extreme': "✨lfp-extreme",
    'lfp-long': "📰lfp-long-term-plot",
    'lfp-rabbit': "📺lfp-vc-rabbit",
};
let lfpTimer = [];
let lfpChannels = [];
let AsheN;
let lockdown = false;
let disableMentions = true;
let ongoingProcess = false;
const dont_ping_role_id = "587756942395703306";
let ping_angry_emoji;

const dbMod = {
    'warnUser': function (member, level, warner, reason) {
        util.log(`Calling DB Module`, 'DB/warnUser', util.logLevel.INFO);
        try {
            util.log(`Attempting to connect to DB`, 'DB/warnUser', util.logLevel.INFO);
            this.connect( function(db) {
                util.log(`Successfully established DB Connection`, 'DB/warnUser', util.logLevel.INFO);
                let warnings = db.collection('warnings');
                let warnedUser = {
                    id: member.user.id,
                    currName: member.user.username,
                    formerName: member.user.username,
                    level: level,
                    reason: reason,
                    warnedAt: new Date(Date.now())
                };

                warnings.findOne({ id: member.user.id })
                    .then(userFound => {
                        if (userFound == null) return;
                        warnedUser.formerName = userFound.formerName;
                        level = userFound.level+1;
                        // TODO: REPLACE FORMERNAME AND LEVEL IF EXISTS IN DB --> PREREQUISITE: SCHEDULED WARNING DELETION
                    })
                    .catch(err => {
                        util.log(`Failed to do command warning (findOneAndUpdate): ${err}.`, 'DB/warnUser', util.logLevel.FATAL);
                    });

                util.log(`Attempting updating/inserting warning for ${member}`, 'DB/warnUser', util.logLevel.INFO);
                // Upsert command
                warnings.findOneAndUpdate(
                    { id: member.user.id },
                    { $set: warnedUser },
                    { upsert: true, returnOriginal: true }
                )
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

                        member.user.send(`You have been given a Level ${level} warning in the server **${server.name}** with reason: '${reason}'\n`+
                            `This warning expires ${expirationMsg[level-1]}`);

                        util.log(`warned: ${member} (${level-1}->${level})`, "warn", util.logLevel.INFO);

                        util.sendTextMessage(channels.warnings,
                            `${member} | **${lvlMsg[level-1]}**\n`+
                            `__Reason:__ ${!_.isEmpty(reason) ? reason : 'Not specified'} (Warned by ${warner})\n` +
                            `__When:__ ${moment().format(dateFormat)}\n`+
                            `__Ends:__ ${warnDate[level-1]}\n`+
                            `-------------------`
                        );
                    })
                    .catch((err) => {
                        util.log(`Failed to do command warning (findOneAndUpdate): ${err}.`, 'DB/warnUser', util.logLevel.FATAL);
                    });
            });
        } catch (e) {
            util.log('Failed to do "warnUser".', 'DB/warnUser', util.logLevel.FATAL);
        }
    },
    'connect': function (callback) {
        MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
            if (err) util.log(err, 'DB/connect', util.logLevel.FATAL);
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
            if (!_.isUndefined(localConfig)) server = localConfig.SERVER;
            server = client.guilds.find(guild => _.isEqual(guild.id, server));
            _.each(channels, function (channel, channelID) {
                channels[channelID] = server.channels.find(ch => _.isEqual(ch.name, channels[channelID]));
            });
            AsheN = client.users.find(user => _.isEqual(user.id, "528957906972835850")); //"105301872818028544"));
            ping_angry_emoji = server.emojis.get("535558794764222476");
            client.user.setActivity("Serving the Den").catch(util.reportToAsheN);
            util.sendTextMessage(channels.main, startUpMessage);
            util.log("INITIALIZED.", "Startup", util.logLevel.INFO);

            fnct.serverStats('users');
            fnct.serverStats('online');
            fnct.serverStats('new');
            fnct.serverStats('bots');
            fnct.serverStats('roles');
            fnct.serverStats('channels');
            fnct.serverStats('age');

            lfpChannels.push(channels["lfp-bestiality"]);
            lfpChannels.push(channels["lfp-extreme"]);
            lfpChannels.push(channels["lfp-female"]);
            lfpChannels.push(channels["lfp-furry"]);
            lfpChannels.push(channels["lfp-futa"]);
            lfpChannels.push(channels["lfp-gay"]);
            lfpChannels.push(channels["lfp-lesbian"]);
            lfpChannels.push(channels["lfp-long"]);
            lfpChannels.push(channels["lfp-male"]);
            lfpChannels.push(channels["lfp-rabbit"]);
            lfpChannels.push(channels["lfp-trans"]);
            lfpChannels.push(channels["lfp-vanilla"]);


            cmd.cn("auto");
            this.testschedule();

        } catch (e) {
            if (!_.isUndefined(localConfig)) console.log(`(${moment().format('MMM DD YYYY - HH:mm:ss.SSS')}) Failed to start up.`);
        }
    },
    'testschedule': function () {
        // Cron-format: second 0-59 optional; minute 0-59; hour 0-23; day of month 1-31; month 1-12; day of week 0-7
        let j = schedule.scheduleJob('*/60 * * * *', function(fireDate){
            cmd.cn("auto");
        });
    }
};

client.on("ready", () => {
    startUpMod.initialize("I'M AWAKE! AWOOO~");
});

client.on("guildMemberAdd", (member) => {
    fnct.serverStats('users');
    fnct.serverStats('online');
    fnct.serverStats('new');
});

client.on("guildMemberRemove", (member) => {
    fnct.serverStats('users');
    fnct.serverStats('online');
    fnct.serverStats('new');
});

client.on("guildUpdate", (oldGuild, newGuild) => {
    fnct.serverStats('users');
    fnct.serverStats('online');
    fnct.serverStats('new');
    fnct.serverStats('bots');
    fnct.serverStats('roles');
    fnct.serverStats('channels');
    fnct.serverStats('age');
});

client.on('messageReactionAdd', (messagereaction, user) => {
    fnct.approveChar(messagereaction.message, messagereaction.emoji, user);
});

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

const image_link_count = (message_string) => {
    return (message_string.toUpperCase().match(/\.PNG|\.JPG|\.JPEG|\.TIFF|\.BMP|\.PPM|\.PGM|\.PBM|\.PNM|\.WEBP|\.SVG|\.GIF/g) || []).length;
}

client.on("message", (message) => {
    if (_.isEqual(message.author.username, client.user.username)) return;
    if (message.author.bot && !((_.isEqual(message.author.id, "159985870458322944") && _.isEqual(message.channel.name, "📈level-up-log")) || (_.isEqual(message.author.id, "155149108183695360") && _.isEqual(message.channel.name, "🚨reports-log")))) return;
    if (!message.channel.guild) return;
    if (lockdown) return;
    
    if (lfpChannels.includes(message.channel)) {
        //warn users who post more than 3 images in an LFP channel
        const number_of_attached_images = message.attachments.filter((embed) => embed.height ? true : false).size;
        if (image_link_count(message.content) + number_of_attached_images > 3) {
            util.sendTextMessage(channels["lfp-contact"], `${message.author}, your Looking For Partner ad in ${message.channel} contains more than 3 images.
Please edit it to comply with the rules as described in ${channels["lfp-info"]}.Thanks! :heart:`);
            util.log(`Warned ${message.author} for sending more than 3 images in LFP ad <${message.url}>`, "lfpInfo", util.logLevel.WARN);
        }
        //warn users who post too fast
        message.channel.fetchMessages({"before": message.id, "limit": 100})
        .then(messages => {
            if (!messages.isEmpty) {
                const previous_message = messages.reduce((m1, m2) => {
                    if (m1.author.id != m2.author.id) {
                        return m1;
                    }
                    return m1.createdTimestamp > m2.createdTimestamp ? m1 : m2;
                }, {"author": message.author, "createdTimestamp": 0});
                if (previous_message.createdTimestamp != 0) {
                    const time_passed_s = ~~((message.createdTimestamp - previous_message.createdTimestamp) / 1000);
                    if (time_passed_s < 60 * 60 * 4) {
                        util.sendTextMessage(channels["lfp-contact"], `${message.author}, your Looking For Partner ad in ${message.channel} was sent too fast (after ${~~(time_passed_s / 3600)} hours and ${~~((time_passed_s % 3600) / 60)} minutes).
Please wait at least 4 hours before sending another ad as described in ${channels["lfp-info"]}. Thanks! :heart:`);
                        util.log(`Warned ${message.author} for sending LFP ads too fast (after ${~~(time_passed_s / 3600)}h ${~~((time_passed_s % 3600) / 60)}m):
Current message: <${message.url}>
Previous message: <${previous_message.url}>`, "lfpInfo", util.logLevel.WARN);
                    }
                }
            }
        })
        .catch(console.error);
    }

    //react with :pingangry: to users who mention someone with the Don't Ping role
    message.mentions.members.find(member => {
        if (member.roles.has(dont_ping_role_id)) {
            message.react(ping_angry_emoji)
                .then(reaction => util.log(`Reacted to ${message.author} <${message.url}> with ${ping_angry_emoji}.`, "Ping role violation", util.logLevel.INFO))
                .catch(error => util.log(`Failed reacting to ${message.author} <${message.url}> with ${ping_angry_emoji}.`, "Ping role violation", util.logLevel.WARN));
            return true;
        }
        return false;
    });
    
    if (message.isMentioned(client.user)) {
        const args = message.content.trim().split(/ +/g).splice(1);
        util.log(message.content, `mentioned by (${message.author})`, util.logLevel.INFO);

        if (disableMentions && !util.isStaff(message)) return;

        if (args.length === 0) {
            util.sendTextMessage(message.channel, `Awoo!`);
        } else {
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
    } else if (_.isEqual(message.channel.name, "📈level-up-log")) {
        let lvlString = "has reached **level ";
        let lvlStringPos = message.content.indexOf(lvlString);
        message.mentions.users.forEach(function (user, id) {
            if (lvlStringPos > 0) {
                let usr = message.guild.members.get(id);
                let level = parseInt(message.content.substr(lvlStringPos + lvlString.length, 2));
                let lvlRoleAdd;
                let lvlRoleRemove;

                if (level === 5) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 5` in the Breeding Den Server and now you're able to join Voice Channels if you want to!" +
                        "\n\n(_P.S. I'm a bot, so please don't reply!_)");
                    lvlRoleAdd = util.roles.LVL_5;
                    lvlRoleRemove = util.roles.LVL_0;
                } else if (level === 10) {
                    lvlRoleAdd = util.roles.LVL_10;
                    lvlRoleRemove = util.roles.LVL_5;
                } else if (level === 20) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 20` in the Breeding Den Server and now you've unlocked the <#560869811157073920> " +
                        "and you're able to create your own cult, as long as certain criterias are met too!" +
                        "For more detailed information, please check out the very top message in <#538901164897337347>" +
                        "\nIf you're interested, simply ask a Staff member and they will guide you through the process!\n\n(_P.S. I'm a bot, so please don't reply!_)");
                    lvlRoleAdd = util.roles.LVL_20;
                    lvlRoleRemove = util.roles.LVL_10;
                } else if (level === 30) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 30` in the Breeding Den Server and now you're able to get yourself a __Custom Role__ if you want to!" +
                        "\nSimply ask a Staff member and tell them the __Name__ and __Color__ (ideally in Hexcode) of the Custom role!\n\n(_P.S. I'm a bot, so please don't reply!_)");
                    lvlRoleAdd = util.roles.LVL_30;
                    lvlRoleRemove = util.roles.LVL_20;
                } else if (level === 40) {
                    lvlRoleAdd = util.roles.LVL_40;
                    lvlRoleRemove = util.roles.LVL_30;
                } else if (level === 50) {
                    lvlRoleAdd = util.roles.LVL_50;
                    lvlRoleRemove = util.roles.LVL_40;
                } else if (level === 60) {
                    lvlRoleAdd = util.roles.LVL_60;
                    lvlRoleRemove = util.roles.LVL_50;
                }

                usr.addRole(server.roles.find(role => _.isEqual(role.name, lvlRoleAdd))).then(() => {
                    message.react('✅').then();
                    if (lvlRoleRemove !== undefined) {
                        try {
                            usr.removeRole(server.roles.find(role => _.isEqual(role.name, lvlRoleRemove))).then();
                        } catch (e) { }
                    }
                });
            }
        });
    }
    else if (_.isEqual(message.channel.name, "🚨reports-log")) {
        if (message.embeds && message.embeds[0].author && message.embeds[0].author.name.indexOf('Mute')) {
            let usr = message.embeds[0].fields[0].value;
            let usrid = usr.match(/([0-9])+/g)[0];
            let userM = message.guild.members.get(usrid);
            if (userM && userM.roles.find(role => _.isEqual(role.name, util.roles.NEW))) {
                util.log(`Attempting to ban Muted Newcomer: ${message.embeds[0].fields[0].value}`, 'Mute check', util.logLevel.INFO);
                let options = {
                    reason: "Violating Automoderator chat rules as a Newcomer",
                    days: 7
                };
                userM.ban(options)
                    .then(() => {
                        util.log(`${userM} banned for: ${options.reason}`, 'Mute check', util.logLevel.INFO);
                        util.sendTextMessage(channels.warnings,
                            `${userM} banned for: ${options.reason}\n`
                        );
                    })
                    .catch(util.log(`${userM} failed to kick.`, 'Mute check', util.logLevel.WARN));
            }
        }
    }
    // Prefix as first character -> command
    else if (_.isEqual(message.content.indexOf(prefix), 0)) {
        cmd.call(message);
    } else if (!_.isEqual(message.channel.lastMessage.author, client.user)) {
        _.each(lfpChannels, (channel) => {
            if (!_.isNull(channel) && _.isEqual(message.channel.name, channel.name)) {
                if (!_.isUndefined(lfpTimer[channel.name])) {
                    clearTimeout(lfpTimer[channel.name]);
                }
                lfpTimer[channel.name] = setTimeout(() => {
                    util.log('Sending lfp info in ' + channel, "lfpInfo", util.logLevel.INFO);

                    channel.fetchMessages()
                        .then(messages => {
                            let msg = messages.filter(m => _.isEqual(m.author.id, client.user.id));
                            if (msg.size > 0) {
                                msg.first().delete()
                                    .then(util.log('Deleted last Accalia message in ' + channel, "lfpInfo", util.logLevel.INFO))
                                    .catch(util.log('Failed to delete last Accalia message ' + channel, "lfpInfo", util.logLevel.WARN));
                            }
                        });

                    let title, color, target;

                    switch (channel.name.substr(6).split(/-/g)[0]) {
                        case "male":
                            title = "MALES";
                            color = server.roles.find(role => _.isEqual(role.name, "Male")).color;
                            target = "Males, Femboys, etc.";
                            break;
                        case "female":
                            title = "FEMALES";
                            color = server.roles.find(role => _.isEqual(role.name, "Female")).color;
                            target = "Females, Tomboys, etc.";
                            break;
                        case "vanilla":
                            title = "VANILLA RP";
                            color = server.roles.find(role => _.isEqual(role.name, "Vanilla")).color;
                            target = "People with Vanilla Kinks and the \"Vanilla\" role";
                            break;
                        case "gay":
                            title = "GAY (Male x Male) RP";
                            color = server.roles.find(role => _.isEqual(role.name, "Gay")).color;
                            target = "Males with the \"Gay\" and/or \"Bi/Pansexual\" role";
                            break;
                        case "lesbian":
                            title = "LESBIAN (Female x Female) RP";
                            color = server.roles.find(role => _.isEqual(role.name, "Lesbian")).color;
                            target = "Females with the \"Lesbian\" and/or \"Bi/Pansexual\" role";
                            break;
                        case "trans":
                            title = "TRANS";
                            color = server.roles.find(role => _.isEqual(role.name, "MtF")).color;
                            target = "People with the MtF and FtM roles";
                            break;
                        case "futa":
                            title = "FUTANARI / HERMAPHRODITE";
                            color = server.roles.find(role => _.isEqual(role.name, "Futa")).color;
                            target = "Futanari and Hermaphrodites (not trans)";
                            break;
                        case "furry":
                            title = "FURRY / ANTHRO";
                            color = server.roles.find(role => _.isEqual(role.name, "Furry")).color;
                            target = "Furries and Anthromorphs (not beasts/bestiality rp)";
                            break;
                        case "bestiality":
                            title = "BESTIALITY RP";
                            color = server.roles.find(role => _.isEqual(role.name, "Beast")).color;
                            target = "Beasts, people interested in Bestiality RP (not furries)";
                            break;
                        case "xtreme":
                            title = "EXTREME KINKS RP";
                            color = server.roles.find(role => _.isEqual(role.name, "Extreme")).color;
                            target = "People with Extreme Kinks and the \"Extreme\" role";
                            break;
                        case "long":
                            title = "LONG TERM / PLOT DRIVEN RP";
                            color = 0x00FFCA;
                            target = "People who would like a long term and/or plot driven RP";
                            break;
                        case "vc":
                            title = "VOICE CHATS / RABBIT / ETC.";
                            color = 0xA8A8A8;
                            target = "People wanting to find others to go in a Voice Chat or Rabbit session or etc. with";
                            break;
                    }

                    let lfpEmbed = new DiscordJS.RichEmbed()
                        .setColor(color)
                        .setTitle("Looking for " + title + " Channel Info")
                        .setDescription(
                            "This channel is specifically for posts, which are **looking for " + title + "**.\n\n" +
                            "If you do see posts, which are __not clearly looking for these kinds of RP/things__ in this channel, **please** let the staff team know in " + channels.reports + "!\n\n" +
                            "If you want to **contact** someone who posted in this channel, **please check their DM Roles** first before doing so and please use " + channels["lfp-contact"] + "!\n\n" +
                            "*More info in:* " + channels["lfp-info"]
                        )
                        .addField(
                            "What posts are to be expected and to be posted in this channel?",
                            "LFP Ads, which explicitly state that they are __looking for " + title + "__"
                        )
                        .addField(
                            "Target Audience for LFP posts:",
                            target
                        )
                    ;

                    channel.send(lfpEmbed);
                }, 2000);
            }
        });

    }
});

const cmd = {
    'ping': async function (message) {
        try {
            const m = await message.channel.send("Ping!");
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
            util.log('used command: ping', "ping", util.logLevel.INFO);
        } catch (e) {
            util.log('Failed to process command (ping)', 'ping', util.logLevel.ERROR);
        }
    },
    'staff': async function (message) {
        try {
            const m = await message.channel.send("Checking!");
            let isStaff = util.isStaff(message);
            m.edit(`${message.author} is${(!isStaff) ? ' not' : '' } a staff member!`);
            util.log('used command: staff', "staff", util.logLevel.INFO);
        } catch (e) {
            util.log('Failed to process command (staff)', 'staff', util.logLevel.ERROR);
        }
    },
    'warn': async function (message, args) {
        try {
            if (!util.isStaff(message)) {
                util.sendTextMessage(message.channel, `${message.author} Shoo! You don't have the permissions for that!`);
                return;
            }
            let member = message.mentions.members.first() || message.guild.members.get(args[0]);
            if (!member)
                return util.sendTextMessage(message.channel, `Please mention a valid member of this server! REEEEEEE`);
            if (member.roles.find(role => _.isEqual(role.name, 'Staff')))
                return util.sendTextMessage(message.channel, `I cannot warn ${member.user.username}... :thinking:`);
            if (!server.roles.find(role => _.isEqual(role.name, util.roles.WARN_1)))
                return util.sendTextMessage(message.channel, `I can't find the role for '${util.roles.WARN_1}' ... :thinking:`);
            if (!server.roles.find(role => _.isEqual(role.name, util.roles.WARN_2)))
                return util.sendTextMessage(message.channel, `I can't find the role for '${util.roles.WARN_2}' ... :thinking:`);

            let innocentRole = server.roles.find(role => _.isEqual(role.name, util.roles.INNOCENT));
            let warnRole1 = server.roles.find(role => _.isEqual(role.name, util.roles.WARN_1));
            let warnRole2 = server.roles.find(role => _.isEqual(role.name, util.roles.WARN_2));
            let hasWarn1 = member.roles.find(role => _.isEqual(role.name, util.roles.WARN_1));
            let hasWarn2 = member.roles.find(role => _.isEqual(role.name, util.roles.WARN_2));
            let level;
            let reason = message.content.substring(message.content.indexOf(args[0]) + args[0].length + 1);
            let err = false;

            // Warn functionality
            if (hasWarn2) {
                level = 3;
            } else if (hasWarn1) {
                await member.addRole(warnRole2)
                    .then(() => {
                        member.removeRole(warnRole1)
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
            } else {
                await member.addRole(warnRole1)
                    .then(() => {
                        member.removeRole(innocentRole) 
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

            if (err) return;

            await dbMod.warnUser(member, level, message.author, reason);
            message.delete();
        } catch (e) {
            util.log('Failed to process command (warn)', 'warn', util.logLevel.ERROR);
        }
    },
    'stopmention': function (message) {
        if (util.isStaff(message)) {
            disableMentions = true;
            util.sendTextMessage(message.channel, 'No longer listening to non-staff mentions... :(');
            util.log('Disabling responses to non-staff mentions ...', 'disable mentions', util.logLevel.INFO);
        }
    },
    'startmention': function (message) {
        if (util.isStaff(message)) {
            disableMentions = false;
            util.sendTextMessage(message.channel, 'Start listening to non-staff mentions... :3');
            util.log('Enabling responses to non-staff mentions', 'enable mentions', util.logLevel.INFO);
        }
    },
    'quit': function (message) {
        if (message.author === AsheN) {
            lockdown = true;
            util.log('Locking down...', 'quit', util.logLevel.FATAL);
        }
    },
    'cn': function (message) {
        return;
        if (_.isEqual(message, "auto") || util.isStaff(message)) {
            let successCount = 0;
            let kickCount = 0;
            let errorCount = 0;
            let newcomerRole = server.roles.find(role => role.name === "Newcomer");
            let newcomerMembers = server.roles.get(newcomerRole.id).members.map(m => m.user);
            _.each(newcomerMembers, (member, index) => {
            util.log(" Clearing newcomer role from: " + member + " (" + (index+1) + "/" + newcomerMembers.length + ")", "clearNewcomer", util.logLevel.INFO);
                try {
                    server.member(member).removeRole(newcomerRole)
                        .then((guildMember) => {
                            if (_.isNull(guildMember.roles.find(role => role.name === "NSFW")) && ((new Date() - guildMember.joinedAt)/1000/60 > 10)) { // joined more than 10 minutes ago
                                let reason = guildMember + " kicked from not having NSFW role for a longer period of time.";
                                guildMember.kick(reason)
                                    .then(util.log(reason, 'clearNewcomer', util.logLevel.INFO))
                                    .catch(util.log("Failed to kick inactive member: " + guildMember, 'clearNewcomer', util.logLevel.WARN));
                                kickCount++;
                            } else {
                                successCount++;
                            }
                            if (index+1 === newcomerMembers.length) {
                                let logText = successCount + '/' + (successCount + errorCount) + " users cleared of Newcomer role. " + kickCount + " users kicked from not having the NSFW role until now.";
                                util.log(logText, 'clearNewcomer', util.logLevel.INFO);
                                util.sendTextMessage(channels.main, logText);
                            }
                        });
                } catch (e) {
                    errorCount++;
                    util.log("Couldn't remove Newcomer from: " + member + "\n" + e, 'clearNewcomer', util.logLevel.ERROR);
                    if (index+1 === newcomerMembers.length) {
                        let logText = successCount + '/' + (successCount + errorCount) + " users cleared of Newcomer role. " + kickCount + " users kicked from not having the NSFW role until now.";
                        util.log(logText, 'clearNewcomer', util.logLevel.INFO);
                        message.channel.send(logText);
                    }
                }
            });
            if (newcomerMembers.length === 0) {
                message.channel.send("0" + " Newcomers found.");
            }
        }
    },
    'ancient': function(message) {
        return;
        if (util.isStaff(message)) {
            let ancientTimeThreshold = new Date(server.createdTimestamp + (new Date() - server.createdTimestamp) / 5);
            util.sendTextMessage(message.channel, `Threshold for "Ancient Member" is at: ${ancientTimeThreshold.toString()}`);

            let ancientMembers = server.members.filter(m => {
                return (m.joinedTimestamp <= ancientTimeThreshold) && (!m.user.bot) && _.isNull(m.roles.find(r => _.isEqual(r.name, util.roles.ANCIENT)));
            });

            ancientMembers.forEach(member => {
                member.addRole(server.roles.find(role => _.isEqual(role.name, util.roles.ANCIENT))).then();
                console.log(member.user.username + ", last message: " + (!_.isNull(member.lastMessage) ? member.lastMessage.createdAt : " too old"));
            });
        } else {
            util.sendTextMessage(message.channel, "Shoo! You don't have permissions for that!");
        }
    },
    'call': async function (message) {
        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();
        try {
            if (_.isEqual(command, "call")) return;
            if (_.isUndefined(this[command])) return;
            await this[command](message, args);
            util.log(message.author.username + ' is calling command: ' + command, command, util.logLevel.INFO);
        } catch (e) {
            util.log(`Failed to process (${command})`, command, util.logLevel.ERROR);
        }
    },
};

const fnct = {
    'serverStats': function (mode) {
        try {
            let channel = "";
            let str = "";
            switch (mode) {
                case 'users':
                    channel = "582321301142896652";
                    str = "📊User Count: " + server.members.filter(member => !member.user.bot).size;
                    break;
                case 'online':
                    channel = "582321302837133313";
                    str = "📊Online users: " + server.members.filter(member => !member.user.bot && !_.isEqual(member.user.presence.status, "offline")).size;
                    break;
                case 'new':
                    channel = "582309343274205209";
                    str = "📈New users: " + server.members.filter(member => !member.user.bot && ((new Date() - member.joinedAt) / 1000 / 60 / 60 / 24) <= 1).size;
                    break;
                case 'bots':
                    channel = "582309344608124941";
                    str = "🤖Bot Count: " + server.members.filter(member => member.user.bot).size;
                    break;
                case 'roles':
                    channel = "606773795142893568";
                    str = "🎲Roles: " + server.roles.size;
                    break;
                case 'channels':
                    channel = "606773807306506240";
                    str = "📇Channels: " + server.channels.size;
                    break;
                case 'age':
                    channel = "606773822284365874";
                    let age = Math.floor((new Date() - server.createdAt) / 1000 / 60 / 60 / 24);
                    let ageDays = age % 365;
                    let ageDstr = `${ageDays > 0 ? ageDays + (ageDays > 1 ? ' days' : ' day') : '0 days'}`;
                    let ageYears = Math.floor(age / 365);
                    let ageYstr = `${ageYears > 0 ? ageYears + (ageYears > 1 ? ' years ' : ' year ') : ''}`;
                    str = `📅Age: ${ageYstr} ${ageDstr}`;
                    break;
                default:
                    break;
            }
            server.channels.find(ch => _.isEqual(ch.id, channel)).setName(str).then(() => {
                util.log('Successfully updated server stats! (' + mode + ')', 'Server Stats', util.logLevel.INFO);
            });
        } catch (e) {
            util.log('Failed to update server stats: ' + mode, 'Server Stats', util.logLevel.ERROR);
        }
    }, 
    'approveChar': function(message, reaction, user) {
        try {
            if (_.isEqual(message.channel.name, channels.charSub.name) && util.isUserStaff(user)) {
                let msgType = _.isEqual(reaction.name, "⭐") ? 1 : _.isEqual(reaction.name, "✅") ? 2 : 0;
                if (msgType === 0) {
                    return;
                }
                let msgAttachments = message.attachments.map(a => a.url);
                let msgImagesString = "";
                _.each(msgAttachments, imgUrl => msgImagesString += imgUrl + "\n");
                util.log(`${user} approved character message:\n ${message.content}\n ${msgImagesString}`, "approveCharacter", util.logLevel.INFO);
                let msgContent = `User: ${message.author}\n${message.content}`;
                channels.charArchive.send(msgType === 1 ? msgContent : message.content, { files: msgAttachments })
                    .then(msg => {
                        if (msgType === 1) {
                            channels.charIndex.send(`\`${message.author} Your character has been approved/updated and can be found in the index under \"\"\``);
                        }
                        channels.charIndex.send(`\`r!addchar \"charName\"\n${message.content}\n${msgImagesString}\``);
                    });
            }
        } catch (e) {
            util.log(e, 'approveCharacter', util.logLevel.ERROR);
        } 
    } 
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
        return message.author.lastMessage.member.roles.find(role => _.isEqual(role.name, this.roles.STAFF) || _.isEqual(role.name, this.roles.TRIALMOD)) || message.author === AsheN;
    },

    'isUserStaff': function (user) {
        let staffRole = server.roles.find(role => role.name === util.roles.STAFF || role.name === util.roles.TRIALMOD);
        return server.roles.get(staffRole.id).members.map(m => m.user).filter(staffMember => _.isEqual(staffMember, user)).length > 0;
    }, 

    'roles': {
        'STAFF': "Staff",
        'TRIALMOD': "Trial-Moderator",
        'ANCIENT': "💠Ancient Member",
        'NEW': "Newcomer",
        'NSFW': "NSFW",
        'MUTED': "Muted",
        'INNOCENT': "Innocent", 
        'WARN_1': "Warned 1x",
        'WARN_2': "Warned 2x",
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

    'reportToAsheN': function (errMsg) {
        try {
            AsheN.send(errMsg);
        } catch (e) {
            if (!_.isUndefined(localConfig)) console.log("(" + moment().format('MMM DD YYYY - HH:mm:ss.SSS') + ") Failed to start up.");
        }
    },

    'log': function (message, moduleName, level) {
        if (_.isUndefined(channels.logs)) return;
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

        if (_.isEqual(level, this.logLevel.FATAL)) this.reportToAsheN(message);
        // channels.logs.send(logMessage);
        let logEmbed = new DiscordJS.RichEmbed()
            .setAuthor(level)
            .setColor(embedColor)
            .setDescription(message)
            .setFooter(moduleName)
            .setTimestamp(new Date());
        channels.logs.send(logEmbed);

        if (_.isUndefined(localConfig)) return;
        console.log(logMessage);
    },

    'logLevel': {
        'INFO':  "INFO",
        'WARN':  "WARN",
        'ERROR': "**ERROR**",
        'FATAL': "__**FATAL**__",
    }
};

client.login(_.isUndefined(localConfig) ? process.env.BOT_TOKEN : localConfig.TOKEN);
