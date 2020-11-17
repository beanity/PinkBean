import { guildMaster } from "../manager";
import { GuildData } from "../model";
import { redis } from "../module";
import { _, Discord, async } from "../lib";
import { Task } from "./Task";

export class Music extends Task {
  constructor(client: Discord.Client) {
    super(client);
  }

  public add() {
    this.client.setInterval(() => {
      this.cacheAllSongs().catch(console.error);
      this.cleanIdleConnections();
    }, 60000);
  }

  private async cacheAllSongs() {
    const guildChunks = _.chunk(guildMaster.guilds, 100);
    await async.eachLimit(guildChunks, 1, async (guildChunk) => {
      const data = guildChunk.map((guild) => guild.toData());
      return this.cacheSongs(data).catch(console.error);
    });
  }

  private async cacheSongs(data: GuildData[]) {
    if (_.isEmpty(data)) return;
    await async.each(data, async (guildData) =>
      redis
        .set(
          `${guildData.id}:songs`,
          JSON.stringify(guildData.songs),
          "EX",
          86400
        )
        .catch(console.error)
    );
  }

  private dcIdleConns(voices: Discord.VoiceState[]) {
    for (const voice of voices) {
      voice.channel &&
        voice.channel.members.size <= 1 &&
        voice.connection?.disconnect();
    }
  }

  private cleanIdleConnections() {
    const voices: Discord.VoiceState[] = [];
    for (const guild of this.client.guilds.cache.values()) {
      guild.voice && voices.push(guild.voice);
    }
    setTimeout(() => this.dcIdleConns(voices), 60000);
  }
}
