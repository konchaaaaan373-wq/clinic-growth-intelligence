import { Link, NavLink } from "react-router-dom";
import { APP_NAME, BRAND } from "../lib/utils";

// モバイル（<sm）ではロゴがホームを兼ねるため「ホーム」「MMMとは」を隠し、
// 「診断サンプル」は短縮ラベルにして1行に収める（375px想定）。
const navItems = [
  { to: "/", label: "ホーム", end: true, mobileHidden: true },
  { to: "/audit", label: "無料診断" },
  { to: "/sample", label: "診断サンプル", mobileLabel: "サンプル" },
  { to: "/about-mmm", label: "MMMとは", mobileHidden: true },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur no-print">
      <div className="container-page flex h-16 items-center justify-between gap-2">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 13h3l2 5 4-12 2 7h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          {/* 320px級の極小幅ではアイコンのみ表示（横スクロールを出さない） */}
          <span className="hidden flex-col leading-tight min-[360px]:flex">
            <span className="whitespace-nowrap text-sm font-bold text-ink">{APP_NAME}</span>
            <span className="hidden text-[11px] text-ink-soft sm:block">
              クリニックの外部集患力を無料診断
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium transition sm:px-3 sm:text-sm ${
                  item.mobileHidden ? "hidden sm:block " : ""
                }${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-muted hover:bg-slate-100 hover:text-ink"
                }`
              }
            >
              {item.mobileLabel ? (
                <>
                  <span className="sm:hidden">{item.mobileLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                item.label
              )}
            </NavLink>
          ))}
          <Link to="/audit" className="btn-primary ml-2 hidden whitespace-nowrap sm:inline-flex">
            {BRAND.free}を開始
          </Link>
        </nav>
      </div>
    </header>
  );
}
