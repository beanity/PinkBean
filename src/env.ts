import * as config from "config";

process.env.NODE_ENV ??= "development";

export const env = {
  discord: {
    id: config.get<string>("discord.id"),
    secret: config.get<string>("discord.secret"),
    guildLogs: config.get<string[]>("discord.guildLogs"),
  },
  youtube: config.get<string>("youtube.secret"),
  db: {
    name: config.get<string>("db.name"),
    host: config.get<string>("db.host"),
    port: config.get<number>("db.port"),
    user: config.get<string>("db.user"),
    secret: config.get<string>("db.secret"),
  },
  redis: {
    host: config.get<string>("redis.host"),
    port: config.get<number>("redis.port"),
  },
  prefix: {
    content: config.get<string>("prefix.content"),
    space: config.get<boolean>("prefix.space"),
  },
  server: config.get<string>("server"),
  devs: config.get<number[]>("devs"),
};
