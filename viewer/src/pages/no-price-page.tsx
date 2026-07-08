import { ReportBrowser } from '../components/report-browser';

export function NoPricePage() {
  return (
    <ReportBrowser
      title="Топ без цін"
      domestic_report_type="domestic_no_price"
      international_report_type="country_pair_no_price"
      include_without_price
    />
  );
}
