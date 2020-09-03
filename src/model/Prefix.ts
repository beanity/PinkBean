import { env } from "../lib";

export class Prefix {
  public guildId: string;
  public content: string;
  public space: boolean;

  get length() {
    return this.toString().length;
  }

  constructor(guildId: string, content = env.prefix, space = false) {
    this.guildId = guildId;
    this.content = content.trim();
    this.space = space;
  }

  public toString() {
    return this.content + (this.space ? " " : "");
  }
}
