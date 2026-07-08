import { ReportBrowser } from '../components/report-browser';

export function MissingPriceRoutesPage() {
  return (
    <ReportBrowser
      title="Маршрути, де ціни немає взагалі"
      domestic_report_type="domestic_missing_price_routes"
      international_report_type="country_pair_missing_price_routes"
      include_without_price
    />
  );
}
