import { Color, Discord, Md } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Join extends Command {
  constructor() {
    super("join", Color.MUSIC);
  }

  public async continue(data: DiscordData) {
    await this.join(data, true);
  }

  public description() {
    return "Join the member's voice channel.";
  }

  public customAliases() {
    return ["j"];
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "make the bot join into your voice channel",
      },
    ];
  }

  public async join(discord: DiscordData, forceMove = false) {
    const botVoice = discord.bot.voice;
    const memberVoice = discord.member.voice;
    if (!memberVoice.channel) {
      discord.message.reply("join a voice channel first!");
      return;
    }
    if (!botVoice.connection) {
      return await this.attemptJoin(memberVoice.channel, discord);
    }
    if (botVoice.connection.channel.id === memberVoice.channel.id) {
      return botVoice.connection;
    }
    if (forceMove) {
      return await this.attemptJoin(memberVoice.channel, discord);
    }
  }

  private async attemptJoin(
    channel: Discord.VoiceChannel,
    discord: DiscordData
  ) {
    try {
      const connection = await channel.join();
      discord.channel.send(
        this.embed().setDescription(`Joined ${Md.bld(connection.channel.name)}`)
      );
      return connection;
    } catch (e) {
      console.error(e);
      discord.channel.send(
        this.embed().setDescription("Unable to join " + Md.bld(channel.name))
      );
      return;
    }
  }
}
