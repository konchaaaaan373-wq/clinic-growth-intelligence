import { useState } from "react";
import type { AuditInput } from "../lib/types";
import { isValidHttpUrl, sanitizeText } from "../lib/utils";
import DisclaimerBox from "./DisclaimerBox";

type Props = {
  onSubmit: (input: AuditInput) => void;
  submitting?: boolean;
  initialValues?: Partial<AuditInput>;
};

const CHANNEL_OPTIONS = [
  "HP",
  "SEO記事",
  "Google広告",
  "YouTube",
  "Instagram",
  "TikTok",
  "ポスティング",
  "MEO",
  "紹介営業",
  "その他",
];

const PATIENT_RANGES = ["不明", "0-50", "51-100", "101-200", "201以上"];

const CONSENT_TEXT =
  "入力されたURLをもとに、外部から取得可能な情報を自動解析します。患者個人情報は入力しないでください。本診断は医療広告上の法的適合性を保証するものではなく、改善の参考情報です。";

type Errors = Partial<Record<string, string>>;

export default function AuditForm({ onSubmit, submitting, initialValues }: Props) {
  const iv = initialValues ?? {};
  const [clinicName, setClinicName] = useState(iv.clinicName ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(iv.websiteUrl ?? "");
  const [specialty, setSpecialty] = useState(iv.specialty ?? "");
  const [location, setLocation] = useState(iv.location ?? "");
  const [email, setEmail] = useState(iv.email ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(iv.googleMapsUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(iv.youtubeUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(iv.instagramUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(iv.tiktokUrl ?? "");
  const [lineUrl, setLineUrl] = useState(iv.lineUrl ?? "");
  const [bookingUrl, setBookingUrl] = useState(iv.bookingUrl ?? "");
  const [activeChannels, setActiveChannels] = useState<string[]>(iv.activeChannels ?? []);
  const [monthlyNewPatientsRange, setMonthlyNewPatientsRange] = useState(
    iv.monthlyNewPatientsRange ?? "",
  );
  const [interestedInMMM, setInterestedInMMM] = useState(iv.interestedInMMM ?? false);
  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState<Errors>({});

  function toggleChannel(ch: string) {
    setActiveChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!clinicName.trim()) e.clinicName = "医療機関名を入力してください。";
    if (!websiteUrl.trim()) {
      e.websiteUrl = "HP URLは必須です。";
    } else if (!isValidHttpUrl(websiteUrl)) {
      e.websiteUrl = "http:// または https:// で始まる有効なURLを入力してください。";
    }
    if (!specialty.trim()) e.specialty = "診療科を入力してください。";
    if (!location.trim()) e.location = "都道府県/市区町村を入力してください。";

    // 任意URL群の形式チェック
    const optionalUrls: [string, string][] = [
      ["googleMapsUrl", googleMapsUrl],
      ["youtubeUrl", youtubeUrl],
      ["instagramUrl", instagramUrl],
      ["tiktokUrl", tiktokUrl],
      ["lineUrl", lineUrl],
      ["bookingUrl", bookingUrl],
    ];
    for (const [key, val] of optionalUrls) {
      if (val.trim() && !isValidHttpUrl(val)) {
        e[key] = "URLの形式が正しくありません（http/httpsのみ）。";
      }
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = "メールアドレスの形式が正しくありません。";
    }
    if (!consent) e.consent = "解析に同意いただく必要があります。";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // 最初のエラー項目へスクロール
      const first = document.querySelector("[data-error='true']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const input: AuditInput = {
      clinicName: sanitizeText(clinicName),
      websiteUrl: websiteUrl.trim(),
      specialty: sanitizeText(specialty),
      location: sanitizeText(location),
      email: email.trim() || undefined,
      googleMapsUrl: googleMapsUrl.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      tiktokUrl: tiktokUrl.trim() || undefined,
      lineUrl: lineUrl.trim() || undefined,
      bookingUrl: bookingUrl.trim() || undefined,
      activeChannels: activeChannels.length ? activeChannels : undefined,
      monthlyNewPatientsRange: monthlyNewPatientsRange || undefined,
      interestedInMMM,
      consent,
      source: "detailed-form",
    };
    onSubmit(input);
  }

  const field = (key: string) => (errors[key] ? { "data-error": "true" } : {});

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* 必須 */}
      <section className="card p-6">
        <h2 className="text-base font-bold text-ink">基本情報（必須）</h2>
        <p className="mt-1 text-sm text-ink-soft">
          診断に必要な最小限の情報です。患者個人情報は入力しないでください。
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div {...field("clinicName")}>
            <label className="label" htmlFor="clinicName">
              医療機関名 <span className="text-rose-500">*</span>
            </label>
            <input
              id="clinicName"
              className="input"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="例）サンプル整形外科クリニック"
            />
            {errors.clinicName && <p className="mt-1 text-xs text-rose-600">{errors.clinicName}</p>}
          </div>

          <div {...field("websiteUrl")}>
            <label className="label" htmlFor="websiteUrl">
              HP URL <span className="text-rose-500">*</span>
            </label>
            <input
              id="websiteUrl"
              className="input"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example-clinic.jp"
              inputMode="url"
            />
            {errors.websiteUrl && <p className="mt-1 text-xs text-rose-600">{errors.websiteUrl}</p>}
          </div>

          <div {...field("specialty")}>
            <label className="label" htmlFor="specialty">
              診療科 <span className="text-rose-500">*</span>
            </label>
            <input
              id="specialty"
              className="input"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="例）整形外科 / 内科"
            />
            {errors.specialty && <p className="mt-1 text-xs text-rose-600">{errors.specialty}</p>}
          </div>

          <div {...field("location")}>
            <label className="label" htmlFor="location">
              都道府県 / 市区町村 <span className="text-rose-500">*</span>
            </label>
            <input
              id="location"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例）東京都・世田谷区"
            />
            {errors.location && <p className="mt-1 text-xs text-rose-600">{errors.location}</p>}
          </div>

          <div {...field("email")}>
            <label className="label" htmlFor="email">
              担当者メールアドレス（任意）
            </label>
            <input
              id="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.jp"
              inputMode="email"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
          </div>
        </div>
      </section>

      {/* 任意 */}
      <section className="card p-6">
        <h2 className="text-base font-bold text-ink">チャネル情報（任意）</h2>
        <p className="mt-1 text-sm text-ink-soft">
          入力いただくほど診断の精度とMMM準備度の評価が高まります。
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {(
            [
              ["googleMapsUrl", "GoogleマップURL", googleMapsUrl, setGoogleMapsUrl, "https://maps.google.com/..."],
              ["youtubeUrl", "YouTubeチャンネルURL", youtubeUrl, setYoutubeUrl, "https://www.youtube.com/@..."],
              ["instagramUrl", "Instagram URL", instagramUrl, setInstagramUrl, "https://www.instagram.com/..."],
              ["tiktokUrl", "TikTok URL", tiktokUrl, setTiktokUrl, "https://www.tiktok.com/@..."],
              ["lineUrl", "LINE公式アカウントURL", lineUrl, setLineUrl, "https://lin.ee/..."],
              ["bookingUrl", "予約システムURL", bookingUrl, setBookingUrl, "https://..."],
            ] as [string, string, string, (v: string) => void, string][]
          ).map(([key, label, val, setter, ph]) => (
            <div key={key} {...field(key)}>
              <label className="label" htmlFor={key}>
                {label}
              </label>
              <input
                id={key}
                className="input"
                value={val}
                onChange={(e) => setter(e.target.value)}
                placeholder={ph}
                inputMode="url"
              />
              {errors[key] && <p className="mt-1 text-xs text-rose-600">{errors[key]}</p>}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <span className="label">現在力を入れている施策（複数選択可）</span>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((ch) => {
              const active = activeChannels.includes(ch);
              return (
                <button
                  type="button"
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    active
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-slate-300 bg-white text-ink-muted hover:bg-slate-50"
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="range">
              月間初診数レンジ（任意）
            </label>
            <select
              id="range"
              className="input"
              value={monthlyNewPatientsRange}
              onChange={(e) => setMonthlyNewPatientsRange(e.target.value)}
            >
              <option value="">選択してください</option>
              {PATIENT_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                checked={interestedInMMM}
                onChange={(e) => setInterestedInMMM(e.target.checked)}
              />
              Clinic Report Analytics（有料版・初診寄与の推定）に興味がある
            </label>
          </div>
        </div>
      </section>

      {/* 同意 */}
      <section className="card p-6" {...field("consent")}>
        <DisclaimerBox title="解析に関する同意" tone="warning">
          {CONSENT_TEXT}
        </DisclaimerBox>
        <label className="mt-4 flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>上記に同意し、外部から取得可能な情報の自動解析を許可します。（必須）</span>
        </label>
        {errors.consent && <p className="mt-2 text-xs text-rose-600">{errors.consent}</p>}
      </section>

      <div className="flex flex-col items-center gap-3">
        <button type="submit" className="btn-primary w-full px-6 py-3 text-base sm:w-auto" disabled={submitting}>
          {submitting ? "診断中…" : "この内容で Clinic Report Free を試す"}
        </button>
        <p className="text-xs text-ink-soft">
          送信後、外部情報の解析を行い診断結果を表示します（数十秒かかる場合があります）。
        </p>
      </div>
    </form>
  );
}
