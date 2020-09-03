import { Color } from "../lib";
import { Time } from "../maplestory/Time";
import { DiscordData, Command, CommandExample } from "./base";

export class Daily extends Command {
  constructor() {
    super("daily", Color.MAPLE);
  }

  public description() {
    return "Time until daily reset.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show time until daily reset",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const embed = this.embed().addField(
      "Daily resets in",
      Time.formatDuration(Time.daily)
    );
    discord.channel.send(embed).catch(console.error);
  }
}
