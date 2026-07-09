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
  const stripped = ip.toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, ""); // zone id 除去
  const bytes = ipv6ToBytes(stripped);
  if (!bytes) {
    // 解析不能な IPv6 は安全側に倒す
    return true;
  }

  // IPv4-mapped (::ffff:a.b.c.d / ::ffff:AABB:CCDD) と
  // IPv4-compatible (::a.b.c.d、非推奨) は埋め込み IPv4 で判定
  const isMapped =
    bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  const isCompat =
    bytes.slice(0, 12).every((b) => b === 0) && !(bytes[12] === 0 && bytes[13] === 0 && bytes[14] === 0 && bytes[15] <= 1);
  if (isMapped || isCompat) {
    const v4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isPrivateIpv4(v4);
  }

  // ::1 loopback / :: unspecified
  if (bytes.every((b, i) => (i < 15 ? b === 0 : b === 0 || b === 1))) return true;

  const first = bytes[0];
  const second = bytes[1];
  if (first === 0xfe && (second & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if ((first & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (first === 0xff) return true; // ff00::/8 multicast
  return false;
}

/** IPv6 文字列を 16 バイト配列に展開する。IPv4-mapped の末尾ドット表記にも対応。失敗時は null。 */
function ipv6ToBytes(input: string): number[] | null {
  let str = input;
  // 末尾が IPv4 ドット表記なら 2 グループの 16bit hex へ変換
  const v4Match = str.match(/(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4Match) {
    const octets = v4Match[2].split(".").map((n) => parseInt(n, 10));
    if (octets.length !== 4 || octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
      return null;
    }
    const hi = ((octets[0] << 8) | octets[1]).toString(16);
    const lo = ((octets[2] << 8) | octets[3]).toString(16);
    str = `${v4Match[1]}${hi}:${lo}`;
  }

  const halves = str.split("::");
  if (halves.length > 2) return null;

  const parseGroups = (s: string): number[] | null => {
    if (s === "") return [];
    const parts = s.split(":");
    const out: number[] = [];
    for (const p of parts) {
      if (!/^[0-9a-f]{1,4}$/.test(p)) return null;
      const v = parseInt(p, 16);
      out.push((v >> 8) & 0xff, v & 0xff);
    }
    return out;
  };

  const head = parseGroups(halves[0]);
  const tail = parseGroups(halves.length === 2 ? halves[1] : "");
  if (head === null || tail === null) return null;

  if (halves.length === 2) {
    const missing = 16 - head.length - tail.length;
    if (missing < 0) return null;
    return [...head, ...new Array(missing).fill(0), ...tail];
  }
  return head.length === 16 ? head : null;
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
        truncated = read.truncated;
        body = decodeHtml(read.bytes, contentType);
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
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
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
  return { bytes: merged, truncated };
}

/**
 * HTML バイト列を、宣言された文字コードでデコードする。
 * 優先順位: Content-Type ヘッダの charset → <meta charset> / http-equiv → UTF-8。
 * 日本のクリニックサイトに多い Shift_JIS / EUC-JP を UTF-8 固定でデコードして
 * 日本語が壊れる（キーワード/リスク検出漏れ）のを防ぐ。
 */
export function decodeHtml(bytes: Uint8Array, contentType: string): string {
  const headerCharset = charsetFromContentType(contentType);
  let charset = headerCharset;

  if (!charset) {
    // 先頭を ASCII 相当で読み、<meta> から charset を推定
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
    charset = charsetFromMeta(head);
  }

  return decodeWithLabel(bytes, charset ?? "utf-8");
}

function charsetFromContentType(contentType: string): string | null {
  const m = contentType.match(/charset\s*=\s*["']?([\w-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function charsetFromMeta(head: string): string | null {
  // <meta charset="shift_jis">
  const m1 = head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i);
  if (m1) return m1[1].toLowerCase();
  // <meta http-equiv="content-type" content="text/html; charset=euc-jp">
  const m2 = head.match(/<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([\w-]+)/i);
  if (m2) return m2[1].toLowerCase();
  return null;
}

function decodeWithLabel(bytes: Uint8Array, label: string): string {
  const normalized = normalizeCharsetLabel(label);
  try {
    return new TextDecoder(normalized, { fatal: false }).decode(bytes);
  } catch {
    // 未対応ラベルは UTF-8 にフォールバック
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

function normalizeCharsetLabel(label: string): string {
  const l = label.toLowerCase();
  // TextDecoder が受け付けるラベルへ寄せる（日本語系の別名を吸収）
  if (l === "shift-jis" || l === "sjis" || l === "x-sjis" || l === "windows-31j" || l === "cp932") {
    return "shift_jis";
  }
  if (l === "euc" || l === "eucjp" || l === "x-euc-jp") return "euc-jp";
  return l;
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
