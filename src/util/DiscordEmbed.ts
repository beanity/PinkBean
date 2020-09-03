import * as Discord from "discord.js";

const CREATE_COLOR = 0x00ff00;
const DELETE_COLOR = 0xff0000;
const MAPLE_COLOR = 0xff33a2;
const MUSIC_COLOR = 0x9033ff;
const NEWS_COLOR = 0x33a2ff;

export class DiscordEmbed {
  /**
   * Build a rich embed with the color set for guild creations.
   */
  static get GuildCreate() {
    return new Discord.MessageEmbed().setColor(CREATE_COLOR);
  }
  /**
   * Build a rich embed with a default color.
   */
  static get Default() {
    return new Discord.MessageEmbed().setColor(NEWS_COLOR);
  }
  /**
   * Build a rich embed with the color set for guild deletions.
   */
  static get GuildDelete() {
    return new Discord.MessageEmbed().setColor(DELETE_COLOR);
  }
  /**
   * Build a rich embed with the color set for the MapleStory engine.
   */
  static get MapleStory() {
    return new Discord.MessageEmbed().setColor(MAPLE_COLOR);
  }
  /**
   * Build a rich embed with the color set for the music engine.
   */
  static get Music() {
    return new Discord.MessageEmbed().setColor(MUSIC_COLOR);
  }
  /**
   * Build a rich embed with the color set for news feed.
   */
  static get News() {
    return new Discord.MessageEmbed().setColor(NEWS_COLOR);
  }
}
