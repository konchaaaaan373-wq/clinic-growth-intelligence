// =========================================================
// HP 解析（クロール + パース）
//
// - トップページ + 主要な候補パスを最大数ページまで取得
// - node-html-parser で軽量にパース
// - 医療広告リスク検出用のテキストも収集
// =========================================================

import { parse, type HTMLElement } from "node-html-parser";
import { safeFetch } from "./safeFetch";
import { detectMedicalAdRisk } from "./medicalAdRisk";
import type { RiskFinding, WebsiteDiagnostics } from "../../../src/lib/types";

const CRAWL_CANDIDATE_PATHS = [
  "/access",
  "/first",
  "/first-visit",
  "/reserve",
  "/reservation",
  "/medical",
  "/service",
  "/treatment",
  "/blog",
  "/column",
  "/news",
  "/about",
];

const MAX_PAGES = 8;
const PER_PAGE_TIMEOUT_MS = 8000;
const PER_PAGE_MAX_BYTES = 1_500_000;

export type ParseWebsiteResult = {
  diagnostics: WebsiteDiagnostics;
  riskFindings: RiskFinding[];
  /** キーワード判定用に結合した本文テキスト（小文字化・上限付き）。レポートには保存しない。 */
  combinedText: string;
};

export async function parseWebsite(inputUrl: string): Promise<ParseWebsiteResult> {
  const fetchedUrls: string[] = [];
  const riskTexts: { text: string; where?: string }[] = [];
  let combinedRaw = "";

  // 1) トップページ取得
  const top = await safeFetch(inputUrl, {
    timeoutMs: PER_PAGE_TIMEOUT_MS,
    maxBytes: PER_PAGE_MAX_BYTES,
  });

  if (!top.ok || !top.body) {
    // 取得失敗: 最低限の diagnostics を返す（診断全体は落とさない）
    return {
      diagnostics: {
        status: "failed",
        fetchedUrls: [],
        finalUrl: top.finalUrl,
        h1: [],
        h2: [],
        hasViewport: false,
        hasTelLink: false,
        hasBookingLink: false,
        hasLineLink: false,
        hasJsonLd: false,
        hasSitemapHint: false,
        internalLinkCount: 0,
        externalLinks: [],
        snsLinks: {
          youtube: false,
          instagram: false,
          tiktok: false,
          line: false,
          facebook: false,
          x: false,
        },
        hasGoogleMapsLink: false,
        detectedKeywords: [],
        ctaKeywordPages: 0,
        pageCount: 0,
        errorMessage: top.error ?? "サイトを取得できませんでした",
      },
      riskFindings: [],
      combinedText: "",
    };
  }

  const baseUrl = new URL(top.finalUrl);
  const origin = baseUrl.origin;

  const agg: Aggregate = createAggregate();
  const topDoc = parse(top.body);
  const topPage = analyzePage(topDoc, baseUrl, origin);
  fetchedUrls.push(top.finalUrl);
  mergeInto(agg, topPage, true);
  combinedRaw += " " + topPage.textContent;
  riskTexts.push({ text: topPage.textContent, where: "トップページ" });

  // 2) 内部リンク + 候補パスからクロール対象を決定
  const toCrawl = selectCrawlTargets(topPage.internalHrefs, origin);
  for (const href of toCrawl) {
    if (fetchedUrls.length >= MAX_PAGES) break;
    if (fetchedUrls.includes(href)) continue;

    const res = await safeFetch(href, {
      timeoutMs: PER_PAGE_TIMEOUT_MS,
      maxBytes: PER_PAGE_MAX_BYTES,
    });
    if (!res.ok || !res.body) continue;
    fetchedUrls.push(res.finalUrl);
    try {
      const doc = parse(res.body);
      const page = analyzePage(doc, new URL(res.finalUrl), origin);
      mergeInto(agg, page, false);
      if (combinedRaw.length < 400_000) {
        combinedRaw += " " + page.textContent;
      }
      riskTexts.push({ text: page.textContent, where: labelForPath(res.finalUrl) });
    } catch {
      // パース失敗は無視（1ページ落ちても全体は継続）
    }
  }

  // 3) sitemap / robots のヒント（HEAD 相当の軽い GET）
  const hasSitemapHint = await probeSitemap(origin);

  // 4) 医療広告リスク検出
  const riskFindings = detectMedicalAdRisk(riskTexts);

  const combinedText = combinedRaw.toLowerCase().slice(0, 400_000);

  const diagnostics: WebsiteDiagnostics = {
    status: fetchedUrls.length > 1 ? "success" : "partial",
    fetchedUrls,
    finalUrl: top.finalUrl,
    title: agg.title,
    metaDescription: agg.metaDescription,
    h1: agg.h1.slice(0, 10),
    h2: agg.h2.slice(0, 20),
    hasViewport: agg.hasViewport,
    hasTelLink: agg.hasTelLink,
    hasBookingLink: agg.hasBookingLink,
    hasLineLink: agg.hasLineLink,
    hasJsonLd: agg.hasJsonLd,
    hasSitemapHint,
    internalLinkCount: agg.internalLinkCount,
    externalLinks: Array.from(agg.externalLinks).slice(0, 30),
    snsLinks: agg.snsLinks,
    hasGoogleMapsLink: agg.hasGoogleMapsLink,
    detectedKeywords: Array.from(agg.detectedKeywords),
    ctaKeywordPages: agg.ctaKeywordPages,
    pageCount: fetchedUrls.length,
  };

  return { diagnostics, riskFindings, combinedText };
}

// ---------------------------------------------------------
// ページ単位の解析
// ---------------------------------------------------------

type PageAnalysis = {
  title?: string;
  metaDescription?: string;
  h1: string[];
  h2: string[];
  hasViewport: boolean;
  hasTelLink: boolean;
  hasBookingLink: boolean;
  hasLineLink: boolean;
  hasJsonLd: boolean;
  hasGoogleMapsLink: boolean;
  internalHrefs: string[];
  internalLinkCount: number;
  externalLinks: string[];
  snsLinks: WebsiteDiagnostics["snsLinks"];
  hasCtaKeyword: boolean;
  textContent: string;
};

const CTA_KEYWORDS = ["予約", "web予約", "オンライン予約", "初診", "電話", "line", "問い合わせ", "受診"];
const BOOKING_HINTS = ["予約", "reserve", "reservation", "booking", "yoyaku", "airrsv", "doctorqube", "eparク", "epark"];

function analyzePage(doc: HTMLElement, pageUrl: URL, origin: string): PageAnalysis {
  const title = doc.querySelector("title")?.text?.trim();
  const metaDescription = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute("content")
    ?.trim();
  const hasViewport = !!doc.querySelector('meta[name="viewport"]');
  const h1 = doc.querySelectorAll("h1").map((e) => e.text.trim()).filter(Boolean);
  const h2 = doc.querySelectorAll("h2").map((e) => e.text.trim()).filter(Boolean);
  const hasJsonLd = doc.querySelectorAll('script[type="application/ld+json"]').length > 0;

  const anchors = doc.querySelectorAll("a");
  let hasTelLink = false;
  let hasBookingLink = false;
  let hasLineLink = false;
  let hasGoogleMapsLink = false;
  let internalLinkCount = 0;
  const internalHrefs: string[] = [];
  const externalLinks: string[] = [];
  const snsLinks: WebsiteDiagnostics["snsLinks"] = {
    youtube: false,
    instagram: false,
    tiktok: false,
    line: false,
    facebook: false,
    x: false,
  };

  for (const a of anchors) {
    const rawHref = a.getAttribute("href") ?? "";
    if (!rawHref) continue;
    const lower = rawHref.toLowerCase();
    const text = (a.text || "").toLowerCase();

    if (lower.startsWith("tel:")) hasTelLink = true;

    if (lower.includes("line.me") || lower.includes("lin.ee")) {
      hasLineLink = true;
      snsLinks.line = true;
    }
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) snsLinks.youtube = true;
    if (lower.includes("instagram.com")) snsLinks.instagram = true;
    if (lower.includes("tiktok.com")) snsLinks.tiktok = true;
    if (lower.includes("facebook.com")) snsLinks.facebook = true;
    if (lower.match(/(twitter\.com|x\.com)/)) snsLinks.x = true;
    if (
      lower.includes("google.com/maps") ||
      lower.includes("maps.google.") ||
      lower.includes("maps.app.goo.gl") ||
      lower.includes("goo.gl/maps")
    ) {
      hasGoogleMapsLink = true;
    }

    if (BOOKING_HINTS.some((h) => lower.includes(h) || text.includes(h))) {
      hasBookingLink = true;
    }

    // 内部/外部リンク判定
    if (lower.startsWith("http://") || lower.startsWith("https://")) {
      try {
        const u = new URL(rawHref);
        if (u.origin === origin) {
          internalLinkCount += 1;
          internalHrefs.push(u.toString());
        } else {
          externalLinks.push(u.toString());
        }
      } catch {
        /* ignore malformed */
      }
    } else if (lower.startsWith("/") || (!lower.startsWith("#") && !lower.startsWith("mailto:") && !lower.startsWith("tel:") && !lower.startsWith("javascript:"))) {
      try {
        const u = new URL(rawHref, pageUrl);
        if (u.origin === origin) {
          internalLinkCount += 1;
          internalHrefs.push(u.toString());
        }
      } catch {
        /* ignore */
      }
    }
  }

  const textContent = extractText(doc);
  const lowerText = textContent.toLowerCase();
  const hasCtaKeyword = CTA_KEYWORDS.some((k) => lowerText.includes(k));

  return {
    title,
    metaDescription,
    h1,
    h2,
    hasViewport,
    hasTelLink,
    hasBookingLink,
    hasLineLink,
    hasJsonLd,
    hasGoogleMapsLink,
    internalHrefs,
    internalLinkCount,
    externalLinks,
    snsLinks,
    hasCtaKeyword,
    textContent,
  };
}

function extractText(doc: HTMLElement): string {
  // script / style を除去してテキストを抽出
  doc.querySelectorAll("script, style, noscript").forEach((e) => e.remove());
  const text = doc.text || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 120_000);
}

// ---------------------------------------------------------
// 集約
// ---------------------------------------------------------

type Aggregate = {
  title?: string;
  metaDescription?: string;
  h1: string[];
  h2: string[];
  hasViewport: boolean;
  hasTelLink: boolean;
  hasBookingLink: boolean;
  hasLineLink: boolean;
  hasJsonLd: boolean;
  hasGoogleMapsLink: boolean;
  internalLinkCount: number;
  externalLinks: Set<string>;
  snsLinks: WebsiteDiagnostics["snsLinks"];
  detectedKeywords: Set<string>;
  ctaKeywordPages: number;
};

function createAggregate(): Aggregate {
  return {
    h1: [],
    h2: [],
    hasViewport: false,
    hasTelLink: false,
    hasBookingLink: false,
    hasLineLink: false,
    hasJsonLd: false,
    hasGoogleMapsLink: false,
    internalLinkCount: 0,
    externalLinks: new Set(),
    snsLinks: {
      youtube: false,
      instagram: false,
      tiktok: false,
      line: false,
      facebook: false,
      x: false,
    },
    detectedKeywords: new Set(),
    ctaKeywordPages: 0,
  };
}

const KEYWORDS_TO_TRACK = [
  "予約",
  "初診",
  "診療時間",
  "アクセス",
  "駐車場",
  "コラム",
  "ブログ",
  "症状",
  "疾患",
  "治療",
  "リハビリ",
];

function mergeInto(agg: Aggregate, page: PageAnalysis, isTop: boolean) {
  if (isTop) {
    agg.title = page.title;
    agg.metaDescription = page.metaDescription;
  }
  agg.h1.push(...page.h1);
  agg.h2.push(...page.h2);
  agg.hasViewport = agg.hasViewport || page.hasViewport;
  agg.hasTelLink = agg.hasTelLink || page.hasTelLink;
  agg.hasBookingLink = agg.hasBookingLink || page.hasBookingLink;
  agg.hasLineLink = agg.hasLineLink || page.hasLineLink;
  agg.hasJsonLd = agg.hasJsonLd || page.hasJsonLd;
  agg.hasGoogleMapsLink = agg.hasGoogleMapsLink || page.hasGoogleMapsLink;
  agg.internalLinkCount += page.internalLinkCount;
  page.externalLinks.forEach((l) => agg.externalLinks.add(l));
  (Object.keys(agg.snsLinks) as (keyof Aggregate["snsLinks"])[]).forEach((k) => {
    agg.snsLinks[k] = agg.snsLinks[k] || page.snsLinks[k];
  });
  if (page.hasCtaKeyword) agg.ctaKeywordPages += 1;

  const lower = page.textContent.toLowerCase();
  for (const kw of KEYWORDS_TO_TRACK) {
    if (lower.includes(kw)) agg.detectedKeywords.add(kw);
  }
}

// ---------------------------------------------------------
// クロール対象選定
// ---------------------------------------------------------

function selectCrawlTargets(internalHrefs: string[], origin: string): string[] {
  const targets = new Set<string>();

  // 内部リンクのうち、候補パスに一致するものを優先
  for (const href of internalHrefs) {
    try {
      const u = new URL(href);
      const path = u.pathname.toLowerCase();
      if (CRAWL_CANDIDATE_PATHS.some((p) => path.startsWith(p))) {
        targets.add(`${u.origin}${u.pathname}`);
      }
    } catch {
      /* ignore */
    }
  }

  // 候補パスを直接試す
  for (const p of CRAWL_CANDIDATE_PATHS) {
    targets.add(`${origin}${p}`);
  }

  return Array.from(targets).slice(0, MAX_PAGES + 4);
}

function labelForPath(url: string): string {
  try {
    const p = new URL(url).pathname.toLowerCase();
    if (p.includes("access")) return "アクセスページ";
    if (p.includes("first")) return "初診案内ページ";
    if (p.includes("reserv")) return "予約ページ";
    if (p.includes("blog") || p.includes("column") || p.includes("news")) return "コラム/お知らせ";
    if (p.includes("medical") || p.includes("service") || p.includes("treatment")) return "診療案内ページ";
    if (p.includes("about")) return "医院案内ページ";
    return "サブページ";
  } catch {
    return "サブページ";
  }
}

async function probeSitemap(origin: string): Promise<boolean> {
  try {
    const res = await safeFetch(`${origin}/sitemap.xml`, { timeoutMs: 4000, maxBytes: 50_000 });
    if (res.ok) return true;
    const robots = await safeFetch(`${origin}/robots.txt`, { timeoutMs: 4000, maxBytes: 50_000 });
    return robots.ok;
  } catch {
    return false;
  }
}
