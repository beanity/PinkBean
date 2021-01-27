import { env, Discord } from "./lib";
import * as Task from "./task";
import { createConnection } from "typeorm";
import path = require("path");

process.on("unhandledRejection", console.error);

const client = new Discord.Client();

client.on("ready", () => {
  console.log(`Logged in as ${client?.user?.username}!`);
});

Task.Guild.attach(client);
Task.Subscription.attach(client);
Task.Music.attach(client);
Task.Message.attach(client);

async function connectDb() {
  return await createConnection({
    type: "postgres",
    host: env.db.host,
    port: env.db.port,
    username: env.db.user,
    password: env.db.secret,
    database: env.db.name,
    entities: [path.join(__dirname, "..", "dist/db/entity/**/*.js")],
    logging: ["error"],
  });
}

async function start() {
  await connectDb();
  await client.login(env.discord.secret);
}

start().catch(console.error);
