import { Color } from "../lib";
import { Time } from "../maplestory/Time";
import { DiscordData, Command, CommandExample } from "./base";

export class Invasion extends Command {
  constructor() {
    super("invasion", Color.MAPLE);
  }

  public description() {
    return "Time until the next Kritias Invasion.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show time until the next Kritias Invasion",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const embed = this.embed().addField(
      "Kritias Invasion in",
      Time.formatDuration(Time.invasion)
    );
    discord.channel.send(embed).catch(console.error);
  }
}
