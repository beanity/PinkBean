import { Color } from "../lib";
import { guildMaster } from "../manager";
import { Queue, Song } from "../model";
import {
  Argument,
  Command,
  CommandExample,
  DiscordData,
  Option,
  Range,
} from "./base";

interface RemoveSongsParam {
  queue: Queue;
  indexes?: number[];
  range?: Range;
  requestorId?: string;
}

export class Skip extends Command {
  private arg: Argument;
  private all: Option;
  private last: Option;
  private me: Option;

  constructor() {
    super("skip", Color.MUSIC);

    this.arg = new Argument({
      name: "INDEX",
      rangeable: true,
      variadic: true,
    });

    this.all = new Option("-a", "remove all songs");
    this.last = new Option("-l", "remove the last song");
    this.me = new Option(
      "-m",
      "remove songs requested by me and ignore others"
    );

    this.addCustomArg(this.arg);
    this.addCustomOptions(this.all, this.last, this.me);
  }

  public description() {
    return "Remove songs by providing their indexes in queue. Remove the current song if nothing is provided.";
  }

  public customAliases() {
    return ["clear", "remove", "s", "r"];
  }

  public customExamples(): CommandExample[] {
    return [
      { cmd: this.fullName, explain: "remove the current song" },
      { cmd: `${this.fullName} ${this.all}`, explain: "remove all songs" },
      {
        cmd: this.fullName + " 1 2 3 4 5",
        explain: "remove songs from index 1 to 5",
      },
      {
        cmd: `${this.fullName} 1..5 || ${this.fullName} ..5`,
        explain: "remove songs from index 1 to 5",
      },
      {
        cmd: `${this.fullName} ${this.me}`,
        explain: "remove only the songs requested by me and ignore others",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const dispatcher = discord.bot.voice.connection?.dispatcher;
    const queue = guildMaster.get(discord.guild.id).queue;

    if (queue.empty) {
      discord.channel.send(this.embed().setDescription("Queue is empty"));
      return;
    }

    const current = queue.first;
    const requestorId = this.me.enabled ? discord.user.id : "";
    let removed: Song[] = [];

    if (this.all.enabled) {
      removed = queue.removeAll(requestorId);
    } else if (this.last.enabled) {
      removed = queue.bulkRemove([queue.size - 1], requestorId);
    } else if (!this.arg.input) {
      removed = requestorId
        ? queue.removeAll(requestorId)
        : queue.bulkRemove([0]);
    } else {
      const parsed = this.arg.parse();
      if (parsed.errorMsg) {
        discord.channel
          .send(this.embed().setDescription(parsed.errorMsg))
          .catch(console.error);
        return;
      }
      removed = this.removeSongs({
        queue: queue,
        indexes: parsed.nums,
        range: parsed.range,
        requestorId: requestorId,
      });
    }
    if (current && removed.includes(current) && dispatcher) {
      queue.ignoreNextShift();
      dispatcher.resume();
      dispatcher.end();
    }
    const msg = await discord.channel.send(
      removed.length === 1
        ? this.removedSongEmbed(removed[0])
        : this.embed().setDescription(`Removed **${removed.length}** songs`)
    );
    this.deleteMsg(msg, 10000);
  }

  private removeSongs({
    queue,
    indexes = [],
    range,
    requestorId,
  }: RemoveSongsParam) {
    if (range) {
      if (range.coverAll) return queue.removeAll(requestorId);
      indexes.push(...range.getIndexes(queue.size - 1));
    }
    return queue.bulkRemove(indexes, requestorId);
  }

  private removedSongEmbed(song: Song) {
    return this.embed()
      .setAuthor(`Removed: ${song.title}`, "", song.url)
      .setThumbnail(song.thumbnailUrl)
      .setDescription(song.getDetail());
  }
}
