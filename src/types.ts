export interface CountryRow {
  country_name: string;
  total_searches: number;
  searches_without_price: number;
  with_price_share: number;
  without_price_share: number;
}

export interface RouteRow {
  origin_city_name: string;
  destination_city_name: string;
  origin_country_name?: string;
  destination_country_name?: string;
  count: number;
}

export interface Summary {
  rows: number;
  searches_total: number;
  searches_without_price: number;
}

export interface RouteSummaryRow {
  total_searches: number;
  searches_without_price: number;
}

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

export interface ReportFile<T> {
  metadata: ReportMetadata;
  summary: Summary;
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

export interface CountryCoverageRow {
  country_name: string;
  total_searches: number;
  searches_without_price: number;
  with_price_share: number;
  without_price_share: number;
}

export interface GlobalStatsRow {
  scope: string;
  total_searches: number;
  searches_without_price: number;
  with_price_share: number;
  without_price_share: number;
}
