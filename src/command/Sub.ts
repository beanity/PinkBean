import { Time as TimeEntity, News as NewsEntity } from "../db/entity";
import { Color, Discord } from "../lib";
import { DiscordData, Command, CommandExample, Option } from "./base";
import { getRepository } from "typeorm";

export class Sub extends Command {
  private timer: Option;
  constructor() {
    super("sub", Color.PINK, true);
    this.timer = new Option("-t", "subscribe to time");
    this.addCustomOptions(this.timer);
    this.enableCooldown(2000);
  }

  public description() {
    return "Subscribe news or time periodically in a channel. Subscribe to news by default.";
  }

  public briefDescription() {
    return "Toggle news or time subscription";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: `${this.fullName}`,
        explain: "subscribe to news",
      },
      {
        cmd: `${this.fullName} ${this.timer}`,
        explain: "subscribe to time",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const channel = discord.channel;
    if (!(channel instanceof Discord.TextChannel)) return;
    if (this.timer.enabled) {
      await this.handleTime(discord, channel);
      return;
    }
    await this.subNews(discord, channel);
  }

  private async subNews(discord: DiscordData, channel: Discord.TextChannel) {
    const repo = getRepository(NewsEntity);
    const existing = await repo.findOne(discord.guild.id);
    let shouldSub = false;
    if (existing?.channel === channel.id) {
      await repo.delete(existing);
    } else {
      const news = new NewsEntity();
      news.id = discord.guild.id;
      news.channel = channel.id;
      await repo.save(news);
      shouldSub = true;
    }
    channel
      .send(this.subEmbed(shouldSub, "news", channel))
      .catch(console.error);
  }

  private async handleTime(discord: DiscordData, channel: Discord.TextChannel) {
    const repo = getRepository(TimeEntity);
    const existing = await repo.findOne(discord.guild.id);
    let shouldSub = false;
    if (existing?.channel === channel.id) {
      await repo.delete(existing);
    } else {
      if (existing?.message) {
        await this.deletePreviousMsg(
          discord.client,
          existing.channel,
          existing.message
        );
        existing.message = void 0;
      }
      const time = new TimeEntity();
      time.id = discord.guild.id;
      time.channel = channel.id;
      await repo.save(time);
      shouldSub = true;
    }
    channel
      .send(this.subEmbed(shouldSub, "time", channel))
      .catch(console.error);
  }

  private async deletePreviousMsg(
    client: Discord.Client,
    channelId: string,
    messageId: string
  ) {
    const channel = await client.channels.fetch(channelId);
    if (channel instanceof Discord.TextChannel) {
      const msg = await channel.messages.fetch(messageId);
      msg.delete({ timeout: 60000 }).catch(console.error);
    }
  }

  private subEmbed(
    shouldSub: boolean,
    topic: string,
    channel: Discord.Channel
  ) {
    const sub = shouldSub ? "Subcribed to" : "Unsubscribed to";
    return this.embed().setDescription(`${sub} ${topic} in ${channel}`);
  }
}
