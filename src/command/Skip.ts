import { Color } from "../lib";
import { guildMaster } from "../manager";
import { Queue, Song } from "../model";
import { Argument, Command, CommandExample, DiscordData, Option } from "./base";

import { Play } from ".";

export class Skip extends Command {
  private arg: Argument;
  private all: Option;
  private last: Option;
  private me: Option;

  constructor() {
    super("skip", Color.PURPLE);

    this.arg = new Argument({
      name: "INDEX",
      rangeable: true,
      variadic: true,
    });

    this.all = new Option("-a", "remove all songs");
    this.last = new Option("-l", "remove the last song");
    this.me = new Option("-m", "remove songs requested by me");

    this.addCustomArg(this.arg);
    this.addCustomOptions(this.all, this.last, this.me);
  }

  public description() {
    return "Remove songs by providing their indexes in queue. Removes the current song if nothing is provided.";
  }

  public briefDescription() {
    return "Skip songs";
  }

  public customAliases() {
    return ["clear", "remove", "s"];
  }

  public customExamples(): CommandExample[] {
    return [
      { cmd: this.fullName, explain: "remove the current song" },
      {
        cmd: `${this.fullName} ${this.all} || ${this.fullName} ..`,
        explain: "remove all songs",
      },
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
    const queue = guildMaster.get(discord.guild.id).queue;

    if (queue.empty) {
      discord.channel.send(this.embed().setDescription("Queue is empty"));
      return;
    }

    const current = queue.first;
    const requestorId = this.me.enabled ? discord.user.id : "";
    const result = this.remove(queue, requestorId);

    if (result.error) {
      discord.channel.send(this.embed().setDescription(result.error));
      return;
    }

    const removed = result.removed;
    const msg = await discord.channel.send(
      removed.length === 1
        ? this.removedSongEmbed(removed[0])
        : this.embed().setDescription(`Removed **${removed.length}** songs`)
    );

    this.deleteMsg(msg, 30000);

    if (current && removed.includes(current)) {
      /**
       * The dispatcher auto skips to the next song when destroyed.
       *
       * Since we have already removed the current song when execution
       * gets here, we do not want the dispatcher to remove the current
       * song again.
       */
      const dispatcher = discord.bot.voice.connection?.dispatcher;
      if (dispatcher) {
        dispatcher.destroy();
      }
      await new Play().resume(discord);
    }
  }

  private remove(queue: Queue, requestorId?: string) {
    const result: { removed: Song[]; error?: string } = { removed: [] };
    if (this.all.enabled) {
      result.removed = queue.removeAll(requestorId);
      return result;
    }
    if (this.last.enabled) {
      result.removed = queue.bulkRemove([queue.size - 1], requestorId);
      return result;
    }
    if (!this.arg.input) {
      result.removed = requestorId
        ? queue.removeAll(requestorId)
        : queue.bulkRemove([0]);
      return result;
    }
    const parsed = this.arg.parse();
    if (parsed.errorMsg) {
      result.error = parsed.errorMsg;
      return result;
    }
    const indexes = parsed.nums;
    if (parsed.range) {
      if (parsed.range.coverAll) {
        result.removed = queue.removeAll(requestorId);
        return result;
      }
      indexes.push(...parsed.range.toIndexes(queue.size - 1));
    }
    result.removed = queue.bulkRemove(indexes, requestorId);
    return result;
  }

  private removedSongEmbed(song: Song) {
    return this.embed()
      .setAuthor("Removed")
      .setTitle(song.title)
      .setURL(song.url)
      .setThumbnail(song.thumbnailUrl)
      .setDescription(song.getDetail());
  }
}
