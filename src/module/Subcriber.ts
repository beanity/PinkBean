import { Time, News, NewsPost } from "../command";
import { Discord, async, env } from "../lib";
import { dbCache } from "../manager";
import { Permission } from "../util";
import { Time as TimeEntity, News as NewsEntity } from "../db/entity";
import { getRepository } from "typeorm";
import io = require("socket.io-client");

const socket = io.connect(env.server);

class Subscriber {
  public readonly client: Discord.Client;

  get bot() {
    return this.client.user;
  }

  constructor(client: Discord.Client) {
    this.client = client;
    this.setUp();
  }

  private setUp() {
    socket.on("timer", this.notifyTime.bind(this));
    socket.on("news", this.notifyNews.bind(this));
  }

  private async notifyNews(posts: NewsPost[]) {
    if (!this.bot) return;
    try {
      await async.mapLimit(
        dbCache.news.values,
        10,
        this.sendNews.bind(this, posts)
      );
    } catch (e) {
      console.error(e);
    }
  }

  private async sendNews(posts: NewsPost[], news: NewsEntity) {
    if (!this.bot) return;
    try {
      const channel = await this.client.channels.fetch(news.channel);
      if (
        !(channel instanceof Discord.TextChannel) ||
        !channel.permissionsFor(this.bot)?.has(Permission.SEND_MESSAGE)
      )
        return;
      async.eachLimit(posts, 2, async (post) => {
        try {
          await channel.send(new News().newsEmbed(post));
        } catch (e) {
          console.log(e);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  private async notifyTime() {
    if (!this.bot) return;
    try {
      const mapped = (
        await async.mapLimit(dbCache.time.values, 10, this.sendTime.bind(this))
      ).filter((v) => v) as TimeEntity[];
      const saved = await getRepository(TimeEntity).save(mapped);
      dbCache.time.set(...saved);
    } catch (e) {
      console.error(e);
    }
  }

  private async sendTime(time: TimeEntity) {
    if (!this.bot) return;
    try {
      const channel = await this.client.channels.fetch(time.channel);
      if (
        !(channel instanceof Discord.TextChannel) ||
        !channel.permissionsFor(this.bot)?.has(Permission.SEND_MESSAGE)
      )
        return;
      const embed = new Time().timeEmbed;
      if (!time.message) {
        time.message = (await channel.send(embed)).id;
        return time;
      }
      let msg: Discord.Message | undefined;
      try {
        msg = await channel.messages.fetch(time.message);
      } catch (e) {
        console.error(e);
      }
      if (msg) {
        await msg.edit(embed);
      } else {
        time.message = (await channel.send(embed)).id;
        return time;
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export function subscribe(client: Discord.Client) {
  new Subscriber(client);
}
