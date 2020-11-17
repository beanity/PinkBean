import { Color, D3Array } from "../lib";
import { guildMaster } from "../manager";
import { DiscordData, Command, CommandExample } from "./base";

export class Shuffle extends Command {
  constructor() {
    super("shuffle", Color.PURPLE);
  }

  public description() {
    return "Shuffle queued songs in random order.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "shuffle songs",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const queue = guildMaster.get(discord.guild.id).queue;
    if (queue.empty) return;
    if (queue.size >= 3) {
      let start = 0;
      if (discord.bot.voice.connection?.dispatcher) start = 1;
      D3Array.shuffle(queue.songs, start);
    }
    discord.channel.send(this.embed().setDescription("Queue shuffled"));
  }
}
