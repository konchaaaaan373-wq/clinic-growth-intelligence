// =========================================================
// GET /.netlify/functions/health
//
// 稼働確認用のヘルスチェック。
// 任意連携の設定状況（APIキーの有無）も boolean で返す（値自体は返さない）。
// =========================================================

export default async function handler(_req: Request): Promise<Response> {
  const body = {
    ok: true,
    service: "clinic-growth-intelligence",
    time: new Date().toISOString(),
    integrations: {
      pagespeed: Boolean(process.env.PAGESPEED_API_KEY),
      youtube: Boolean(process.env.YOUTUBE_API_KEY),
    },
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
