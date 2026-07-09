import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { AuditReport } from "../lib/types";
import { loadReport } from "../lib/utils";
import ReportView from "../components/ReportView";

type LocationState = { report?: AuditReport } | null;

export default function ResultsPage() {
  const location = useLocation();
  const [report, setReport] = useState<AuditReport | null>(null);

  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.report) {
      setReport(state.report);
    } else {
      // 直リンク・リロード時は localStorage から復元
      setReport(loadReport());
    }
  }, [location.state]);

  if (!report) {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-lg card p-8 text-center">
          <h1 className="text-xl font-bold text-ink">診断結果が見つかりません</h1>
          <p className="mt-2 text-sm text-ink-muted">
            まだ診断を実行していないか、結果が保存されていない可能性があります。
            まずは無料診断を実行してください。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/audit" className="btn-primary">
              無料診断をはじめる
            </Link>
            <Link to="/sample" className="btn-secondary">
              サンプルを見る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <ReportView report={report} />
    </div>
  );
}
