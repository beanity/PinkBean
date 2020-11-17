import * as Redis from "ioredis";
import { env } from "../env";

const redisUri = `redis://${env.redis.host}:${env.redis.port}`;
const redis = new Redis(redisUri);

export { redis, redisUri };
