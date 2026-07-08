import { ReportBrowser } from '../components/report-browser';

export function TopQueriesPage() {
  return (
    <ReportBrowser
      title="Топ запитів"
      domestic_report_type="domestic_top_queries"
      international_report_type="country_pair_top_queries"
      include_without_price={false}
    />
  );
}
