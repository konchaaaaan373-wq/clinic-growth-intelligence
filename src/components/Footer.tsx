import { Link } from "react-router-dom";
import { APP_NAME, BRAND } from "../lib/utils";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white no-print">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-sm font-bold text-ink">{APP_NAME}</div>
            <p className="mt-2 max-w-xs text-sm text-ink-muted">
              {BRAND.free} は、HP・SNS・MEO・医療広告上の要確認表現を外部情報から無料診断し、
              初診数MMMへの準備度を可視化します。
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              メニュー
            </div>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>
                <Link to="/audit" className="hover:text-brand-700">
                  {BRAND.free}を試す
                </Link>
              </li>
              <li>
                <Link to="/sample" className="hover:text-brand-700">
                  診断サンプルを見る
                </Link>
              </li>
              <li>
                <Link to="/about-mmm" className="hover:text-brand-700">
                  MMM（初診数モデリング）とは
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              ご注意
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              本診断は外部から観測できる情報に基づく初期評価であり、実際の初診CPAや
              初診への寄与を断定するものではありません。医療広告に関する検出は
              初期スクリーニングであり、法的判断・適合性の保証ではありません。
              患者個人情報は入力しないでください。
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-6 text-xs text-ink-soft">
          © {2026} {APP_NAME}. This is an MVP for external, observational
          diagnostics only.
        </div>
      </div>
    </footer>
  );
}
