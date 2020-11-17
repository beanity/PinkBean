import { env } from "../lib";

export class Prefix {
  public content: string;
  public space: boolean;

  get length() {
    return this.toString().length;
  }

  constructor(content = env.prefix.content, space = env.prefix.space) {
    this.content = content.trim();
    this.space = space;
  }

  public toString() {
    return this.content + (this.space ? " " : "");
  }
}
