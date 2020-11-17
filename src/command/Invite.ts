import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Invite extends Command {
  constructor() {
    super("invite", Color.BLUE);
  }

  public description() {
    return "Generate invite link.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "generate invite link",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const link = await discord.guild.client.generateInvite(["ADMINISTRATOR"]);
    const embed = this.embed();
    embed.setTitle("Invite Link");
    embed.setDescription(link);
    discord.channel.send(embed).catch(console.error);
  }
}
