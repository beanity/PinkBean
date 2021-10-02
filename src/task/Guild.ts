import { guildMaster } from "../manager";
import { Help } from "../command";
import { Color, Discord, Md, async, env } from "../lib";
import * as Entity from "../db/entity";
import { getRepository } from "typeorm";
import { Task } from "./Task";
import { EmbedFieldData } from "discord.js";

export class Guild extends Task {
  private channels: Discord.TextChannel[];

  constructor(client: Discord.Client) {
    super(client);
    this.channels = [];
  }

  public add() {
    this.client.on("ready", () => {
      this.client.user?.setActivity(`${new Help().fullName}`, {
        type: "PLAYING",
      });
      this.fetchChannels().catch(console.error);
    });

    this.client.on("guildCreate", (guild) => {
      this.sendGreeting(guild).catch(console.error);
      async
        .eachLimit(this.channels, 5, async (channel) =>
          channel.send({ embeds: [this.buildEmbed(guild, true)] }).catch(console.error)
        )
        .catch(console.error);
    });

    this.client.on("guildDelete", async (guild) => {
      try {
        await this.deleteRecords(guild);
        await async.eachLimit(this.channels, 5, async (channel) =>
          channel.send({ embeds: [this.buildEmbed(guild, false)] }).catch(console.error)
        );
      } catch (e) {
        console.error(e);
      }
    });
  }

  private async fetchChannels() {
    const settled = await Promise.allSettled(
      env.discord.guildLogs.map((id) => this.client.channels.fetch(id))
    );
    const channels = settled
      .map((v) => v.status === "fulfilled" && v.value)
      .filter(
        (v) => v && v instanceof Discord.TextChannel
      ) as Discord.TextChannel[];
    this.channels = channels;
  }

  private async deleteRecords(guild: Discord.Guild) {
    guildMaster.delete(guild.id);
    await getRepository(Entity.Prefix).delete(guild.id);
  }

  private async sendGreeting(guild: Discord.Guild) {
    let channel = guild.systemChannel || void 0;
    if (!channel) {
      channel = guild.channels.cache.find(
        (channel) => channel.type === "GUILD_TEXT" && !channel.deleted
      ) as Discord.TextChannel | undefined;
    }

    if (!channel) return;

    const quotes = [
      `I am here, mortals.`,
      "Beep Boop :robot:",
      "~ Meow ~",
      ":zap: Pika Pika! :zap:",
      "Gotta Catch 'Em All!",
      "Finally I've come. Humans.",
      "You require my assistance?",
      "It's about time.",
      "Ah, at last.",
      "Hey.",
      "Hi.",
      "Hello.",
      "Ho Ho Ho.",
      "Yo Yo Yo.",
      "Greetings.",
      "Oops, forgot to bring the pizza.",
      ":ok:",
    ];

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    const embed = new Discord.MessageEmbed();
    embed.setColor(Color.BLUE);
    embed.setTitle(randomQuote);
    embed.setDescription(
      `I am a MapleStory bot. Start by typing ${Md.pre(
        new Help().fullName
      )} to see the list of commands. Click ${Md.nl(
        "here",
        "https://discord.gg/wBUKQhN"
      )} for support.`
    );

    await channel.send({ embeds: [embed] });
  }

  private buildEmbed(guild: Discord.Guild, isCreate: boolean) {
    let title = "Guild";
    let color: number;
    if (isCreate) {
      title += " Create";
      color = Color.GREEN;
    } else {
      title += " Delete";
      color = Color.RED;
    }
    const embed = new Discord.MessageEmbed();
    embed.setColor(color);
    embed.setTitle(title);
    embed.addFields([
      {
        name: "ID",
        value: guild.id,
        inline: true,
      },
      {
        name: "Name",
        value: guild.name,
        inline: true,
      },
      {
        name: "Member Count",
        value: guild.memberCount.toString(),
        inline: true,
      },
    ]);
    return embed;
  }
}
