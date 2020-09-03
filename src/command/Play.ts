import { Join } from ".";
import { Color, Discord, Md } from "../lib";
import { guildMaster } from "../manager";
import { Guild, Song, ItemFormatter } from "../model";
import { YtResolver, prism, ytdl } from "../youtube";
import { Argument, Command, CommandExample, DiscordData, Option } from "./base";

const DOT = "•";
const SEARCH_PER_PAGE = 5;

export class Play extends Command {
  private arg: Argument;
  private listLimit: Option;

  constructor() {
    super("play", Color.MUSIC);

    this.arg = new Argument({ name: "SONG", variadic: true });

    this.listLimit = new Option(
      "-m",
      "Set the maximum size to k when adding a playlist (default 50; max 200)",
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
    return "Play music from YouTube. Resume playing if nothing is provided.";
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
    if (YtResolver.isYtLink(input)) {
      await this.processLink(input, discord);
      return;
    }
    await this.processKeywords(input, discord);
  }

  public async autoPlay(discord: DiscordData) {
    const guild = guildMaster.get(discord.guild.id);
    const currentSong = guild.queue.first;
    if (!currentSong) {
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
    let stream;
    try {
      stream = await this.downloadStream(currentSong);
    } catch (error) {
      console.error(error);
      this.handleSongError(currentSong, guild, discord, true);
      return;
    }
    if (!stream) {
      this.handleSongError(currentSong, guild, discord, true);
      return;
    }
    const displatcher = conn.play(stream, {
      type: "opus",
      volume: 0.4,
      highWaterMark: 25,
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
    const items = await YtResolver.search(keywords);
    if (!items.length) {
      discord.channel.send(this.noResultsEmbed().setFooter(discord.user.tag));
      return;
    }
    this.chooseItem(items, discord);
  }

  private async chooseItem(items: YtResolver.Item[], discord: DiscordData) {
    let pageIndex = 0;
    const choiceMsg = await discord.channel.send(
      this.choiceEmbed(items, discord, pageIndex)
    );
    const filter = (m: Discord.Message) => m.author.id === discord.user.id;
    const option = { time: 35000 };
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
                Math.ceil(items.length / SEARCH_PER_PAGE) - 1
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
      if (choice === undefined) {
        discord.channel.send(this.embed().setDescription("Search cancelled"));
        return;
      }
      const item = items[choice];
      if (YtResolver.isVideoItem(item)) {
        this.addSong(Song.build(item, discord.user), discord);
        return;
      }
      this.processList(item.id, discord);
    });
  }

  private async processLink(url: string, discord: DiscordData) {
    const params = YtResolver.parseParams(url);
    if (!params.videoId && !params.listId) {
      discord.channel.send(
        this.embed().setDescription(`Invalid youtube [link](${url})`)
      );
      return;
    }
    if (params.listId) {
      await this.processList(params.listId, discord, params.videoId);
      return;
    }
    await this.processVideo(params.videoId!, discord);
  }

  private async processVideo(videoId: string, discord: DiscordData) {
    let videoItem: YtResolver.Item$Video | undefined;
    try {
      videoItem = (await YtResolver.getVideoDetails(videoId)).shift();
    } catch (e) {
      console.error(e);
      discord.channel.send(this.unavailableEmbed(videoId));
      return;
    }
    if (!videoItem) {
      discord.channel.send(this.unavailableEmbed(videoId));
      return;
    }
    const song = Song.build(videoItem, discord.user);
    this.addSong(song, discord);
  }

  private async processList(
    listId: string,
    discord: DiscordData,
    videoId?: string
  ) {
    let limit: number | undefined;

    if (this.listLimit.enabled) {
      const parsed = this.listLimit.arg!.parse();
      if (parsed.errorMsg) {
        discord.channel.send(this.embed().setDescription(parsed.errorMsg));
        return;
      }
      if (parsed.num !== undefined) {
        limit = Math.min(parsed.num, Guild.LIST_MAX);
        if (limit === 0) {
          return;
        }
      }
    }

    let details: YtResolver.PlaylistDetails | undefined;

    try {
      details = await YtResolver.getListItemsDetails(listId, videoId, limit);
    } catch (e) {
      console.error(e);
      discord.channel.send(this.errorEmbed(videoId, listId));
      return;
    }

    if (!details) {
      if (videoId) {
        await this.processVideo(videoId, discord);
        return;
      }
      discord.channel.send(this.unavailableEmbed(videoId, listId));
      return;
    }

    const songs = details.videos.map((video) =>
      Song.build(video, discord.user, details!.playlist)
    );
    this.addSongs(songs, discord);
  }

  private addSong(song: Song, discord: DiscordData) {
    const queue = guildMaster.get(discord.guild.id).queue;
    let embed: Discord.MessageEmbed;
    if (queue.add(song)) {
      embed = this.embed()
        .setAuthor(`Added: ${song.title}`, "", song.url)
        .setThumbnail(song.thumbnailUrl)
        .setDescription(song.getDetail());
    } else {
      embed = this.queueFullEmbed();
    }
    discord.channel.send(embed);
    if (queue.full) discord.channel.send(this.queueFullEmbed());
    this.autoPlay(discord);
  }

  private addSongs(songs: Song[], discord: DiscordData) {
    const queue = guildMaster.get(discord.guild.id).queue;
    let addedCount = 0;
    songs.forEach((song) => queue.add(song) && addedCount++);
    const listTitle = songs[0].playlist!.title;
    const listThumbnail = songs[0].playlist!.thumbnailUrl;
    if (addedCount) {
      discord.channel.send(
        this.embed()
          .setAuthor(
            `From playlist: ${listTitle}`,
            "",
            YtResolver.getSongUrl(songs[0].id, songs[0].playlist!.id)
          )
          .setDescription(`Added **${addedCount}** songs`)
          .setThumbnail(listThumbnail)
      );
    }
    if (queue.full) discord.channel.send(this.queueFullEmbed());
    this.autoPlay(discord);
  }

  /**
   * inspired by https://github.com/amishshah/ytdl-core-discord/blob/master/index.js
   */
  private async downloadStream(song: Song) {
    const info = await ytdl.getInfo(song.id);
    if (!info.formats.length) return;
    const filterOpus = (format: ytdl.videoFormat) => format.codecs === "opus";
    const options: ytdl.downloadOptions = {
      quality: "highestaudio",
      filter: song.isLive ? "audioandvideo" : filterOpus,
    };
    if (info.formats.find(filterOpus)) {
      const demuxer = new prism.opus.WebmDemuxer();
      return ytdl
        .downloadFromInfo(info, options)
        .pipe(demuxer)
        .on("end", () => demuxer.destroy());
    }
    const transcoder = new prism.FFmpeg({
      args: [
        "-i",
        this.nextBestFormat(info.formats, song.isLive)?.url || "",
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
    const highestAudioFormats = formats
      .filter((format) => format.audioBitrate)
      .sort((a, b) => {
        const aRate = a.audioBitrate!;
        const bRate = b.audioBitrate!;
        if (aRate === bRate) {
          return Number(a.bitrate) - Number(b.bitrate) || 0;
        }
        return bRate - aRate;
      });
    const audioFormats = highestAudioFormats.filter((format) =>
      isLive ? format.qualityLabel : !format.qualityLabel
    );
    return audioFormats[0] || highestAudioFormats[0];
  }

  private handleSongError(
    song: Song,
    guild: Guild,
    discord: DiscordData,
    shouldAutoplay = false
  ) {
    discord.channel.send(this.unavailableEmbed(song.id, song.playlist?.id));
    if (shouldAutoplay) {
      guild.queue.shift();
      this.autoPlay(discord);
    }
  }

  private initDispatcher(
    dispatcher: Discord.StreamDispatcher,
    discord: DiscordData,
    guild: Guild
  ) {
    let nowPlayingMsg: Discord.Message | undefined;
    dispatcher.once("start", async () => {
      const currentSong = guild.queue.first;
      if (!currentSong) return;
      nowPlayingMsg = await discord.channel.send(
        this.embed()
          .setAuthor(`Now playing: ${currentSong.title}`, "", currentSong.url)
          .setDescription(currentSong.getDetail())
          .setThumbnail(currentSong.thumbnailUrl)
      );
    });
    dispatcher.once("finish", () => {
      this.deleteMsg(nowPlayingMsg);
      guild.queue.shift();
      this.autoPlay(discord);
    });
    dispatcher.on("error", (e) => {
      console.error(e);
    });
  }

  private queueFullEmbed() {
    return this.embed().setDescription("Queue is full");
  }

  private unavailableEmbed(videoId = "", listId = "") {
    return this.embed().setDescription(
      `The requested [song](${YtResolver.getSongUrl(
        videoId,
        listId
      )}) is unavailable`
    );
  }

  private errorEmbed(videoId = "", listId = "") {
    const song = Md.nl("song", YtResolver.getSongUrl(videoId, listId));
    const embed = this.embed();
    embed.setDescription(
      `There was a problem retrieving the requested ${song}`
    );
    return embed;
  }

  private noResultsEmbed() {
    return this.embed().setDescription(`No results found`);
  }

  private choiceEmbed(
    items: YtResolver.Item[],
    discord: DiscordData,
    pageIndex = 0
  ) {
    const offset = pageIndex * SEARCH_PER_PAGE;
    const choieItems = items.slice(offset, offset + SEARCH_PER_PAGE);
    const fields: Discord.EmbedFieldData[] = choieItems.map((item, i) => {
      const name = `${i + offset + 1}. ${item.title}`;
      const value = new ItemFormatter(item).getDetail();
      return { name, value };
    });
    const pageInsts: string[] = [];
    if (pageIndex !== 0) {
      pageInsts.push("Previous: enter `a`");
    }
    const lastPageIndex = Math.ceil(items.length / SEARCH_PER_PAGE) - 1;
    if (pageIndex !== lastPageIndex) {
      pageInsts.push("Next: enter `d`");
    }
    const navInstructions: string[] = [];
    navInstructions.push(
      pageInsts.join(` ${DOT} `),
      `Cancel: enter any other key`
    );
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
