import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Pause extends Command {
  constructor() {
    super("pause", Color.MUSIC);
  }

  public async continue(data: DiscordData) {
    const conn = data.bot.voice.connection;
    if (conn && conn.dispatcher && !conn.dispatcher.paused) {
      conn.dispatcher.pause();
      data.channel.send(this.embed().setDescription("Music paused"));
    }
  }

  public description() {
    return "Pause the current song.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "pause the current song",
      },
    ];
  }
}
