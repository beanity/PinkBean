import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Join extends Command {
  constructor() {
    super("join", Color.PURPLE);
  }

  public async continue(data: DiscordData) {
    await this.join(data, true);
  }

  public description() {
    return "Join voice channel.";
  }

  public customAliases() {
    return ["j"];
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "make the bot join into the member's voice channel",
      },
    ];
  }

  public async join(discord: DiscordData, forceMove = false) {
    const botVoice = discord.bot.voice;
    const rqtrVoice = discord.member.voice;
    if (!rqtrVoice.channel) {
      discord.message.reply("join a voice channel first!");
      return;
    }
    if (!botVoice.connection || forceMove) {
      const connection = await rqtrVoice.channel.join();
      connection.on("error", console.error);
      await connection.voice.setSelfDeaf(true);
      discord.channel.send(
        this.embed().setDescription(`Joined ${rqtrVoice.channel}`)
      );
      return connection;
    }
    if (botVoice.connection.channel.id === rqtrVoice.channelID) {
      return botVoice.connection;
    }
  }
}
