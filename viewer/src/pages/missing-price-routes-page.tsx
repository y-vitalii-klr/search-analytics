import { ReportBrowser } from '../components/report-browser';

export function MissingPriceRoutesPage() {
  return (
    <ReportBrowser
      title="Маршрути, де ціни немає взагалі"
      description="Цей розділ показує лише ті маршрути, для яких у вибраному періоді немає жодного запису з ціною. Тобто це сильніший сигнал, ніж просто пошук без ціни: для такого напрямку ціна не знаходилася взагалі."
      domestic_report_type="domestic_missing_price_routes"
      international_report_type="country_pair_missing_price_routes"
      include_without_price
    />
  );
}
