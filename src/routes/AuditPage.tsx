import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuditForm from "../components/AuditForm";
import LoadingSteps from "../components/LoadingSteps";
import DisclaimerBox from "../components/DisclaimerBox";
import type { AuditInput } from "../lib/types";
import { requestAudit } from "../lib/api";
import { saveReport, BRAND } from "../lib/utils";

export default function AuditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillUrl = searchParams.get("websiteUrl") ?? undefined;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: AuditInput) {
    setSubmitting(true);
    setError(null);

    const result = await requestAudit(input);

    if (result.ok) {
      saveReport(result.report);
      navigate("/results", { state: { report: result.report } });
    } else {
      setSubmitting(false);
      setError(result.error);
    }
  }

  if (submitting) {
    return (
      <div className="container-page py-16">
        <LoadingSteps />
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">{BRAND.free}（詳しく診断する）</h1>
          <p className="mt-2 text-sm text-ink-muted">
            より詳しく診断するために、医療機関名・診療科・所在地・SNS URLなどを入力してください。
            HP URLだけでも診断できますが、情報を追加するほどレポートの精度が高まります。
          </p>
          {prefillUrl && (
            <p className="mt-2 text-xs text-brand-700">
              トップページで入力されたHP URLを反映しました。診療科・所在地などを追加すると精度が高まります。
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6">
            <DisclaimerBox title="エラー" tone="warning">
              {error}
            </DisclaimerBox>
          </div>
        )}

        <AuditForm
          onSubmit={handleSubmit}
          submitting={submitting}
          initialValues={prefillUrl ? { websiteUrl: prefillUrl } : undefined}
        />
      </div>
    </div>
  );
}
