// =========================================================
// YouTube Data API 連携（任意）
//
// YOUTUBE_API_KEY があり、かつ YouTube URL が入力された場合のみ実行。
// URL 形式は複数あるため、/channel/UC... は確実に、/@handle は可能な範囲で対応。
// 失敗しても診断全体は落とさず「URL入力は確認済み」とする。
// =========================================================

import type { YouTubeDiagnostics } from "../../../src/lib/types";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 8000;

const MEDICAL_KEYWORDS = [
  "症状",
  "疾患",
  "治療",
  "痛み",
  "しびれ",
  "リハビリ",
  "整形外科",
  "内科",
  "皮膚科",
  "眼科",
  "耳鼻",
  "小児",
  "婦人科",
  "予防",
  "健康",
];

export async function inspectYouTube(
  youtubeUrl: string | undefined,
  apiKey: string | undefined,
): Promise<YouTubeDiagnostics> {
  if (!youtubeUrl) {
    return { status: "skipped", note: "YouTube URL が未入力です。" };
  }
  if (!apiKey) {
    return {
      status: "skipped",
      note: "YOUTUBE_API_KEY が未設定のため詳細未取得。URL入力は確認済みです。",
    };
  }

  const parsed = parseYouTubeUrl(youtubeUrl);
  if (!parsed) {
    return {
      status: "failed",
      resolvedBy: "unresolved",
      note: "YouTube URL の形式を解釈できませんでした。URL入力は確認済みです。",
    };
  }

  try {
    let channelId: string | null = null;
    let resolvedBy: YouTubeDiagnostics["resolvedBy"] = "unresolved";

    if (parsed.type === "channelId") {
      channelId = parsed.value;
      resolvedBy = "channelId";
    } else if (parsed.type === "handle") {
      channelId = await resolveHandle(parsed.value, apiKey);
      resolvedBy = channelId ? "handle" : "unresolved";
    }

    if (!channelId) {
      return {
        status: "failed",
        resolvedBy: "unresolved",
        note: "チャンネルIDを解決できませんでした（/channel/UC... 形式は確実に対応）。URL入力は確認済みです。",
      };
    }

    const channel = await fetchChannel(channelId, apiKey);
    if (!channel) {
      return {
        status: "failed",
        resolvedBy,
        note: "チャンネル情報を取得できませんでした。URL入力は確認済みです。",
      };
    }

    const recentTitles = await fetchRecentVideoTitles(channelId, apiKey);
    const medicalKeywordInTitles = recentTitles.some((t) =>
      MEDICAL_KEYWORDS.some((k) => t.includes(k)),
    );

    return {
      status: "success",
      resolvedBy,
      channelTitle: channel.title,
      subscriberCount: channel.subscriberCount,
      videoCount: channel.videoCount,
      recentVideoTitles: recentTitles.slice(0, 5),
      medicalKeywordInTitles,
    };
  } catch (e) {
    const msg =
      (e as Error)?.name === "AbortError"
        ? "YouTube API がタイムアウトしました。"
        : "YouTube API の呼び出しに失敗しました。";
    return {
      status: "failed",
      resolvedBy: "unresolved",
      note: `${msg} URL入力は確認済みです。`,
    };
  }
}

type ParsedYt =
  | { type: "channelId"; value: string }
  | { type: "handle"; value: string };

export function parseYouTubeUrl(url: string): ParsedYt | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/.test(u.hostname) && u.hostname !== "youtu.be") {
    return null;
  }
  const path = u.pathname;

  // /channel/UCxxxx
  const chMatch = path.match(/\/channel\/(UC[\w-]+)/);
  if (chMatch) return { type: "channelId", value: chMatch[1] };

  // /@handle
  const handleMatch = path.match(/\/@([\w.\-一-龠ぁ-んァ-ヴー]+)/);
  if (handleMatch) return { type: "handle", value: handleMatch[1] };

  // /c/name , /user/name → ハンドルとして試行（解決できない場合あり）
  const cMatch = path.match(/\/(?:c|user)\/([\w.\-一-龠ぁ-んァ-ヴー]+)/);
  if (cMatch) return { type: "handle", value: cMatch[1] };

  return null;
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function resolveHandle(handle: string, apiKey: string): Promise<string | null> {
  const params = new URLSearchParams({
    part: "id",
    forHandle: handle.startsWith("@") ? handle : `@${handle}`,
    key: apiKey,
  });
  const data = await fetchJson(`${API_BASE}/channels?${params.toString()}`);
  const id = data?.items?.[0]?.id;
  return typeof id === "string" ? id : null;
}

async function fetchChannel(
  channelId: string,
  apiKey: string,
): Promise<{ title?: string; subscriberCount: number | null; videoCount: number | null } | null> {
  const params = new URLSearchParams({
    part: "snippet,statistics",
    id: channelId,
    key: apiKey,
  });
  const data = await fetchJson(`${API_BASE}/channels?${params.toString()}`);
  const item = data?.items?.[0];
  if (!item) return null;
  const stats = item.statistics ?? {};
  return {
    title: item.snippet?.title,
    subscriberCount: stats.hiddenSubscriberCount ? null : toIntOrNull(stats.subscriberCount),
    videoCount: toIntOrNull(stats.videoCount),
  };
}

async function fetchRecentVideoTitles(channelId: string, apiKey: string): Promise<string[]> {
  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    order: "date",
    type: "video",
    maxResults: "5",
    key: apiKey,
  });
  const data = await fetchJson(`${API_BASE}/search?${params.toString()}`);
  const items = data?.items ?? [];
  return items
    .map((it: any) => it?.snippet?.title)
    .filter((t: unknown): t is string => typeof t === "string");
}

function toIntOrNull(v: unknown): number | null {
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof v === "number") return v;
  return null;
}
