import { _, Md, moment, numeral } from "../lib";
import { Item, Item$Video, YT } from "../youtube";

export interface Video {
  id: string;
  title: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  isLive: boolean;
  duration: string;
  thumbnailUrl: string;
  viewCount: number | string;
}

export interface SongData extends Video {
  requestorId: string;
  playlist?: Playlist;
}

export interface Playlist {
  id: string;
  title: string;
  thumbnailUrl: string;
}

export class Requestor {
  public readonly id: string;
  constructor(id: string) {
    this.id = id;
  }
  public toString() {
    return `<@${this.id}>`;
  }
}

export enum SongDisplay {
  Duration,
  PublishedAt,
  Channel,
  ViewCount,
  Requestor,
}

export interface DisplayOption {
  includes?: SongDisplay[];
  excludes?: SongDisplay[];
}

const DOT = "•";
const SEP = ` ${DOT} `;

export const DURATION_TEMPLATE = "d:h:*m:ss";

export class ItemFormatter {
  public readonly item: Item;
  public readonly commonDisplays: SongDisplay[];

  get channelUrl() {
    return YT.getChannelUrl(this.item.channelId);
  }

  get channelNamedlink() {
    return Md.nl(this.item.channelTitle, this.channelUrl);
  }

  get duration() {
    if (!YT.isVideoItem(this.item)) return "";
    return this.item.isLive
      ? "**Live Now**"
      : moment.duration(this.item.duration).format(DURATION_TEMPLATE);
  }

  get viewCount() {
    if (!YT.isVideoItem(this.item) || !this.item.viewCount) return "";
    let formattedCount = numeral(this.item.viewCount).format("0a");
    if (`${this.item.viewCount}`.length > 2 && formattedCount.length < 2) {
      formattedCount = numeral(this.item.viewCount).format("0.0a");
    }
    return formattedCount;
  }

  get publishedAt() {
    if (!YT.isVideoItem(this.item) || !this.item.publishedAt) return "";
    return moment(this.item.publishedAt).fromNow();
  }

  get url() {
    return YT.isVideoItem(this.item)
      ? YT.getSongUrl({ videoId: this.item.id })
      : YT.getSongUrl({ listId: this.item.id });
  }

  get namedLink() {
    return Md.nl("link", this.url);
  }

  constructor(item: Item) {
    this.item = item;
    this.commonDisplays = [
      SongDisplay.Duration,
      SongDisplay.Channel,
      SongDisplay.ViewCount,
      SongDisplay.PublishedAt,
    ];
  }

  public format({
    includes = this.commonDisplays,
    excludes = [],
  }: DisplayOption = {}) {
    if (!YT.isVideoItem(this.item)) {
      return [this.channelNamedlink, `**${this.item.itemCount}** videos`].join(
        SEP
      );
    }
    const details: string[] = [];
    const displays = _.difference(includes, excludes);
    for (const display of displays) {
      let detail = "";
      switch (display) {
        case SongDisplay.Channel:
          detail = Md.nl(
            this.item.channelTitle,
            YT.getChannelUrl(this.item.channelId)
          );
          break;
        case SongDisplay.Duration:
          detail = this.duration;
          break;
        case SongDisplay.PublishedAt:
          detail = this.publishedAt;
          break;
        case SongDisplay.ViewCount:
          detail = this.viewCount;
          break;
      }
      if (detail) details.push(detail);
    }
    return details.join(SEP);
  }
}

export class Song {
  public readonly id: string;
  public readonly title: string;
  public readonly publishedAt: string;
  public readonly channelId: string;
  public readonly channelTitle: string;
  public readonly isLive: boolean;
  public readonly duration: string;
  public readonly thumbnailUrl: string;
  public readonly viewCount: number | string;
  public readonly requestor: Requestor;
  public playlist?: Playlist;

  private formatter: ItemFormatter;

  get channelUrl() {
    return this.formatter.channelUrl;
  }

  get channelNamedlink() {
    return this.formatter.channelNamedlink;
  }

  get url() {
    return YT.getSongUrl({ videoId: this.id, listId: this.playlist?.id });
  }

  get formattedDuration() {
    return this.formatter.duration;
  }

  get formattedPublishedAt() {
    return this.formatter.publishedAt;
  }

  get formattedViewCount() {
    return this.formatter.viewCount;
  }

  get videoItem() {
    const video: Item$Video = {
      id: this.id,
      title: this.title,
      channelId: this.channelId,
      channelTitle: this.channelTitle,
      thumbnailUrl: this.thumbnailUrl,
      publishedAt: this.publishedAt,
      duration: this.duration,
      viewCount: this.viewCount,
      isLive: this.isLive,
    };
    return video;
  }

  constructor({
    id,
    title,
    publishedAt,
    channelId,
    channelTitle,
    isLive,
    duration,
    thumbnailUrl,
    viewCount,
    playlist,
    requestorId,
  }: SongData) {
    this.id = id;
    this.title = title;
    this.publishedAt = publishedAt;
    this.channelId = channelId;
    this.channelTitle = channelTitle;
    this.isLive = isLive;
    this.duration = duration;
    this.thumbnailUrl = thumbnailUrl;
    this.viewCount = viewCount;
    this.playlist = playlist;
    this.requestor = new Requestor(requestorId);
    this.formatter = new ItemFormatter(this.videoItem);
  }

  public static build(video: Video, requestorId: string, playlist?: Playlist) {
    const songData: SongData = {
      ...video,
      requestorId,
      playlist,
    };
    return new Song(songData);
  }

  public getDetail({
    includes = [...this.formatter.commonDisplays, SongDisplay.Requestor],
    excludes = [],
  }: DisplayOption = {}) {
    const details = [this.formatter.format({ includes, excludes })];
    if (includes.includes(SongDisplay.Requestor)) {
      details.push(`${this.requestor}`);
    }
    return details.join(SEP);
  }

  public toData(): SongData {
    return {
      ...this.videoItem,
      requestorId: this.requestor.id,
      playlist: this.playlist,
    };
  }
}
