import { Time as TimeEntity, News as NewsEntity } from "../db/entity";
import { Color, Md, Discord } from "../lib";
import { dbCache } from "../manager";
import { DiscordData, Command, CommandExample, Option } from "./base";
import { getRepository } from "typeorm";

export class Sub extends Command {
  private timer: Option;
  constructor() {
    super("sub", Color.MAPLE);
    this.timer = new Option("-t", "subscribe to time");
    this.addCustomOptions(this.timer);
    this.enableCooldown(2000);
  }

  public description() {
    return "Receive news or time periodically in a channel (requires admin). By default, subscribe to news.";
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
    await this.handleNews(discord, channel);
  }

  private async handleNews(discord: DiscordData, channel: Discord.TextChannel) {
    const existing = dbCache.news.get(discord.guild.id);
    let shouldSub = true;
    if (existing && existing.channel === channel.id) {
      await getRepository(NewsEntity).delete(existing);
      dbCache.news.delete(existing);
      shouldSub = false;
    } else {
      const news = new NewsEntity();
      news.id = discord.guild.id;
      news.channel = channel.id;
      await getRepository(NewsEntity).save(news);
      dbCache.news.set(news);
    }
    channel
      .send(this.subEmbed(shouldSub, "news", channel.name))
      .catch(console.error);
  }

  private async handleTime(discord: DiscordData, channel: Discord.TextChannel) {
    const existing = dbCache.time.get(discord.guild.id);
    let shouldSub = true;
    if (existing && existing.channel === channel.id) {
      await getRepository(TimeEntity).delete(existing);
      dbCache.time.delete(existing);
      shouldSub = false;
    } else {
      if (existing && existing.message) {
        await this.deletePrevious(
          discord.client,
          existing.channel,
          existing.message
        );
        existing.message = void 0;
      }
      const time = new TimeEntity();
      time.id = discord.guild.id;
      time.channel = channel.id;
      await getRepository(TimeEntity).save(time);
      dbCache.time.set(time);
    }
    channel
      .send(this.subEmbed(shouldSub, "time", channel.name))
      .catch(console.error);
  }

  private async deletePrevious(
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

  private subEmbed(shouldSub: boolean, topic: string, channel: string) {
    const sub = shouldSub ? "Subcribed to" : "Unsubscribed to";
    return this.embed().setDescription(
      `${sub} ${topic} in ${Md.bld("#" + channel)}`
    );
  }
}
