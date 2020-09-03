const env = require("./dist/env").env;

module.exports = {
  type: "postgres",
  host: env.dbHost,
  port: env.dbPort,
  username: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  logging: "error",
  entities: ["dist/db/entity/**/*.js"],
  migrations: ["dist/db/migration/**/*.js"],
  cli: {
    entitiesDir: "src/db/entity",
    migrationsDir: "src/db/migration",
  },
};
