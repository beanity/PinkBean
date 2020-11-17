import { Color, Discord, Md, env } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";
const project = require("../../package.json");

export class About extends Command {
  constructor() {
    super("about", Color.BLUE);
  }

  public description() {
    return "About Pink Bean.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show about",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const fields = await this.getFields(discord.client);
    const bot = discord.client.user?.username;

    const embed = this.embed();
    embed.setAuthor(bot, "", "https://pinkbean.xyz/");
    embed.setDescription(
      `${bot} is a project that we made to give back to the community. Thanks for all the love and support!`
    );
    embed.addFields(fields);
    await discord.channel.send(embed);
  }

  private async getFields(
    client: Discord.Client
  ): Promise<Discord.EmbedFieldData[]> {
    const devIds = env.devs.map((id) => `<@${id}>`).join(", ");
    const [libVersion] =
      /[\d.]+/.exec(project.dependencies["discord.js"]) || [];
    const libUrl = "https://discord.js.org/#/docs/main/stable";
    const fields: Discord.EmbedFieldData[] = [
      { name: "Version", value: project.version, inline: true },
      {
        name: "Made by",
        value: devIds,
        inline: true,
      },
      {
        name: "Library",
        value: `${Md.nl("discord.js", libUrl)} ${libVersion}`,
        inline: true,
      },
      {
        name: "Guilds",
        value: await this.getGuildTotal(client),
        inline: true,
      },
      {
        name: "Users",
        value: await this.getUserTotal(client),
        inline: true,
      },
      {
        name: "Channels",
        value: await this.getChannelTotal(client),
        inline: true,
      },
      {
        name: "Donate",
        value: "[patreon.com/PinkBean](https://www.patreon.com/PinkBean)",
        inline: true,
      },
      {
        name: "Website",
        value: "[pinkbean.xyz](https://pinkbean.xyz/)",
        inline: true,
      },
      {
        name: "Support",
        value: "[Discord Server](https://discord.gg/wBUKQhN)",
        inline: true,
      },
    ];
    return fields;
  }

  private async getGuildTotal(client: Discord.Client) {
    if (!client.shard) return client.guilds.cache.size;
    const sizes: number[] = await client.shard.fetchClientValues(
      "guilds.cache.size"
    );
    return this.sum(sizes);
  }

  private async getChannelTotal(client: Discord.Client) {
    if (!client.shard) return client.channels.cache.size;
    const sizes: number[] = await client.shard.fetchClientValues(
      "channels.cache.size"
    );
    return this.sum(sizes);
  }

  private async getUserTotal(client: Discord.Client) {
    if (!client.shard) return client.users.cache.size;
    const sizes: number[] = await client.shard.fetchClientValues(
      "users.cache.size"
    );
    return this.sum(sizes);
  }

  private sum(nums: number[]) {
    return nums.reduce((acc, cur) => acc + cur, 0);
  }
}
