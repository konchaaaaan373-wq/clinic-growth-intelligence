import { Link } from "react-router-dom";
import ReportView from "../components/ReportView";
import DisclaimerBox from "../components/DisclaimerBox";
import { SAMPLE_REPORT } from "../lib/sampleReport";

export default function SamplePage() {
  return (
    <div className="container-page py-10">
      <div className="mb-6 no-print">
        <DisclaimerBox tone="neutral">
          これは架空の医療機関「サンプル整形外科クリニック」のサンプル診断結果です。
          APIキーや実際のURLがなくても、診断結果の見え方を確認できます。
          実際に診断するには{" "}
          <Link to="/audit" className="font-medium text-brand-700 hover:underline">
            無料診断
          </Link>{" "}
          をご利用ください。
        </DisclaimerBox>
      </div>
      <ReportView report={SAMPLE_REPORT} isSample />
    </div>
  );
}
