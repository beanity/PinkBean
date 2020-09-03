import { Discord } from "../lib";

export class Permission {
  public static readonly SEND_MESSAGE: Array<Discord.PermissionString> = [
    "VIEW_CHANNEL",
    "SEND_MESSAGES",
    "EMBED_LINKS",
  ];
}
