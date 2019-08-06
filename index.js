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
};
let AsheN;
let lockdown = false;
let disableMentions = true;


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

            return;
            this.testschedule();

        } catch (e) {
            if (!_.isUndefined(localConfig)) console.log(`(${moment().format('MMM DD YYYY - HH:mm:ss.SSS')}) Failed to start up.`);
        }
    },
    'testschedule': function () {
        let j = schedule.scheduleJob('* * * * *', function(fireDate){
            console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
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

client.on("message", (message) => {
    if (_.isEqual(message.author.username, client.user.username)) return;
    if (message.author.bot && !(_.isEqual(message.author.id, "159985870458322944") && _.isEqual(message.channel.name, "📈level-up-log"))) return;
    if (!message.channel.guild) return;
    if (lockdown) return;

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

    // Prefix as first character -> command
     else if (_.isEqual(message.content.indexOf(prefix), 0)) {
        cmd.call(message);
        return;
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
                    .then(() => { level = 1 })
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
                    str = "📅Age: " + Math.floor((new Date() - server.createdAt) / 1000 / 60 / 60 / 24) + " days";
                    break;
                default:
                    break;
            }
            server.channels.find(ch => _.isEqual(ch.id, channel)).setName(str).then(() => {
                util.log('Successfully updated server stats! (' + mode + ')', 'Server Stats', this.logLevel.INFO);
            });
        } catch (e) {
            util.log('Failed to update server stats: ' + mode, 'Server Stats', this.logLevel.ERROR);
        }
    }, 
    'approveChar': function(message, reaction, user) {
        util.log(reaction.name, `debug`, util.logLevel.INFO);
        if (_.isEqual(message.channel.name, "📃character-submission") && _.isEqual(reaction.name, ":white_check_mark:") && _.isEqual(user, AsheN)) {
            util.log(message.channel + reaction.name + user, `debug`, util.logLevel.INFO);
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
        return message.author.lastMessage.member.roles.find(role => _.isEqual(role.name, this.roles.STAFF)) || message.author === AsheN;
    },

    'roles': {
        'STAFF': "Staff",
        'NSFW': "NSFW",
        'MUTED': "Muted",
        'WARN_1': "Warned 1x",
        'WARN_2': "Warned 2x",
        'LVL_0': "Lewd (Lvl 0+)",
        'LVL_5': "Pervert (Lvl 5+)",
        'LVL_10': "Tainted (Lvl 10+)",
        'LVL_20': "Slut (Lvl 20+)",
        'LVL_30': "Whore (Lvl 30+)",
        'LVL_40': "Cumdump (Lvl 40+)",
        'LVL_50': "Pormstar (Lvl 50+)",
        'LVL_60': "Sex-Toy (Lvl 60+)",
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
        let logMessage = level + " | " + moment().format('MMM DD YYYY - HH:mm:ss.SSS') + " | " + moduleName + ": " + message;

        if (_.isEqual(level, this.logLevel.FATAL)) this.reportToAsheN(message);
        channels.logs.send(logMessage);

        if (_.isUndefined(localConfig)) return;
        console.log(logMessage);
    },

    'logLevel': {
        'INFO':  "INFO ",
        'WARN':  "WARN ",
        'ERROR': "**ERROR**",
        'FATAL': "__**FATAL**__",
    }
};

client.login(_.isUndefined(localConfig) ? process.env.BOT_TOKEN : localConfig.TOKEN);
