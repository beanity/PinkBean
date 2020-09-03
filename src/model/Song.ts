import { _, Md, Discord, moment, numeral } from "../lib";
import { YtResolver } from "../youtube";

export interface SongSpecs {
  id: string;
  title: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  isLive: boolean;
  duration: string;
  thumbnailUrl: string;
  viewCount: number | string;
  requestor: Requestor;
  playlist?: Playlist;
}

export interface Playlist {
  id: string;
  title: string;
  thumbnailUrl: string;
}

export interface Requestor {
  id: string;
  tag: string;
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
  public readonly item: YtResolver.Item;
  public readonly allDisplays: SongDisplay[];

  get duration() {
    if (!YtResolver.isVideoItem(this.item)) return "";
    return this.item.isLive
      ? "**Live Now**"
      : moment.duration(this.item.duration).format(DURATION_TEMPLATE);
  }

  get viewCount() {
    if (!YtResolver.isVideoItem(this.item) || !this.item.viewCount) return "";
    let formattedCount = numeral(this.item.viewCount).format("0a");
    if (formattedCount.length <= 2)
      formattedCount = numeral(this.item.viewCount).format("0.0a");
    return formattedCount;
  }

  get publishedAt() {
    if (!YtResolver.isVideoItem(this.item) || !this.item.publishedAt) return "";
    return moment(this.item.publishedAt).fromNow();
  }

  constructor(item: YtResolver.Item) {
    this.item = item;
    this.allDisplays = [
      SongDisplay.Duration,
      SongDisplay.Channel,
      SongDisplay.ViewCount,
      SongDisplay.PublishedAt,
    ];
  }

  public getDetail({
    includes = this.allDisplays,
    excludes = [],
  }: DisplayOption = {}) {
    if (!YtResolver.isVideoItem(this.item)) {
      return [
        Md.nl(this.item.channelTitle, this.item.channelId),
        `**${this.item.itemCount}** videos`,
      ].join(SEP);
    }
    const details: string[] = [];
    const displays = _.difference(includes, excludes);
    for (const display of displays) {
      let detail = "";
      switch (display) {
        case SongDisplay.Channel:
          detail = Md.nl(
            this.item.channelTitle,
            YtResolver.getChannelUrl(this.item.channelId)
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
    return YtResolver.getChannelUrl(this.channelId);
  }

  get channelNamedlink() {
    return Md.nl(this.channelTitle, this.channelUrl);
  }

  get url() {
    return YtResolver.getSongUrl(this.id, this.playlist?.id);
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
    const video: YtResolver.Item$Video = {
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
    requestor,
  }: SongSpecs) {
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
    this.requestor = requestor;
    this.formatter = new ItemFormatter(this.videoItem);
  }

  public static build(
    videoItem: YtResolver.Item$Video,
    user: Discord.User,
    listItem?: YtResolver.Item$Playlist
  ) {
    const specs: SongSpecs = {
      ...videoItem,
      requestor: { id: user.id, tag: user.tag },
    };
    if (listItem)
      specs.playlist = {
        id: listItem.id,
        title: listItem.title,
        thumbnailUrl: listItem.thumbnailUrl,
      };
    return new Song(specs);
  }

  public getDetail({
    includes = [...this.formatter.allDisplays, SongDisplay.Requestor],
    excludes = [],
  }: DisplayOption = {}) {
    const details = [this.formatter.getDetail({ includes, excludes })];
    if (includes.includes(SongDisplay.Requestor)) {
      details.push("Requested by: " + this.requestor.tag);
    }
    return details.join(SEP);
  }
}
