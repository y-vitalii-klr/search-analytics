import { ReportBrowser } from '../components/report-browser';

export function NoPricePage() {
  return (
    <ReportBrowser
      title="Топ без цін"
      description="Цей розділ показує пошуки, які завершилися без ціни. Це не обов'язково означає, що маршруту не існує: причина може бути в тому, що на конкретну дату не було доступної ціни або дані про ціну не повернулися."
      domestic_report_type="domestic_no_price"
      international_report_type="country_pair_no_price"
      include_without_price
    />
  );
}
