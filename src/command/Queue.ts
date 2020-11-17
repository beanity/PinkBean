import { Color, Discord } from "../lib";
import { guildMaster } from "../manager";
import { Song, SongDisplay } from "../model";
import { DiscordData, Command, CommandExample } from "./base";

const ITEMS_PER_PAGE = 10;

export class Queue extends Command {
  constructor() {
    super("queue", Color.PURPLE);
  }

  public async continue(discord: DiscordData) {
    const queue = guildMaster.get(discord.guild.id).queue;
    const sentMsg = await discord.channel.send(this.itemsEmbed(queue.songs));

    const timeoutMs = 60000;
    if (queue.size <= ITEMS_PER_PAGE) {
      this.deleteMsg(sentMsg, timeoutMs);
      return;
    }

    const filter = (m: Discord.Message) => m.author.id === discord.user.id;
    const option = { time: timeoutMs };
    const collector = discord.channel.createMessageCollector(filter, option);
    let pageIndex = 0;

    collector.on("collect", (collected: Discord.Message) => {
      if (collected.content.startsWith(this.prefix.toString())) {
        collector.stop();
      }
      const match = /^(a|d)$/i.exec(collected.content);
      this.deleteMsg(collected);
      if (!match) {
        collector.stop();
        return;
      }
      let newIndex = pageIndex + (match[1].toLowerCase() === "a" ? -1 : 1);
      newIndex = Math.min(
        Math.max(newIndex, 0),
        this.getFinalPageIndex(queue.size)
      );
      if (newIndex === pageIndex) return;
      pageIndex = newIndex;
      collector.resetTimer(option);
      sentMsg
        .edit(this.itemsEmbed(queue.songs, pageIndex))
        .catch(console.error);
    });

    collector.on("end", () => {
      this.deleteMsg(sentMsg, 10000);
    });
  }

  public description() {
    return "Show queued songs.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show queued songs",
      },
    ];
  }

  protected customAliases() {
    return ["q"];
  }

  private getFinalPageIndex(size: number) {
    return Math.ceil(size / ITEMS_PER_PAGE) - 1;
  }

  private itemsEmbed(songs: Song[], pageIndex = 0) {
    const embed = this.embed();
    if (!songs.length) return embed.setDescription("Queue is empty");
    embed.setAuthor("Music");
    embed.setTitle(`Total **${songs.length}**`);
    const finalPageIndex = this.getFinalPageIndex(songs.length);
    const descriptions = [];
    pageIndex !== 0 && descriptions.push("Previous: enter `a`");
    pageIndex !== finalPageIndex && descriptions.push("Next: enter `d`");

    const offset = ITEMS_PER_PAGE * pageIndex;
    const displayItems = songs.slice(offset, offset + ITEMS_PER_PAGE);
    const fields: Discord.EmbedFieldData[] = displayItems.map((item, i) => {
      const name = `${i + offset + 1}. ${item.title}`;
      const value = item.getDetail({
        includes: [
          SongDisplay.Channel,
          SongDisplay.Duration,
          SongDisplay.Requestor,
        ],
      });
      return { name, value };
    });

    embed.setDescription(descriptions.join(` • `));
    embed.addFields(fields);
    if (songs.length > ITEMS_PER_PAGE) {
      embed.setFooter(`Page ${pageIndex + 1} of ${finalPageIndex + 1}`);
    }
    return embed;
  }
}
