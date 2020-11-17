import { Discord } from "../lib";

export abstract class Task {
  protected readonly client: Discord.Client;

  get bot() {
    return this.client.user;
  }

  constructor(client: Discord.Client) {
    this.client = client;
  }

  public static attach<T extends Task>(
    this: { new (client: Discord.Client): T },
    client: Discord.Client
  ) {
    new this(client).add();
  }

  public abstract add(): void;
}
