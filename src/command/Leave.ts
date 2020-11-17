import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Leave extends Command {
  constructor() {
    super("leave", Color.PURPLE);
  }

  public async continue(discord: DiscordData) {
    if (discord.bot.voice.channel) {
      discord.bot.voice.channel.leave();
      discord.channel.send(
        this.embed().setDescription(`Left ${discord.bot.voice.channel}`)
      );
    }
  }

  public description() {
    return "Leave voice channel.";
  }

  public customAliases() {
    return ["l"];
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "make the bot leave the current voice channel",
      },
    ];
  }
}
