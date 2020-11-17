import { _, Color, env, entities, Md } from "../lib";
import {
  Argument,
  DiscordData,
  Command,
  CommandExample,
  Option,
  MutexOptionsGroup,
} from "./base";
import got from "got";

export interface NewsPost {
  title: string;
  description: string;
  image: string;
  link: string;
}

export class News extends Command {
  private static readonly URL = "https://maplestory.nexon.net/news";
  private static readonly NL = Md.nl("MapleStory News", News.URL);

  private arg: Argument;
  private general: Option;
  private update: Option;
  private sale: Option;
  private events: Option;
  private community: Option;
  private maintenance: Option;
  private mutexGroup: MutexOptionsGroup;

  constructor() {
    super("news", Color.BLUE);
    this.arg = new Argument({ name: "INDEX", naturalable: true });
    const options = [
      new Option("-g", "general"),
      new Option("-u", "update"),
      new Option("-s", "sales"),
      new Option("-e", "events"),
      new Option("-c", "community"),
      new Option("-m", "maintenance"),
    ];
    [
      this.general,
      this.update,
      this.sale,
      this.events,
      this.community,
      this.maintenance,
    ] = options;
    this.mutexGroup = MutexOptionsGroup.add(...options);
    this.addCustomArg(this.arg);
    this.addCustomOptions(...options);
  }

  public description() {
    return `Show news from ${News.NL}. Show the first news by default.`;
  }

  public briefDescription() {
    return "Show news";
  }

  public customArgDescriptions() {
    return ["any integer between 1 and 6 (inclusive)"];
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: `show the first news from ${News.NL}`,
      },
      {
        cmd: `${this.fullName} 2`,
        explain: `show the second news from ${News.NL}`,
      },
      {
        cmd: `${this.fullName} ${this.update}`,
        explain: `show the latest news from the ${Md.nl(
          "update filter",
          News.URL + "/update"
        )}`,
      },
    ];
  }

  public async continue(discord: DiscordData) {
    let path: string | number | undefined;
    const option = this.mutexGroup.enabledOption;
    if (option) {
      switch (option) {
        case this.general:
          path = "general";
          break;
        case this.update:
          path = "update";
          break;
        case this.sale:
          path = "sale";
          break;
        case this.events:
          path = "events";
          break;
        case this.community:
          path = "community";
          break;
        case this.maintenance:
          path = "maintenance";
          break;
      }
    } else {
      const parsed = this.arg.parse();
      if (parsed.errorMsg) {
        discord.channel
          .send(this.embed().setDescription(parsed.errorMsg))
          .catch(console.error);
        return;
      }
      path = parsed.num;
    }
    path ??= 1;
    let news: NewsPost | undefined;
    try {
      news = await got(`${env.server}/api/news/${path}`).json();
    } catch (e) {
      console.error(e);
    }
    if (_.isEmpty(news)) {
      discord.channel.send(this.noResultsEmbed()).catch(console.error);
      return;
    }
    discord.channel.send(this.newsEmbed(news!)).catch(console.error);
  }

  public newsEmbed(news: NewsPost) {
    const embed = this.embed();
    embed.setTitle(news.title);
    embed.setDescription(entities.decode(news.description));
    embed.setThumbnail(news.image);
    embed.setURL(news.link);
    return embed;
  }
}
