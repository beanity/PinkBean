import { Join } from ".";
import { Color, Discord } from "../lib";
import { guildMaster } from "../manager";
import { Guild, Song, SongDisplay, ItemFormatter } from "../model";
import { LinkParam, Item, YT, prism, ytdl } from "../youtube";
import { Argument, Command, CommandExample, DiscordData, Option } from "./base";

export class Play extends Command {
  private static readonly SEARCH_PER_PAGE = 5;

  private arg: Argument;
  private listLimit: Option;

  constructor() {
    super("play", Color.PURPLE);

    this.arg = new Argument({ name: "SONG", variadic: true });

    this.listLimit = new Option(
      "-s",
      "set the maximum size to k when adding a playlist (default 50; max 200)",
      new Argument({ name: "k", naturalable: true })
    );

    this.addCustomArg(this.arg);
    this.addCustomOptions(this.listLimit);
  }

  public customAliases() {
    return ["p"];
  }

  public customArgDescriptions() {
    return ["a YouTube link", "keywords to be searched"];
  }

  public description() {
    return "Play a youtube link or search keywords on YouTube. Resume playing if nothing is provided.";
  }

  public briefDescription() {
    return "Play a youtube link or search keywords on YouTube";
  }

  public customExamples(): CommandExample[] {
    return [
      { cmd: this.fullName, explain: "resume playing" },
      {
        cmd: `${this.fullName} maplestory ost`,
        explain: `search "maplestory ost"`,
      },
      {
        cmd: `${this.fullName} https://youtu.be/UIuNE1bjQRs`,
        explain: "play the linked song",
      },
      {
        cmd: `${this.fullName} ${this.listLimit.toString(
          false
        )} 10 https://www.youtube.com/playlist?list=PLuL3g-gXJLrGtryAZk9tWFEDbkL6YvMQI`,
        explain: "play up to 10 songs from the playlist",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    if (!(await new Join().join(discord))) return;
    const input = this.arg.input;
    if (!input) {
      await this.resume(discord);
      return;
    }
    if (guildMaster.get(discord.guild.id).queue.full) {
      discord.channel.send(this.queueFullEmbed());
      return;
    }
    if (YT.isLink(input)) {
      await this.processLink(input, discord);
      return;
    }
    await this.processKeywords(input, discord);
  }

  public async autoPlay(discord: DiscordData) {
    const guild = guildMaster.get(discord.guild.id);
    const song = guild.queue.first;
    if (!song) {
      discord.channel.send(this.embed().setDescription("Queue is empty"));
      return;
    }
    const conn = discord.bot.voice.connection;
    if (!conn) return;
    if (conn.dispatcher) {
      if (conn.dispatcher.paused) {
        conn.dispatcher.resume();
      }
      return;
    }
    const stream = await this.downloadStream(song);
    if (!stream) {
      discord.channel
        .send(this.errorEmbed({ videoId: song.id, listId: song.playlist?.id }))
        .catch(console.error);
      guild.queue.shift();
      this.autoPlay(discord).catch(console.error);
      return;
    }
    const displatcher = conn.play(stream, {
      type: "opus",
      volume: 0.38,
      highWaterMark: 1,
    });
    this.initDispatcher(displatcher, discord, guild);
  }

  public async resume(discord: DiscordData) {
    const conn = discord.bot.voice.connection;
    if (conn && conn.dispatcher) {
      if (conn.dispatcher.paused) {
        conn.dispatcher.resume();
        discord.channel
          .send(this.embed().setDescription("Music resumed"))
          .catch(console.error);
      }
    } else {
      await this.autoPlay(discord);
    }
  }

  private async processKeywords(keywords: string, discord: DiscordData) {
    const items = await YT.searchByQuery(keywords);
    if (!items.length) {
      discord.channel.send(this.noResultsEmbed());
      return;
    }
    return this.chooseItem(items, discord);
  }

  private async chooseItem(items: Item[], discord: DiscordData) {
    let pageIndex = 0;
    const choiceMsg = await discord.channel.send(
      this.choiceEmbed(items, discord, pageIndex)
    );
    const filter = (m: Discord.Message) => m.author.id === discord.user.id;
    const option = { time: 60000 };
    const collector = discord.channel.createMessageCollector(filter, option);
    let choice: number | undefined;
    collector.on("collect", (m: Discord.Message) => {
      this.deleteMsg(m);
      const match = /^(\d+|a|d)$/i.exec(m.content);
      if (!match) {
        collector.stop();
        return;
      }
      const matched = match[1].toLowerCase();
      let i = parseInt(matched);
      if (Number.isNaN(i)) {
        const newIndex =
          matched === "a"
            ? Math.max(pageIndex - 1, 0)
            : Math.min(
                pageIndex + 1,
                Math.ceil(items.length / Play.SEARCH_PER_PAGE) - 1
              );
        if (newIndex === pageIndex) return;
        pageIndex = newIndex;
        collector.resetTimer(option);
        choiceMsg
          .edit(this.choiceEmbed(items, discord, pageIndex))
          .catch(console.error);
        return;
      }
      i--;
      if (i < 0 || i >= items.length) {
        return;
      }
      choice = i;
      collector.stop();
    });
    collector.on("end", () => {
      this.deleteMsg(choiceMsg);
      if (choice == undefined) {
        discord.channel.send(this.embed().setDescription("Search cancelled"));
        return;
      }
      const item = items[choice];
      if (YT.isVideoItem(item)) {
        this.addSong(Song.build(item, discord.user.id), discord);
        return;
      }
      this.processList(item.id, discord).catch(console.error);
    });
  }

  private async processLink(url: string, discord: DiscordData) {
    const param = YT.parseParam(url);
    if (!param.videoId && !param.listId) {
      discord.channel.send(
        this.embed().setDescription(`Invalid youtube [song](${url})`)
      );
      return;
    }
    if (param.listId) {
      await this.processList(param.listId, discord, param.videoId);
      return;
    }
    await this.processVideo(param.videoId!, discord);
  }

  private async processVideo(videoId: string, discord: DiscordData) {
    const result = await YT.searchByParam({ videoId });
    const video = result.videos.shift();
    if (!video) {
      discord.channel
        .send(this.unavailableEmbed({ videoId }))
        .catch(console.error);
      return;
    }
    this.addSong(Song.build(video, discord.user.id), discord);
  }

  private async processList(
    listId: string,
    discord: DiscordData,
    videoId?: string
  ) {
    let limit = 50;
    if (this.listLimit.enabled) {
      const parsed = this.listLimit.arg!.parse();
      if (parsed.errorMsg) {
        discord.channel.send(this.embed().setDescription(parsed.errorMsg));
        return;
      }
      if (parsed.num != undefined) {
        limit = Math.min(parsed.num, Guild.LIST_MAX);
      }
    }
    if (limit === 0) {
      return;
    }

    const result = await YT.searchByParam({ listId, videoId }, limit);
    if (!result.playlist || !result.videos.length) {
      if (videoId) {
        await this.processVideo(videoId, discord);
        return;
      }
      discord.channel.send(this.unavailableEmbed({ videoId, listId }));
      return;
    }
    const songs = result.videos.map((video) =>
      Song.build(video, discord.user.id, result.playlist)
    );
    this.addSongs(songs, discord);
  }

  private addSong(song: Song, discord: DiscordData) {
    const queue = guildMaster.get(discord.guild.id).queue;
    let embed: Discord.MessageEmbed;
    if (queue.add(song)) {
      embed = this.embed()
        .setAuthor("Added")
        .setTitle(song.title)
        .setURL(song.url)
        .setThumbnail(song.thumbnailUrl)
        .setDescription(song.getDetail());
    } else {
      embed = this.queueFullEmbed();
    }
    discord.channel.send(embed).catch(console.error);
    if (queue.full) {
      discord.channel.send(this.queueFullEmbed()).catch(console.error);
    }
    this.autoPlay(discord).catch(console.error);
  }

  private addSongs(songs: Song[], discord: DiscordData) {
    const queue = guildMaster.get(discord.guild.id).queue;
    let added = 0;
    songs.forEach((song) => queue.add(song) && added++);
    const playlist = songs[0].playlist!;
    if (added) {
      const url = YT.getSongUrl({ listId: playlist.id, videoId: songs[0].id });
      discord.channel
        .send(
          this.embed()
            .setAuthor("From")
            .setTitle(playlist.title)
            .setURL(url)
            .setDescription(`Added **${added}** songs`)
            .setThumbnail(songs[0].thumbnailUrl)
        )
        .catch(console.error);
    }
    if (queue.full) {
      discord.channel.send(this.queueFullEmbed()).catch(console.error);
    }
    this.autoPlay(discord).catch(console.error);
  }

  /**
   * https://github.com/amishshah/ytdl-core-discord/blob/master/index.js
   */
  private async downloadStream(song: Song, tries = 5) {
    let info: ytdl.videoInfo | undefined;
    for (let i = 0; i < tries; i++) {
      try {
        info = await ytdl.getInfo(song.id);
        if (info) break;
      } catch (e) {
        if (i === tries - 1) console.error(e);
      }
    }
    if (!info || !info.formats.length) return;

    const isOpus = (format: ytdl.videoFormat) => format.codecs === "opus";
    if (info.formats.find(isOpus)) {
      const demuxer = new prism.opus.WebmDemuxer();
      const options: any = {
        quality: "highestaudio",
        filter: song.isLive ? "audioandvideo" : "audioonly",
        dlChunkSize: 0,
        highWaterMark: 1 << 25,
      };
      return ytdl
        .downloadFromInfo(info, options)
        .pipe(demuxer)
        .on("end", () => demuxer.destroy());
    }
    const url = this.nextBestFormat(info.formats, song.isLive)?.url;
    if (!url) return;
    const transcoder = new prism.FFmpeg({
      args: [
        "-reconnect",
        "1",
        "-reconnect_streamed",
        "1",
        "-reconnect_delay_max",
        "5",
        "-i",
        url,
        "-loglevel",
        "0",
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "2",
      ],
    });
    const opus = new prism.opus.Encoder({
      rate: 48000,
      channels: 2,
      frameSize: 960,
    });
    const stream = transcoder.pipe(opus);
    stream.on("close", () => {
      transcoder.destroy();
      opus.destroy();
    });
    return stream;
  }

  private nextBestFormat(formats: ytdl.videoFormat[], isLive = false) {
    const sortedFormats = formats
      .filter((format) =>
        isLive ? format.audioBitrate && format.isHLS : format.audioBitrate
      )
      .sort((a, b) => {
        /**
         * return formats with smaller bitrate when audioBitrate are the same.
         */
        if (a.audioBitrate === b.audioBitrate) {
          const aBitrate = Number(a.bitrate);
          const bBitrate = Number(b.bitrate);
          if (Number.isNaN(aBitrate)) return -1;
          if (Number.isNaN(bBitrate)) return 1;
          return aBitrate - bBitrate;
        }
        return b.audioBitrate! - a.audioBitrate!;
      });
    return sortedFormats.shift();
  }

  private initDispatcher(
    dispatcher: Discord.StreamDispatcher,
    discord: DiscordData,
    guild: Guild
  ) {
    let nowPlayingMsg: Discord.Message | undefined;
    dispatcher.once("start", () => {
      const currentSong = guild.queue.first;
      if (!currentSong) return;
      discord.channel
        .send(
          this.embed()
            .setAuthor("Now playing")
            .setTitle(currentSong.title)
            .setURL(currentSong.url)
            .setDescription(currentSong.getDetail())
            .setThumbnail(currentSong.thumbnailUrl)
        )
        .then((msg) => (nowPlayingMsg = msg))
        .catch(console.error);
    });
    dispatcher.on("finish", () => {
      this.deleteMsg(nowPlayingMsg);
      guild.queue.shift();
      this.autoPlay(discord);
    });
    dispatcher.on("error", console.error);
  }

  private queueFullEmbed() {
    return this.embed().setDescription("Queue is full");
  }

  private unavailableEmbed(param: LinkParam) {
    return this.embed().setDescription(
      `The requested [song](${YT.getSongUrl(param)}) is unavailable`
    );
  }

  private errorEmbed(param: LinkParam) {
    return this.embed().setDescription(
      `Oops, something happened while processing the requested [song](${YT.getSongUrl(
        param
      )})`
    );
  }

  private choiceEmbed(items: Item[], discord: DiscordData, pageIndex = 0) {
    const offset = pageIndex * Play.SEARCH_PER_PAGE;
    const choieItems = items.slice(offset, offset + Play.SEARCH_PER_PAGE);
    const fields: Discord.EmbedFieldData[] = choieItems.map((item, i) => {
      const name = `${i + offset + 1}. ${item.title}`;
      const value = new ItemFormatter(item).format({
        includes: [SongDisplay.Channel, SongDisplay.Duration],
      });
      return { name, value };
    });
    const pageInsts: string[] = [];
    if (pageIndex !== 0) {
      pageInsts.push("Previous: enter `a`");
    }
    const lastPageIndex = Math.ceil(items.length / Play.SEARCH_PER_PAGE) - 1;
    if (pageIndex !== lastPageIndex) {
      pageInsts.push("Next: enter `d`");
    }
    const navInstructions: string[] = [];
    navInstructions.push(pageInsts.join(` • `), `Cancel: enter any other key`);
    const embed = this.embed().setAuthor(
      "Choose a song:",
      discord.user.displayAvatarURL({ dynamic: true })
    );
    embed.setDescription(navInstructions.join("\n"));
    embed.addFields(fields);
    embed.setFooter(`Page ${pageIndex + 1} of ${lastPageIndex + 1}`);
    return embed;
  }
}
