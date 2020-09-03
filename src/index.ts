import { ShardingManager } from "discord.js";
import { env } from "./lib";

const manager = new ShardingManager("./dist/bot.js", {
  token: env.discord,
});

manager.on("shardCreate", (shard) =>
  console.log(`Launched shard with id: ${shard.id}`)
);

manager.spawn();
