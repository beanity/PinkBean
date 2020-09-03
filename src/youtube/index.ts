import * as YtResolver from "./YTResolver";
import { google } from "googleapis";
import ytdl = require("ytdl-core");
import * as prism from "prism-media";

const youtube = google.youtube("v3");
export { YtResolver, prism, youtube, ytdl };
export { PAGE_TOKENS } from "./YTPageTokens";
