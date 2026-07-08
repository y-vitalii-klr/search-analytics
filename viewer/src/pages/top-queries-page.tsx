import { ReportBrowser } from '../components/report-browser';

interface TopQueriesPageProps {
  period_slug: string;
}

export function TopQueriesPage({ period_slug }: TopQueriesPageProps) {
  return (
    <ReportBrowser
      period_slug={period_slug}
      title="Топ запитів"
      description="Цей розділ показує найпопулярніші напрямки за загальною кількістю пошуків незалежно від того, була ціна чи ні. Його варто використовувати для оцінки попиту."
      domestic_report_type="domestic_top_queries"
      international_report_type="country_pair_top_queries"
      include_without_price={false}
    />
  );
}
