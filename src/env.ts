import * as dotenv from "dotenv";
import path = require("path");

process.env.NODE_ENV = process.env.NODE_ENV ?? "development";

const envFileName = `.env.${process.env.NODE_ENV}`;
const filePath = path.resolve(__dirname, "..", envFileName);
const result = dotenv.config({ path: filePath });

if (result.error) {
  throw result.error;
}

export const env = {
  discord: process.env.DISCORD || "",
  youtube: process.env.YOUTUBE || "",
  dbName: process.env.POSTGRES_DB || "",
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: process.env.DB_PORT || "6543",
  dbUser: process.env.POSTGRES_USER || "postgres",
  dbPassword: process.env.POSTGRES_PASSWORD || "",
  prefix: process.env.NODE_ENV === "development" ? "$" : "pb ",
  server: "https://www.pinkbean.xyz",
};
