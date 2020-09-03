import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";
import { Play } from ".";

export class Resume extends Command {
  constructor() {
    super("resume", Color.MUSIC);
  }

  public async continue(data: DiscordData) {
    new Play().resume(data);
  }

  public description() {
    return "Resume music.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "resume the current song",
      },
    ];
  }
}
