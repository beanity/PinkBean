import { ShardingManager } from "discord.js";
import { env } from "./lib";

process.on("unhandledRejection", console.error);

const manager = new ShardingManager("./dist/bot.js", {
  token: env.discord.secret,
});

manager.on("shardCreate", (shard) =>
  console.log(`Launched shard with id: ${shard.id}`)
);

manager.spawn();
