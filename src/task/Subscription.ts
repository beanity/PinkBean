import { Time, News, NewsPost } from "../command";
import { _, Discord, async, env } from "../lib";
import { Permission } from "../util";
import * as Entity from "../db/entity";
import { getRepository, In } from "typeorm";
import io = require("socket.io-client");
import { Task } from "./Task";

export class Subscription extends Task {
  constructor(client: Discord.Client) {
    super(client);
  }

  public add() {
    const server = env.server;
    const socket = io.connect(server);
    socket.on("timer", () => this.notifyTime().catch(console.error));
    socket.on("news", (posts: NewsPost[]) => {
      this.notifyNews(posts).catch(console.error);
    });
  }

  private async notifyTime() {
    if (!this.bot) return;
    const repo = getRepository(Entity.Time);
    const guilds = await repo.find({
      where: { id: In(this.client.guilds.cache.keyArray()) },
    });
    const mapped = (
      await async.mapLimit(guilds, 5, async (guild) =>
        this.sendOrUpdateTime(guild).catch(console.error)
      )
    ).filter((v) => v) as Entity.Time[];
    await repo.save(mapped);
  }

  private async sendOrUpdateTime(timeSub: Entity.Time) {
    if (!this.bot) return;

    const channel = await this.client.channels.fetch(timeSub.channel);

    if (
      !(channel instanceof Discord.TextChannel) ||
      !channel.permissionsFor(this.bot)?.has(Permission.SEND_MESSAGE)
    )
      return;

    const embed = new Time().timeEmbed();

    if (!timeSub.message) {
      timeSub.message = (await channel.send(embed)).id;
      return timeSub;
    }

    let msg: Discord.Message | undefined;

    try {
      msg = await channel.messages.fetch(timeSub.message);
    } catch (e) {
      console.error(e);
    }

    if (msg) {
      await msg.edit(embed);
    } else {
      timeSub.message = (await channel.send(embed)).id;
      return timeSub;
    }
  }

  private async notifyNews(posts: NewsPost[]) {
    if (!this.bot) return;
    if (_.isEmpty(posts)) return;

    const repo = getRepository(Entity.News);
    const guilds = await repo.find({
      where: { id: In(this.client.guilds.cache.keyArray()) },
    });
    await async.eachLimit(guilds, 5, async (guild) =>
      this.sendNews(posts, guild).catch(console.error)
    );
  }

  private async sendNews(posts: NewsPost[], guild: Entity.News) {
    if (!this.bot) return;
    const channel = await this.client.channels.fetch(guild.channel);
    if (
      !(channel instanceof Discord.TextChannel) ||
      !channel.permissionsFor(this.bot)?.has(Permission.SEND_MESSAGE)
    )
      return;
    for (const post of posts) {
      await channel.send(new News().newsEmbed(post));
    }
  }
}
