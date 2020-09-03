import { Color, Md } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Leave extends Command {
  constructor() {
    super("leave", Color.MUSIC);
  }

  public async continue(data: DiscordData) {
    if (data.bot.voice.channel) {
      data.bot.voice.channel.leave();
      data.channel.send(
        this.embed().setDescription(
          `Left ${Md.bld(data.bot.voice.channel.name)}`
        )
      );
    }
  }

  public description() {
    return "Leave the current voice channel.";
  }

  public customAliases() {
    return ["l"];
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "make the bot leave the voice channel",
      },
    ];
  }
}
