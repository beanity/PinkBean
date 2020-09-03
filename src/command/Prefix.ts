import { _, Color, Md } from "../lib";
import { guildMaster } from "../manager";
import { Prefix as PrefixEntity } from "../db/entity";
import { Prefix as PrefixModel } from "../model";
import { DiscordData, Command, CommandExample, Argument, Option } from "./base";
import { getRepository } from "typeorm";

export class Prefix extends Command {
  private arg: Argument;
  private space: Option;
  constructor() {
    super("prefix", Color.GENERAL);
    this.space = new Option("-s", "include a space after");
    this.arg = new Argument({ name: "CONTENT" });
    this.addCustomArg(this.arg);
    this.addCustomOptions(this.space);
  }

  public description() {
    return `Change the current prefix ${Md.pre(
      this.prefix.toString()
    )} to a new one. If nothing is provided, the current one stays the same.`;
  }

  public customArgDescriptions() {
    return [
      "any text without spaces. Automatically removes any surrounding spaces",
    ];
  }

  public customExamples(): CommandExample[] {
    const prefix = "foo";
    return [
      {
        cmd: `${this.fullName} ${prefix}`,
        explain: `change prefix to ${Md.pre(
          prefix
        )} without any spaces. E.g., ${Md.pre(prefix + "help")}`,
      },
      {
        cmd: `${this.fullName} ${this.space} ${prefix}`,
        explain: `change prefix to ${Md.pre(
          prefix
        )} with a following space. E.g., ${Md.pre(prefix + " help")}`,
      },
    ];
  }

  public async continue(discord: DiscordData) {
    if (!this.arg.input) {
      discord.channel.send(this.currentPrefixEmbed()).catch(console.error);
      return;
    }

    const includeSpace = this.space.enabled;
    const prefix = new PrefixModel(
      discord.guild.id,
      this.arg.input,
      includeSpace
    );

    if (prefix.toString() === this.prefix.toString()) {
      discord.channel.send(this.currentPrefixEmbed()).catch(console.error);
      return;
    }

    const embed = this.embed();

    try {
      await this.save(prefix);
      this.prefix = prefix;
      guildMaster.get(discord.guild.id).prefix = prefix;
      const title = `Prefix set to ${Md.pre(prefix)}`;
      embed.setTitle(title);
      embed.setDescription(
        `${_.capitalize(this.hasSpace())}. E.g., ${Md.pre(this.fullName)}`
      );
    } catch (e) {
      embed.setDescription("Unable to save new prefix");
      console.error(e);
    }
    discord.channel.send(embed).catch(console.error);
  }

  private async save(prefix: PrefixModel) {
    const newPrefix = new PrefixEntity();
    newPrefix.id = prefix.guildId;
    newPrefix.content = prefix.content;
    newPrefix.space = prefix.space;
    await getRepository(PrefixEntity).save(newPrefix);
  }

  private currentPrefixEmbed() {
    return this.embed().setDescription(
      `Current prefix is ${Md.pre(this.prefix)} ${this.hasSpace()}`
    );
  }

  private hasSpace() {
    return (this.prefix.space ? "with a " : "without any ") + "space";
  }
}
