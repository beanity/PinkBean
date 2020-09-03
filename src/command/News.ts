import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export interface NewsPost {
  title: string;
  description: string;
  image: string;
  url: string;
}

export class News extends Command {
  constructor() {
    super("news", Color.MAPLE);
  }

  public description() {
    return "News.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "news",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    console.log("news placeholder");
  }

  public newsEmbed(post: NewsPost) {
    const embed = this.embed();
    embed.setTitle(post.title);
    embed.setDescription(post.description);
    embed.setThumbnail(post.image);
    embed.setURL(post.url);
    return embed;
  }
}
