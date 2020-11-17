import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";
import { Play } from ".";

export class Resume extends Command {
  constructor() {
    super("resume", Color.PURPLE);
  }

  public async continue(data: DiscordData) {
    await new Play().resume(data);
  }

  public description() {
    return "Resume current song.";
  }

  public customAliases() {
    return ["r"];
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "Resume current song",
      },
    ];
  }
}
