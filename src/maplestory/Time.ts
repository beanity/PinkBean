import { moment } from "../lib";

/**
 * Reference: https://www.checkli.com/checklists/curopie/maplestory-dailyweekly
 */
export class Time {
  private static readonly DURATION_FORMAT = "d[d] h[h] m[m] s[s]";

  /**
   * Server time in UTC.
   */
  static get time() {
    return moment.utc();
  }

  /**
   * Time left until daily reset.
   * Resets everyday at 12:00AM UTC.
   */
  static get daily() {
    return moment.duration(moment().endOf("day").diff(moment()));
  }

  /**
   * Time until weekly boss reset.
   * Resets every Thursday at 12:00PM UTC.
   */
  static get weeklyBoss() {
    const thursday = moment().day(4).startOf("day");
    if (moment().isAfter(thursday)) thursday.add(1, "week");
    return moment.duration(thursday.diff(moment()));
  }

  /**
   * Time until guild and dojo reset.
   * Reset every Monday 12:00AM UTC.
   */

  static get weeklyMule() {
    const monday = moment().day(1).startOf("day");
    if (moment().isAfter(monday)) monday.add(1, "week");
    return moment.duration(monday.diff(moment()));
  }

  /**
   * Time left until next Kritias invasion.
   * Ref: https://forums.maplestory.nexon.net/discussion/9786/kritias-invasion-guide
   */
  static get invasion() {
    const hours = [8, 10, 12, 14, 16, 18, 20, 22];
    const day = moment.utc().startOf("day");
    const now = moment.utc();
    let invasionTime = day.hour(hours[0]);
    for (let i = 0; i < hours.length; i++) {
      const time = day.hour(hours[i]);
      if (now.isSameOrBefore(time)) {
        invasionTime = time;
        break;
      }
      if (i === hours.length - 1) {
        invasionTime = day.add(1, "day").hour(hours[0]);
      }
    }
    return moment.duration(invasionTime.diff(now));
  }

  public static formattedTime(format = "h:mm A, dddd, MMMM Do YYYY") {
    return Time.time.format(format);
  }

  public static formatDuration(
    duration: moment.Duration,
    format = "d[d] h[h] m[m] s[s]"
  ) {
    return duration.format(format, { trim: "both mid" });
  }
}
