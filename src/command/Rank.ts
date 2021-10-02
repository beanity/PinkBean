import { _, Color, env, Discord } from "../lib";
import { Argument, DiscordData, Command, CommandExample, Option } from "./base";
import got from "got";

interface LevelMove {
  rank: number;
  gap: number;
}

interface Character {
  name: string;
  level: number;
  image: string;
  job: string;
  jobId: number;
  world: string;
  worldId: number;
  experience: number;
  experiencePerc: number;
  jobWorldRank?: number;
  rank?: number;
}

interface OverviewData extends Character {
  overallData: LevelMove;
  worldData: LevelMove;
  jobData: LevelMove;
  legionData?: LevelMove & { level: number; raidPower: number };
  achievementData?: LevelMove & { score: number; tier: string };
  fameData: LevelMove & { total: number };
}

type Ranking = Character & LevelMove;

interface JwData {
  character: Ranking;
  list: Ranking[];
}

type RankData = OverviewData | JwData;

export class Rank extends Command {
  private arg: Argument;
  private eu: Option;
  // private jw: Option;

  constructor() {
    super("rank", Color.PINK);
    this.arg = new Argument({ name: "NAME", variadic: true });
    this.eu = new Option("-e", "search on EU server");
    // this.jw = new Option(
    //   "-j",
    //   "show top-ranked characters who have the same job as the provided character"
    // );
    this.addCustomArg(this.arg);
    // this.addCustomOptions(this.eu, this.jw);
    this.addCustomOptions(this.eu);
  }

  public description() {
    return "Show ranking overview by providing a character's name. Search on NA by default.";
  }

  public briefDescription() {
    return "Character ranking";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: `${this.fullName} foo`,
        explain: "show foo's ranking overview in NA",
      },
      {
        cmd: `${this.fullName} ${this.eu} foo`,
        explain: "show foo's ranking overview in EU",
      },
      // {
      //   cmd: `${this.fullName} ${this.jw} foo`,
      //   explain: "show top-ranked characters of the same job as foo",
      // },
      // {
      //   cmd: `${this.fullName} ${this.eu} ${this.jw} foo`,
      //   explain: "show top-ranked characters of the same job as foo in EU",
      // },
    ];
  }

  public async continue(discord: DiscordData) {
    const name = this.arg.input;
    if (!name) return;
    const eu = this.eu.enabled ? "?region=eu" : "";
    // const path = this.jw.enabled ? "/job-world" : "";
    const path = "";
    let data: RankData | undefined;
    try {
      data = await got(`${env.server}/api/rank/${name}${path}${eu}`).json();
    } catch (e) {
      console.error(e);
    }
    if (!data || _.isEmpty(data)) {
      discord.channel.send({ embeds: [this.noResultsEmbed()] }).catch(console.error);
      return;
    }

    const embed = this.isOverviewData(data)
      ? this.overviewEmbed(data)
      : this.jwEmbed(data);
    discord.channel.send({ embeds: [embed] }).catch(console.error);
  }

  private isOverviewData(data: RankData): data is OverviewData {
    return (data as JwData).list === undefined;
  }

  private overviewEmbed(data: OverviewData) {
    const na = "N/A";
    const fields: Discord.EmbedFieldData[] = [
      {
        name: "Level",
        value: this.getLevel(data.level, data.experiencePerc),
        inline: true,
      },
      { name: "Exp", value: this.formatNum(data.experience), inline: true },
      { name: "World", value: data.world, inline: true },
      { name: "Job", value: data.job || na, inline: true },
      {
        name: "Fame",
        value: this.formatNum(data.fameData.total),
        inline: true,
      },
      {
        name: "Fame Rank",
        value: this.getLevelMove(data.fameData),
        inline: true,
      },
      {
        name: "Overall Rank",
        value: this.getLevelMove(data.overallData),
        inline: true,
      },
      {
        name: "World Rank",
        value: this.getLevelMove(data.worldData),
        inline: true,
      },
      {
        name: "Job Rank",
        value: this.getLevelMove(data.jobData),
        inline: true,
      },
    ];

    const legionData = data.legionData;
    if (legionData) {
      fields.push(
        {
          name: "Legion Rank",
          value: this.getLevelMove(legionData),
          inline: true,
        },
        {
          name: "Legion Level",
          value: this.formatNum(legionData.level),
          inline: true,
        },
        {
          name: "Raid Power",
          value: this.formatNum(legionData.raidPower),
          inline: true,
        }
      );
    }

    const achievementData = data.achievementData;
    if (achievementData) {
      fields.push(
        {
          name: "Achievement Rank",
          value: this.getLevelMove(achievementData),
          inline: true,
        },
        {
          name: "Achievement Tier",
          value: achievementData.tier,
          inline: true,
        },
        {
          name: "Achievement Score",
          value: this.formatNum(achievementData.score),
          inline: true,
        }
      );
    }

    const embed = this.embed();
    embed.setTitle(data.name);
    embed.addFields(fields);
    embed.setThumbnail(data.image);
    return embed;
  }

  private getLevel(level: number, perc: number) {
    return `${level} (${(perc * 100).toFixed(2)}%)`;
  }

  private getLevelMove(levelMove: LevelMove) {
    let symbol = "";
    if (levelMove.gap > 0) {
      symbol = "▲";
    } else if (levelMove.gap < 0) {
      symbol = "▼";
    }
    const rank = this.formatNum(levelMove.rank);
    const gap = this.formatNum(Math.abs(levelMove.gap));
    let des = `${rank}`;
    if (levelMove.gap !== 0) {
      des += ` (${symbol}${gap})`;
    }
    return des;
  }

  private jwEmbed(data: JwData) {
    const fields: Discord.EmbedFieldData[] = [];
    data.list.forEach((char, i) =>
      fields.push({
        name: `${char.rank}. ${char.name}`,
        value: `lvl ${char.level}\n(${(char.experiencePerc * 100).toFixed(
          2
        )}%)`,
        inline: true,
      })
    );
    const embed = this.embed();
    embed.setTitle(`${data.character.job} in ${data.character.world}`);
    embed.addFields(fields);
    if (data.character.jobWorldRank) {
      embed.setDescription(`${data.character.name}'s ranking: ${data.character.jobWorldRank}`);
    }
    embed.setThumbnail(data.character.image);
    return embed;
  }
}
