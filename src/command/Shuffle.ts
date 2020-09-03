import { Color, D3Array } from "../lib";
import { guildMaster } from "../manager";
import { DiscordData, Command, CommandExample } from "./base";

export class Shuffle extends Command {
  constructor() {
    super("shuffle", Color.MUSIC);
  }

  public description() {
    return "Shuffle queued songs if there are any.";
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
      D3Array.shuffle(queue.all, 1);
    }
    discord.channel.send(this.embed().setDescription("Queue shuffled"));
  }
}
