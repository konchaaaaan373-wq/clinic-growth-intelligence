import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuditForm from "../components/AuditForm";
import LoadingSteps from "../components/LoadingSteps";
import DisclaimerBox from "../components/DisclaimerBox";
import type { AuditInput } from "../lib/types";
import { requestAudit } from "../lib/api";
import { saveReport } from "../lib/utils";

// 解析が一瞬で終わってもUX上のローディングを最低限見せる
const MIN_LOADING_MS = 2600;

export default function AuditPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: AuditInput) {
    setSubmitting(true);
    setError(null);
    setDone(false);

    const started = Date.now();
    const result = await requestAudit(input);
    const elapsed = Date.now() - started;
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
    }
    setDone(true);

    if (result.ok) {
      saveReport(result.report);
      // 完了ステップを少し見せてから遷移
      setTimeout(() => navigate("/results", { state: { report: result.report } }), 500);
    } else {
      setSubmitting(false);
      setError(result.error);
    }
  }

  if (submitting) {
    return (
      <div className="container-page py-16">
        <LoadingSteps done={done} />
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">無料診断</h1>
          <p className="mt-2 text-sm text-ink-muted">
            医療機関名とHP URLを入力すると、外部から見える集患力を診断します。
            任意項目を埋めるほど、診断とMMM準備度の精度が高まります。
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <DisclaimerBox title="エラー" tone="warning">
              {error}
            </DisclaimerBox>
          </div>
        )}

        <AuditForm onSubmit={handleSubmit} submitting={submitting} />
      </div>
    </div>
  );
}
