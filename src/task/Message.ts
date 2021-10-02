import { SetParam, commander, guildMaster } from "../manager";
import { DiscordData } from "../command/base";
import { Prefix as PrefixEntity } from "../db/entity";
import { Discord } from "../lib";
import { Prefix } from "../model";
import { getRepository } from "typeorm";
import { Task } from "./Task";
import { Permissions } from "discord.js";

export class Message extends Task {
  constructor(client: Discord.Client) {
    super(client);
  }

  public add() {
    this.client.on("message", (message) =>
      this.process(message).catch(console.error)
    );
  }

  private async process(message: Discord.Message) {
    if (
      !this.client.user ||
      !message.guild ||
      !message.guild.available ||
      !message.guild.me ||
      !message.member ||
      message.author.bot
    ) {
      return;
    }

    const discordData: DiscordData = {
      client: this.client,
      clientUser: this.client.user,
      message: message,
      channel: message.channel,
      bot: message.guild.me,
      member: message.member,
      user: message.member.user,
      guild: message.guild,
    };

    if ("permissionsFor" in discordData.channel) {
      if (
        !discordData.channel
          .permissionsFor(discordData.bot)
          .has([
            Permissions.FLAGS.VIEW_CHANNEL,
            Permissions.FLAGS.SEND_MESSAGES,
            Permissions.FLAGS.EMBED_LINKS,
          ])
      ) {
        return;
      }
    }

    const guildId = message.guild.id;

    if (!guildMaster.has(guildId)) {
      await this.setData(guildId);
    }

    const prefix = guildMaster.get(guildId).prefix;

    if (!message.content.startsWith(prefix.toString())) return;

    const inputs = message.content.slice(prefix.length).trim().split(/\s+/);
    const invokedName = inputs.shift() || "";
    const command = commander.buildCommand(invokedName);

    if (!command) return;

    command
      .execute({ inputs, discord: discordData, invokedName })
      .catch(console.error);
  }

  private async setData(guildId: string) {
    const guildData: SetParam = {};
    guildData.prefix = await this.getPrefix(guildId);
    guildMaster.set(guildId, guildData);
  }

  private async getPrefix(guildId: string) {
    const prefixEntity = await getRepository(PrefixEntity).findOne(guildId);
    const prefix = new Prefix();
    if (prefixEntity) {
      prefix.content = prefixEntity.content;
      prefix.space = prefixEntity.space;
    }
    return prefix;
  }
}
