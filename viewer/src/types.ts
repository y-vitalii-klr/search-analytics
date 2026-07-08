export interface ReportMetadata {
  report_key: string;
  report_type: string;
  generated_at: string;
  period: {
    date_from: string | null;
    date_to: string | null;
  };
  filters: Record<string, boolean | number | string | null>;
}

export interface ReportSummary {
  rows: number;
  searches_total: number;
  searches_without_price: number;
}

export interface ReportFile<T> {
  metadata: ReportMetadata;
  summary: ReportSummary;
  data: T[];
}

export interface ManifestEntry {
  report_key: string;
  report_type: string;
  file_path: string;
  origin_country_name: string | null;
  destination_country_name: string | null;
}

export interface ManifestFile {
  period_slug?: string;
  metadata: {
    generated_at: string;
    period: {
      date_from: string | null;
      date_to: string | null;
    };
    top_countries_limit: number;
    top_rows_limit: number;
  };
  countries: string[];
  reports: ManifestEntry[];
}

export interface PeriodCatalogEntry {
  period_slug: string;
  label: string;
  date_from: string | null;
  date_to: string | null;
  generated_at: string;
  top_countries_limit: number;
  top_rows_limit: number;
  manifest_path: string;
}

export interface PeriodCatalogFile {
  periods: PeriodCatalogEntry[];
  default_period_slug: string | null;
}

export interface RouteRow {
  origin_city_name: string;
  destination_city_name: string;
  origin_country_name?: string;
  destination_country_name?: string;
  count: number;
}

export interface GlobalStatsRow {
  scope: string;
  total_searches: number;
  searches_without_price: number;
  with_price_share: number;
  without_price_share: number;
}

export interface CountryCoverageRow {
  country_name: string;
  total_searches: number;
  searches_without_price: number;
  with_price_share: number;
  without_price_share: number;
}

export type RouteReport = ReportFile<RouteRow>;
export type GlobalStatsReport = ReportFile<GlobalStatsRow>;
export type CountryCoverageReport = ReportFile<CountryCoverageRow>;
export type TopCountriesReport = ReportFile<CountryCoverageRow>;

export type AppReport =
  | RouteReport
  | GlobalStatsReport
  | CountryCoverageReport
  | TopCountriesReport;

export interface ReportCardStat {
  label: string;
  value: string;
}

export type PageKey =
  | 'no_price'
  | 'missing_price_routes'
  | 'overview'
  | 'top_queries';
export type ReportMode = 'international' | 'domestic';
