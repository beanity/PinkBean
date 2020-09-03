import { PAGE_TOKENS, youtube } from ".";
import { async, env } from "../lib";
import { youtube_v3 as Youtube } from "googleapis";

const LIST_ID_REGEX = /[&?]list=([^&\s]+)/;
const YT_REGEX = /youtube\.com|youtu\.be/;
const YT_LIST_MAX = 5000;
const TIME_REGEX = /[&?]t=(\w+)/;
const VIDEO_ID_REGEX = /(?:youtu\.be\/|[&?]v=)([^&\s]{11})/;
const YT = "https://www.youtube.com";
const YT_VIDEO_TYPE = "youtube#video";
const YT_PLAYLIST_TYPE = "youtube#playlist";
const API_KEY = env.youtube;

export const RESULTS_MAX = 50;

export interface YTParams {
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

export function getChannelUrl(channelId: string) {
  return `${YT}/channel/${channelId}`;
}

export function getSongUrl(videoId = "", listId = "") {
  if (!videoId && !listId) return "";
  if (!videoId) return `${YT}/playlist?list=${listId}`;
  return `${YT}/watch?v=${videoId}${listId && "&list=" + listId}`;
}

export function isYtLink(url: string) {
  return YT_REGEX.test(url);
}

export function parseParams(url: string) {
  const info: YTParams = {};
  const videoIdMatch = VIDEO_ID_REGEX.exec(url);
  const listIdMatch = LIST_ID_REGEX.exec(url);
  const timeMatch = TIME_REGEX.exec(url);
  if (videoIdMatch) info.videoId = videoIdMatch[1];
  if (listIdMatch) info.listId = listIdMatch[1];
  if (timeMatch) info.startTime = timeMatch[1];
  return info;
}

function buildDetail(video: Youtube.Schema$Video) {
  const snippet = video.snippet!;
  const videoItem: Item$Video = {
    id: video.id!,
    title: snippet.title!,
    publishedAt: snippet.publishedAt!,
    channelId: snippet.channelId!,
    channelTitle: snippet.channelTitle!,
    thumbnailUrl: snippet.thumbnails!.default!.url!,
    isLive: snippet.liveBroadcastContent! !== "none",
    duration: video.contentDetails!.duration!,
    viewCount: video.statistics!.viewCount!,
  };
  if (videoItem.isLive) {
    videoItem.viewCount = videoItem.publishedAt = "";
  }
  return videoItem;
}

export async function getVideoDetails(videoId: string) {
  if (!videoId) return [];
  const response = await youtube.videos.list({
    key: API_KEY,
    id: [videoId],
    part: ["snippet", "contentDetails", "statistics"],
    fields:
      "items(id,snippet(title,publishedAt,channelId,channelTitle,liveBroadcastContent,thumbnails(default(url))),contentDetails(duration),statistics(viewCount))",
  });
  const items = response.data.items || [];
  const details = items
    .filter((item) => item.snippet!.liveBroadcastContent !== "upcoming")
    .map((item) => buildDetail(item));
  return details;
}

interface TokenInfo {
  startToken: string;
  size: number;
}

export function calculatePageTokens(total = 0, index = 0) {
  const itemParams: TokenInfo[] = [];
  for (
    let remain = total;
    remain > 0 && index < YT_LIST_MAX;
    remain -= RESULTS_MAX, index += RESULTS_MAX
  ) {
    itemParams.push({
      startToken: PAGE_TOKENS[index],
      size: remain >= RESULTS_MAX ? RESULTS_MAX : remain,
    });
  }
  return itemParams;
}

function listItemsParam({
  listId,
  videoId,
  maxResults = RESULTS_MAX,
  pageToken,
}: {
  listId: string;
  videoId?: string;
  maxResults?: number;
  pageToken?: string;
}) {
  const params: Youtube.Params$Resource$Playlistitems$List = {
    key: API_KEY,
    part: ["snippet"],
    playlistId: listId,
    fields: "items(snippet(position,resourceId(videoId)))",
  };
  if (videoId) params.videoId = videoId;
  if (pageToken) params.pageToken = pageToken;
  params.maxResults = videoId ? 1 : maxResults;
  return params;
}

async function getItemsIds({
  listId,
  videoId,
  limit = RESULTS_MAX,
}: {
  listId: string;
  videoId?: string;
  limit?: number;
}) {
  const response = await youtube.playlistItems.list(
    listItemsParam({ listId: listId, videoId: videoId, maxResults: limit })
  );
  const items = response.data.items;
  if (!items || !items.length) return [];

  const ids = items.map((v) => v.snippet!.resourceId!.videoId!);
  const remainingCount = Math.max(limit - items.length, 0);
  if (!remainingCount) return ids;

  const startIndex = items[items.length - 1].snippet!.position! + 1;
  const tokenInfos = calculatePageTokens(remainingCount, startIndex);
  const remainingIds = (
    await async.mapLimit(tokenInfos, 2, async (info: TokenInfo) => {
      return (
        (
          await youtube.playlistItems.list(
            listItemsParam({
              listId: listId,
              maxResults: info.size,
              pageToken: info.startToken,
            })
          )
        ).data.items?.map((v) => v.snippet!.resourceId!.videoId!) || []
      );
    })
  ).flat() as string[];
  ids.push(...remainingIds);
  return ids;
}

function mergeIntoBlocks(ids: string[]) {
  const blocks: string[][] = [];
  let block: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (i % RESULTS_MAX === 0) {
      block = [];
      blocks.push(block);
    }
    block.push(ids[i]);
  }
  return blocks.map((block) => block.join(","));
}

export interface PlaylistDetails {
  videos: Item$Video[];
  playlist: Item$Playlist;
}

export async function getPlaylistDetails(listId: string) {
  if (!listId) return [];
  const response = await youtube.playlists.list({
    key: API_KEY,
    part: ["id,snippet,contentDetails"],
    fields:
      "items(id,snippet(title,channelId,channelTitle,thumbnails(default(url))),contentDetails(itemCount))",
    id: [listId],
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

export async function getListItemsDetails(
  listId: string,
  videoId?: string,
  limit = RESULTS_MAX
) {
  const ids = await getItemsIds({
    listId: listId,
    videoId: videoId,
    limit: limit,
  });

  if (!ids.length) return;

  const itemsPromise = async.mapLimit(
    mergeIntoBlocks(ids),
    2,
    async (id: string) => {
      return await getVideoDetails(id);
    }
  ) as Promise<Item$Video[][]>;
  const listPromise = getPlaylistDetails(listId);
  const res = await Promise.all([itemsPromise, listPromise]);
  const videos = res[0].flat();
  const playlist = res[1].shift();

  if (!videos.length || !playlist) return;

  const ItemDetails: PlaylistDetails = {
    videos: videos,
    playlist: playlist,
  };
  return ItemDetails;
}

export function isVideoItem(
  item: Item$Video | Item$Playlist
): item is Item$Video {
  return (item as Item$Video).isLive !== undefined;
}

function filterIds(results: Youtube.Schema$SearchResult[], isVideoType = true) {
  const type = isVideoType ? YT_VIDEO_TYPE : YT_PLAYLIST_TYPE;
  const id = results
    .filter((v) => v.id!.kind! === type)
    .map((v) =>
      v.id!.kind! === YT_VIDEO_TYPE ? v.id!.videoId! : v.id!.playlistId!
    )
    .join(",");
  return id;
}

function isVideoType(id?: Youtube.Schema$ResourceId) {
  if (id?.kind === YT_VIDEO_TYPE) return true;
  return false;
}

async function getItemsFromSearchResults(
  results: Youtube.Schema$SearchResult[]
) {
  if (!results.length) return [];
  const indexMap = new Map<string, number>();
  results.forEach((v, i) => {
    const id = isVideoType(v) ? v.id!.videoId! : v.id!.playlistId!;
    indexMap.set(id, i);
  });
  const items = (
    await Promise.all<Item[]>([
      getVideoDetails(filterIds(results)),
      getPlaylistDetails(filterIds(results, false)),
    ])
  ).flat();
  items.sort((a, b) => indexMap.get(a.id)! - indexMap.get(b.id)! || 0);
  return items;
}

export async function search(query: string) {
  const params: Youtube.Params$Resource$Search$List = {
    key: API_KEY,
    q: query,
    type: ["video,playlist"],
    maxResults: 25,
    part: ["id"],
    fields: "items(id)",
  };
  const response = await youtube.search.list(params);
  const items = await getItemsFromSearchResults(response.data.items || []);
  return items;
}
