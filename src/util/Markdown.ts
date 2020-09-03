export class Markdown {
  /**
   * Bold
   */
  public static bld(text: any) {
    return `**${text}**`;
  }
  /**
   * Italics
   */
  public static it(text: any) {
    return `_${text}_`;
  }

  /**
   * Underline
   */
  public static und(text: any) {
    return `__${text}__`;
  }
  /**
   * Preformatted
   */
  public static pre(text: any) {
    return "`" + text + "`";
  }

  /**
   * Codeblock
   */
  public static cb(text: any) {
    return "```" + text + "```";
  }

  /**
   * Named link
   */
  public static nl(name: any, url: any) {
    return `[${name}](${url})`;
  }

  // private static toTrimmed(value: any) {
  //   return ("" + value).trim();
  // }
}
