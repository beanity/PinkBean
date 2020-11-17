const env = require("./dist/env").env;

module.exports = {
  type: "postgres",
  host: "localhost",
  port: 6543,
  username: env.db.user,
  password: env.db.secret,
  database: env.db.name,
  logging: "error",
  entities: ["dist/db/entity/**/*.js"],
  migrations: ["dist/db/migration/**/*.js"],
  cli: {
    entitiesDir: "src/db/entity",
    migrationsDir: "src/db/migration",
  },
};
