import { Color, moment, numeral, Discord } from "../lib";
import { guildMaster } from "../manager";
import { DURATION_TEMPLATE, Song } from "../model";
import { DiscordData, Command, CommandExample } from "./base";

export class Current extends Command {
  constructor() {
    super("current", Color.PURPLE);
  }

  public description() {
    return "Show current song.";
  }

  public customAliases() {
    return ["c"];
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show current song",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const queue = guildMaster.get(discord.guild.id).queue;
    const song = queue.first;
    if (!song) return;
    const streamTime = discord.bot.voice.connection?.dispatcher?.streamTime;
    const embed = this.embed()
      .setAuthor("Now playing")
      .setTitle(song.title)
      .setURL(song.url)
      .setThumbnail(song.thumbnailUrl)
      .addFields(this.buildFields(song, streamTime));
    discord.channel.send(embed).catch(console.error);
  }

  private getSongProgress(song: Song, streamTime = 0) {
    if (song.isLive) return song.formattedDuration;
    const streamDuration = moment.duration(streamTime);
    const totalDuration = moment.duration(song.duration);
    const progressPerc = numeral(
      streamDuration.asMilliseconds() / totalDuration.asMilliseconds()
    ).format("0%");
    return `${streamDuration.format(DURATION_TEMPLATE)} / ${
      song.formattedDuration
    } (${progressPerc})`;
  }

  private buildFields(song: Song, streamTime?: number) {
    const fields: Discord.EmbedFieldData[] = [];
    fields.push(
      {
        name: "Duration",
        value: this.getSongProgress(song, streamTime),
        inline: true,
      },
      {
        name: "Channel",
        value: song.channelNamedlink,
        inline: true,
      }
    );
    if (!song.isLive) {
      fields.push(
        {
          name: "Views",
          value: song.formattedViewCount,
          inline: true,
        },
        {
          name: "Published at",
          value: song.formattedPublishedAt,
          inline: true,
        }
      );
    }
    fields.push({
      name: "Requested by",
      value: song.requestor,
      inline: true,
    });
    return fields;
  }
}
