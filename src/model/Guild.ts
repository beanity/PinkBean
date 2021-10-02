import { Prefix } from ".";

export interface GuildData {
  id: string;
}

export class Guild {
  public static readonly LIST_MAX = 200;
  public readonly id: string;
  public readonly cooldowns: Set<string>;
  public prefix: Prefix;

  constructor(id: string) {
    this.id = id;
    this.prefix = new Prefix();
    this.cooldowns = new Set();
  }

  public toData(): GuildData {
    return {
      id: this.id
    };
  }
}
