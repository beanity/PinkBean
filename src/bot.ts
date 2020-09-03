import { CommandExecutionParam, DiscordData } from "./command/base";
import { EntityManager, commander, dbCache, guildMaster } from "./manager";
import { env, Discord } from "./lib";
import { Prefix } from "./model";
import { subscribe } from "./module";
import { createConnection, getRepository } from "typeorm";
import { Prefix as PrefixEntity, Time as TimeEntity, News } from "./db/entity";

process.on("unhandledRejection", console.error);

const client = new Discord.Client();

subscribe(client);
main().catch(console.error);

async function main() {
  await setup();
  client.on("ready", () => {
    console.log(`Logged in as ${client.user && client.user.username}!`);
  });
  client.on("message", processMessage);
  client.login(env.discord).catch(console.error);
}

async function setup() {
  await createConnection();
  await cacheData();
}

async function cacheData() {
  dbCache.time = new EntityManager(await getRepository(TimeEntity).find());
  dbCache.news = new EntityManager(await getRepository(News).find());
  dbCache.prefix = new EntityManager(await getRepository(PrefixEntity).find());
}

async function retrievePrefix(guildId: string) {
  const prefixEntity = await getRepository(PrefixEntity).findOne(guildId);
  const prefix = new Prefix(guildId);
  if (prefixEntity) {
    prefix.content = prefixEntity.content;
    prefix.space = prefixEntity.space;
  }
  return prefix;
}

async function processMessage(message: Discord.Message) {
  if (
    !client.user ||
    !message.guild ||
    !message.guild.available ||
    !message.guild.me ||
    !message.member ||
    message.author.bot
  ) {
    return;
  }

  const discord: DiscordData = {
    client: client,
    clientUser: client.user,
    message: message,
    channel: message.channel,
    bot: message.guild.me,
    member: message.member,
    user: message.member.user,
    guild: message.guild,
  };

  if (
    !discord.bot
      .permissionsIn(message.channel)
      .has(["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"])
  ) {
    return;
  }

  let prefix: Prefix;
  const guildId = message.guild.id;

  if (guildMaster.has(guildId)) {
    prefix = guildMaster.get(guildId).prefix;
  } else {
    try {
      prefix = await retrievePrefix(guildId);
    } catch (e) {
      console.log("unable to retrieve prefix from database");
      console.error(e);
      return;
    }
    guildMaster.set(guildId, prefix);
  }

  if (!message.content.startsWith(prefix.toString())) return;

  const inputs = message.content.slice(prefix.length).trim().split(/\s+/);
  const invokedName = inputs.shift() || "";
  const command = commander.buildCommand(invokedName);

  if (!command) return;

  const params: CommandExecutionParam = {
    inputs,
    discord,
    invokedName,
  };

  command.execute(params).catch(console.error);
}
