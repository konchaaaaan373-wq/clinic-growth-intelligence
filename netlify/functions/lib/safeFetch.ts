// =========================================================
// SSRF 対策付き fetch
//
// - http / https のみ許可
// - localhost / プライベートIP / リンクローカル / メタデータIP を遮断
// - ホスト名は DNS 解決して全解決先IPを検証（TOCTOU の完全排除は行わないが、
//   MVP として実用的な多層防御を提供）
// - リダイレクトは手動追跡し、各ホップを再検証
// - タイムアウト・最大取得サイズを制限
// =========================================================

import dns from "node:dns/promises";
import net from "node:net";

export type SafeFetchResult = {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
  truncated: boolean;
  error?: string;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 2_000_000; // 2MB
const MAX_REDIRECTS = 4;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

/** URL 正規化（http/https のみ許可） */
export function normalizeUrl(raw: string): URL {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) throw new Error("URL が空です");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("URL の形式が正しくありません");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("http / https 以外のプロトコルは許可されていません");
  }
  return url;
}

/** IPv4 / IPv6 のプライベート・特殊用途アドレス判定 */
export function isPrivateIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) return isPrivateIpv4(ip);
  if (type === 6) return isPrivateIpv6(ip);
  // 判定不能な場合は安全側に倒す
  return true;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (metadata 含む)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  // IPv4-mapped ::ffff:x.x.x.x
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

/** ホスト名/URL がアクセス許可されるかを検証（DNS 解決含む） */
export async function assertUrlAllowed(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("ローカルホストへのアクセスは許可されていません");
  }
  if (hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("ローカルドメインへのアクセスは許可されていません");
  }

  // ホストが IP リテラルの場合は直接判定
  const literalType = net.isIP(hostname) || net.isIP(hostname.replace(/^\[|\]$/g, ""));
  if (literalType) {
    if (isPrivateIp(hostname.replace(/^\[|\]$/g, ""))) {
      throw new Error("プライベート/特殊用途IPへのアクセスは許可されていません");
    }
    return;
  }

  // DNS 解決して全アドレスを検証
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error("ホスト名を解決できませんでした");
  }
  if (!addresses.length) {
    throw new Error("ホスト名を解決できませんでした");
  }
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error("解決先にプライベート/特殊用途IPが含まれています");
    }
  }
}

/**
 * SSRF 対策付きの安全な fetch。
 * 例外は投げず、常に SafeFetchResult を返す（呼び出し側で分岐しやすくする）。
 */
export async function safeFetch(
  rawUrl: string,
  opts: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  let currentUrl: URL;
  try {
    currentUrl = normalizeUrl(rawUrl);
  } catch (e) {
    return failResult(rawUrl, (e as Error).message);
  }

  let redirects = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await assertUrlAllowed(currentUrl);
    } catch (e) {
      return failResult(currentUrl.toString(), (e as Error).message);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "ClinicGrowthIntelligenceBot/1.0 (+external observational audit; respects robots)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      // リダイレクト処理（手動）
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        clearTimeout(timer);
        if (!loc) {
          return failResult(currentUrl.toString(), "リダイレクト先が不明です");
        }
        if (redirects >= MAX_REDIRECTS) {
          return failResult(currentUrl.toString(), "リダイレクトが多すぎます");
        }
        redirects += 1;
        try {
          currentUrl = new URL(loc, currentUrl);
          if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
            return failResult(currentUrl.toString(), "許可されないプロトコルへのリダイレクト");
          }
        } catch {
          return failResult(currentUrl.toString(), "リダイレクト先URLが不正です");
        }
        continue;
      }

      const contentType = res.headers.get("content-type") ?? "";
      // HTML 以外は本文取得をスキップ（サイズ節約）
      const isHtml = contentType.includes("text/html") || contentType.includes("xml") || contentType === "";

      let body = "";
      let truncated = false;
      if (isHtml && res.body) {
        const read = await readCapped(res.body, maxBytes);
        body = read.text;
        truncated = read.truncated;
      }
      clearTimeout(timer);

      return {
        ok: res.ok,
        status: res.status,
        finalUrl: currentUrl.toString(),
        contentType,
        body,
        truncated,
      };
    } catch (e) {
      clearTimeout(timer);
      const msg =
        (e as Error)?.name === "AbortError"
          ? "取得がタイムアウトしました"
          : "サイトの取得に失敗しました";
      return failResult(currentUrl.toString(), msg);
    }
  }
}

/** ストリームを最大サイズまで読み取り、超過分は破棄 */
async function readCapped(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let truncated = false;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > maxBytes) {
        const remaining = value.byteLength - (received - maxBytes);
        if (remaining > 0) chunks.push(value.subarray(0, remaining));
        truncated = true;
        break;
      }
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* noop */
    }
  }
  const merged = concat(chunks, Math.min(received, maxBytes));
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(merged), truncated };
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    if (offset + c.byteLength > total) {
      out.set(c.subarray(0, total - offset), offset);
      break;
    }
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function failResult(url: string, error: string): SafeFetchResult {
  return {
    ok: false,
    status: 0,
    finalUrl: url,
    contentType: "",
    body: "",
    truncated: false,
    error,
  };
}
