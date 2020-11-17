import { Color } from "../lib";
import { Time } from "../maplestory/Time";
import { DiscordData, Command, CommandExample } from "./base";

export class Weekly extends Command {
  constructor() {
    super("weekly", Color.PINK);
  }

  public description() {
    return "Time until weekly reset.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show time until weekly reset",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const embed = this.embed().addFields(
      {
        name: "Weekly resets in",
        value: Time.formatDuration(Time.weeklyBoss),
      },
      {
        name: "Guild and Dojo reset in",
        value: Time.formatDuration(Time.weeklyMule),
      }
    );
    discord.channel.send(embed).catch(console.error);
  }
}
