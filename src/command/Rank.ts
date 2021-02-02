import { _, Color, env, Discord, numeral } from "../lib";
import { Argument, DiscordData, Command, CommandExample, Option } from "./base";
import got from "got";

type RankDirection = "up" | "down" | "draw";

interface LevelMove {
  rank: string;
  rankDirection: RankDirection;
  rankDistance: string;
}

interface Character {
  name: string;
  level: string;
  image: string;
  job: string;
  world: string;
  experience: string;
  experiencePerc: string;
}

interface OverviewData extends Character {
  overallLevelMove: LevelMove;
  jobLevelMove: LevelMove;
  worldLevelMove: LevelMove;
  legionRank: string;
}

type Ranking = Character & LevelMove;

interface JwData {
  character: Ranking;
  list: Ranking[];
}

type ResponseData = OverviewData | JwData;

export class Rank extends Command {
  private arg: Argument;
  private eu: Option;
  private jw: Option;

  constructor() {
    super("rank", Color.PINK);
    this.arg = new Argument({ name: "NAME", variadic: true });
    this.eu = new Option("-e", "search on EU server");
    this.jw = new Option(
      "-j",
      "show top-ranked characters who have the same job as the provided character"
    );
    this.addCustomArg(this.arg);
    this.addCustomOptions(this.eu, this.jw);
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
      {
        cmd: `${this.fullName} ${this.jw} foo`,
        explain: "show top-ranked characters of the same job as foo",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const name = this.arg.input;
    if (!name) return;
    const eu = this.eu.enabled ? "?region=eu" : "";
    const path = this.jw.enabled ? "/job-world" : "";
    let data: ResponseData | undefined;
    try {
      data = await got(`${env.server}/api/rank/${name}${path}${eu}`).json();
    } catch (e) {
      console.error(e);
    }
    if (!data || _.isEmpty(data)) {
      discord.channel.send(this.noResultsEmbed()).catch(console.error);
      return;
    }
    const embed = this.isOverviewData(data)
      ? this.overviewEmbed(data)
      : this.jwEmbed(data);
    discord.channel.send(embed).catch(console.error);
  }

  private isOverviewData(data: ResponseData): data is OverviewData {
    return (data as JwData).list === undefined;
  }

  private overviewEmbed(data: OverviewData) {
    const fields: Discord.EmbedFieldData[] = [
      {
        name: "Level",
        value: this.getLevel(data.level, data.experiencePerc),
        inline: true,
      },
      { name: "World", value: data.world, inline: true },
      { name: "Job", value: data.job, inline: true },
      {
        name: "Overall rank",
        value: this.getLevelMove(data.overallLevelMove),
        inline: true,
      },
      {
        name: "World rank",
        value: this.getLevelMove(data.worldLevelMove),
        inline: true,
      },
      {
        name: "Job rank",
        value: this.getLevelMove(data.jobLevelMove),
        inline: true,
      },
      {
        name: "Legion rank",
        value: data.legionRank
          ? this.formatNum(data.legionRank)
          : "Not available",
        inline: true,
      },
    ];
    const embed = this.embed();
    embed.setTitle(data.name);
    embed.addFields(fields);
    embed.setThumbnail(data.image);
    return embed;
  }

  private getLevel(level: string, perc: string) {
    if (numeral(perc).value()) {
      level += ` (${perc})`;
    }
    return level;
  }

  private getLevelMove(levelMove: LevelMove) {
    let symbol = "";
    switch (levelMove.rankDirection) {
      case "up":
        symbol = `▲`;
        break;
      case "down":
        symbol = `▼`;
        break;
    }
    let distanceInfo = "";
    symbol &&
      (distanceInfo = `${symbol}${this.formatNum(levelMove.rankDistance)}`);
    let rank = this.formatNum(levelMove.rank);
    distanceInfo && (rank = `${rank} (${distanceInfo})`);
    return rank || "Not available";
  }

  private jwEmbed(data: JwData) {
    const fields: Discord.EmbedFieldData[] = [];
    data.list.forEach((char, i) =>
      fields.push({
        name: `${i + 1}. ${char.name}`,
        value: `lvl ${char.level}\n(${char.experiencePerc})`,
        inline: true,
      })
    );
    const i = data.list.findIndex(
      (char) => char.name.toLowerCase() === data.character.name.toLowerCase()
    );
    const embed = this.embed();
    embed.setTitle(`${data.character.job} in ${data.character.world}`);
    embed.addFields(fields);
    if (i !== -1) {
      embed.setDescription(`${data.character.name}'s ranking: ${i + 1}`);
      embed.setThumbnail(data.character.image);
    } else if (data.list.length) {
      embed.setThumbnail(data.list[0].image);
    }
    return embed;
  }
}
