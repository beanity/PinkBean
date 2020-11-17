import { PAGE_TOKENS, youtube } from ".";
import { _, YouTube, env } from "../lib";

export interface LinkParam {
  videoId?: string;
  listId?: string;
  startTime?: string;
}

interface Item$Base {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
}

export interface Item$Playlist extends Item$Base {
  itemCount: number | string;
}

export interface Item$Video extends Item$Base {
  publishedAt: string;
  duration: string;
  viewCount: number | string;
  isLive: boolean;
}

export type Item = Item$Video | Item$Playlist;

export interface ItemDetail {
  videos: Item$Video[];
  playlist?: Item$Playlist;
}

interface Token {
  start: string;
  size: number;
}

type Item$Type = "youtube#video" | "youtube#playlist";

export class YT {
  private static readonly URL = "https://www.youtube.com";
  private static readonly API_KEY = env.youtube;
  private static readonly LIST_MAX = 5000;
  private static readonly RESULT_MAX = 50;

  public readonly param: LinkParam;

  constructor(param: LinkParam) {
    this.param = param;
  }

  public static getChannelUrl(channelId: string) {
    return `${this.URL}/channel/${channelId}`;
  }

  public static getSongUrl({
    videoId = "",
    listId = "",
    startTime = "",
  }: LinkParam = {}) {
    if (!videoId && !listId) return "";
    if (!videoId) return `${this.URL}/playlist?list=${listId}`;
    return `${this.URL}/watch?v=${videoId}${listId && "&list=" + listId}${
      startTime && "&t=" + startTime
    }`;
  }

  /**
   * Tests whether the input looks like a youtube link.
   */
  public static isLink(input: string) {
    return /youtube\.com|youtu\.be/.test(input);
  }

  public static isVideoItem(item: Item): item is Item$Video {
    return (item as Item$Video).isLive != undefined;
  }

  public static parseParam(url: string) {
    const param: LinkParam = {};
    const videoIdMatch = /(?:youtu\.be\/|[&?]v=)([^&\s]{11})/.exec(url);
    const listIdMatch = /[&?]list=([^&\s]+)/.exec(url);
    const timeMatch = /[&?]t=(\w+)/.exec(url);
    if (videoIdMatch) param.videoId = videoIdMatch[1];
    if (listIdMatch) param.listId = listIdMatch[1];
    if (timeMatch) param.startTime = timeMatch[1];
    return param;
  }

  public static async searchByQuery(query: string, limit = 25) {
    const params: YouTube.Params$Resource$Search$List = {
      key: YT.API_KEY,
      q: query,
      type: ["video", "playlist"],
      maxResults: limit,
      part: ["id"],
      fields: "items(id)",
    };
    const response = await youtube.search.list(params);
    const items = await this.getDetailsFromSearchResults(
      response.data.items || []
    );
    return items;
  }

  public static async searchByUrl(url: string, limit?: number) {
    return new YT(this.parseParam(url)).getDetail(limit);
  }

  public static async searchByParam(param: LinkParam, limit?: number) {
    return new YT(param).getDetail(limit);
  }

  private static async getDetailsFromSearchResults(
    results: YouTube.Schema$SearchResult[]
  ) {
    if (!results.length) return [];
    const indexMap = new Map<string, number>();
    results.forEach((v, i) => {
      const id =
        v.id?.kind === "youtube#video" ? v.id!.videoId! : v.id!.playlistId!;
      indexMap.set(id, i);
    });
    const videoIds = this.filterIds(results, "youtube#video");
    const playlistIds = this.filterIds(results, "youtube#playlist");
    const items = (
      await Promise.all<Item[]>([
        this.getVideos(videoIds),
        this.getPlaylists(playlistIds),
      ])
    ).flat();
    items.sort((a, b) => (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0));
    return items;
  }

  private static filterIds(
    results: YouTube.Schema$SearchResult[],
    type: Item$Type
  ) {
    const id = results
      .filter((v) => v.id?.kind === type)
      .map((v) =>
        v.id?.kind === "youtube#video" ? v.id!.videoId! : v.id!.playlistId!
      )
      .join(",");
    return id;
  }

  private static isVideoType(id?: YouTube.Schema$ResourceId) {
    if (id?.kind === "youtube#video") return true;
    return false;
  }

  private static async getVideos(id = "") {
    if (!id) return [];
    const response = await youtube.videos.list({
      key: YT.API_KEY,
      id: [id],
      part: ["snippet", "contentDetails", "statistics"],
      fields:
        "items(id,snippet(title,publishedAt,channelId,channelTitle,liveBroadcastContent,thumbnails(default(url))),contentDetails(duration),statistics(viewCount))",
    });
    const items = response.data.items || [];
    const videos = items
      .filter((item) => item.snippet!.liveBroadcastContent !== "upcoming")
      .map((item) => this.buildVideoDetail(item));
    return videos;
  }

  private static buildVideoDetail(ytVideo: YouTube.Schema$Video) {
    const snippet = ytVideo.snippet!;
    const video: Item$Video = {
      id: ytVideo.id!,
      title: snippet.title!,
      publishedAt: snippet.publishedAt!,
      channelId: snippet.channelId!,
      channelTitle: snippet.channelTitle!,
      thumbnailUrl: snippet.thumbnails!.default!.url!,
      isLive: snippet.liveBroadcastContent! !== "none",
      duration: ytVideo.contentDetails!.duration!,
      viewCount: ytVideo.statistics!.viewCount!,
    };
    if (video.isLive) {
      video.viewCount = video.publishedAt = "";
    }
    return video;
  }

  private static async getPlaylists(id = "") {
    if (!id) return [];
    const response = await youtube.playlists.list({
      key: YT.API_KEY,
      part: ["id,snippet,contentDetails"],
      fields:
        "items(id,snippet(title,channelId,channelTitle,thumbnails(default(url))),contentDetails(itemCount))",
      id: [id],
    });
    const items = response.data.items || [];
    const details = items.map((item) => {
      const playlist: Item$Playlist = {
        id: item.id!,
        title: item.snippet!.title!,
        channelId: item.snippet!.channelId!,
        channelTitle: item.snippet!.channelTitle!,
        thumbnailUrl: item.snippet!.thumbnails!.default!.url!,
        itemCount: item.contentDetails!.itemCount!,
      };
      return playlist;
    });
    return details;
  }

  public async getDetail(limit = YT.RESULT_MAX): Promise<ItemDetail> {
    if (!this.param.videoId && !this.param.listId) {
      return {
        videos: [],
      };
    }
    if (this.param.listId) {
      return {
        videos: await this.getPlaylistItems(limit),
        playlist: (await YT.getPlaylists(this.param.listId)).shift(),
      };
    }
    return {
      videos: await YT.getVideos(this.param.videoId),
    };
  }

  private async getPlaylistItems(limit = YT.RESULT_MAX) {
    const ids = await this.getListIds(limit);
    if (!ids.length) return [];

    const chunks = _.chunk(ids, YT.RESULT_MAX).map((chunk) => chunk.join(","));
    const result = await Promise.all(chunks.map((id) => YT.getVideos(id)));
    return result.flat();
  }

  private async getListIds(limit = YT.RESULT_MAX) {
    if (!this.param.listId) return [];

    const param = this.listItemsParam({
      listId: this.param.listId,
      videoId: this.param.videoId,
      maxResults: limit,
    });
    const response = await youtube.playlistItems.list(param);
    const items = response.data.items;
    if (!items || !items.length) return [];

    const ids = items.map((v) => v.snippet!.resourceId!.videoId!);
    const remaining = Math.max(limit - items.length, 0);
    if (!remaining) return ids;

    const startIndex = items[items.length - 1].snippet!.position! + 1;
    const tokens = this.pageTokens(remaining, startIndex);
    const results = await Promise.all(
      tokens.map((token) =>
        youtube.playlistItems.list(
          this.listItemsParam({
            listId: this.param.listId!,
            maxResults: token.size,
            pageToken: token.start,
          })
        )
      )
    );
    const remainingIds = results
      .map(
        (result) =>
          result.data.items?.map((v) => v.snippet!.resourceId!.videoId!) || []
      )
      .flat();
    ids.push(...remainingIds);
    return ids;
  }

  private listItemsParam({
    listId,
    videoId,
    maxResults = YT.RESULT_MAX,
    pageToken,
  }: {
    listId: string;
    videoId?: string;
    maxResults?: number;
    pageToken?: string;
  }) {
    const params: YouTube.Params$Resource$Playlistitems$List = {
      key: YT.API_KEY,
      part: ["snippet"],
      playlistId: listId,
      fields: "items(snippet(position,resourceId(videoId)))",
    };
    if (videoId) params.videoId = videoId;
    if (pageToken) params.pageToken = pageToken;
    params.maxResults = videoId ? 1 : maxResults;
    return params;
  }

  private pageTokens(size = 0, startIndex = 0) {
    const tokens: Token[] = [];
    for (
      let remain = size;
      remain > 0 && startIndex < YT.LIST_MAX;
      remain -= YT.RESULT_MAX, startIndex += YT.RESULT_MAX
    ) {
      tokens.push({
        start: PAGE_TOKENS[startIndex],
        size: remain >= YT.RESULT_MAX ? YT.RESULT_MAX : remain,
      });
    }
    return tokens;
  }
}
