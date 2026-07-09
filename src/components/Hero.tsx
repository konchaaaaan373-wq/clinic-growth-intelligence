import { Link } from "react-router-dom";
import { BRAND } from "../lib/utils";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-brand-50/40">
      <div className="container-page py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <span className="badge border-brand-200 bg-brand-50 text-brand-700">
            医療機関向け・{BRAND.free}（無料診断）
          </span>
          <p className="mt-4 text-sm font-semibold tracking-wide text-brand-700">{BRAND.product}</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
            クリニックの外部集患力を、
            <br className="hidden sm:block" />
            URLから無料診断。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            HP・SNS・MEO・医療広告上の要確認表現を横断チェックし、
            初診数MMMにつなげるための改善点をレポート化します。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/audit" className="btn-primary px-6 py-3 text-base">
              {BRAND.free}を試す
            </Link>
            <Link to="/sample" className="btn-secondary px-6 py-3 text-base">
              診断サンプルを見る
            </Link>
          </div>
          <p className="mt-5 text-xs text-ink-soft">
            ※ 外部から見える範囲の診断です。真の初診CPAや初診寄与を断定するものではありません。
            患者個人情報は入力しないでください。
          </p>
        </div>
      </div>
    </section>
  );
}
