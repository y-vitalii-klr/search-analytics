import { load_reports } from '../data/load-reports';
import type {
  AppReport,
  CountryCoverageReport,
  GlobalStatsReport,
  ManifestEntry,
  ManifestFile,
  PeriodCatalogEntry,
  RouteReport,
  TopCountriesReport,
} from '../types';

interface ReportsStore {
  catalog: ReturnType<typeof load_reports>['catalog'];
  manifests_by_period_slug: Map<string, ManifestFile>;
  reports_by_period_and_key: Map<string, AppReport>;
  get_default_period_slug: () => string | null;
  get_periods: () => PeriodCatalogEntry[];
  get_manifest: (period_slug: string) => ManifestFile | null;
  get_reports_by_type: (
    period_slug: string,
    report_type: string,
  ) => ManifestEntry[];
  get_route_report: (period_slug: string, report_key: string) => RouteReport | null;
  get_global_stats: (period_slug: string) => GlobalStatsReport | null;
  get_country_coverage: (period_slug: string) => CountryCoverageReport | null;
  get_top_countries: (period_slug: string) => TopCountriesReport | null;
  get_origin_country_distribution: (
    period_slug: string,
  ) => CountryCoverageReport | null;
  get_destination_country_distribution: (
    period_slug: string,
  ) => CountryCoverageReport | null;
}

function create_reports_store(): ReportsStore {
  const { catalog, manifests_by_period_slug, reports_by_period_and_file_path } =
    load_reports();
  const reports_by_period_and_key = new Map<string, AppReport>();

  manifests_by_period_slug.forEach((manifest, period_slug) => {
    manifest.reports.forEach((report_entry) => {
      const report = reports_by_period_and_file_path.get(
        `${period_slug}:${report_entry.file_path}`,
      );

      if (report) {
        reports_by_period_and_key.set(
          `${period_slug}:${report_entry.report_key}`,
          report,
        );
      }
    });
  });

  return {
    catalog,
    manifests_by_period_slug,
    reports_by_period_and_key,
    get_default_period_slug() {
      return catalog.default_period_slug ?? catalog.periods[0]?.period_slug ?? null;
    },
    get_periods() {
      return catalog.periods;
    },
    get_manifest(period_slug) {
      return manifests_by_period_slug.get(period_slug) ?? null;
    },
    get_reports_by_type(period_slug, report_type) {
      const manifest = manifests_by_period_slug.get(period_slug);

      if (!manifest) {
        return [];
      }

      return manifest.reports.filter((report) => report.report_type === report_type);
    },
    get_route_report(period_slug, report_key) {
      const report = reports_by_period_and_key.get(`${period_slug}:${report_key}`);

      if (!report) {
        return null;
      }

      return report as RouteReport;
    },
    get_global_stats(period_slug) {
      const report = reports_by_period_and_key.get(`${period_slug}:global-stats`);

      if (!report) {
        return null;
      }

      return report as GlobalStatsReport;
    },
    get_country_coverage(period_slug) {
      const report = reports_by_period_and_key.get(`${period_slug}:country-coverage`);

      if (!report) {
        return null;
      }

      return report as CountryCoverageReport;
    },
    get_top_countries(period_slug) {
      const report = reports_by_period_and_key.get(`${period_slug}:top-countries`);

      if (!report) {
        return null;
      }

      return report as TopCountriesReport;
    },
    get_origin_country_distribution(period_slug) {
      const report = reports_by_period_and_key.get(
        `${period_slug}:origin-country-distribution`,
      );

      if (!report) {
        return null;
      }

      return report as CountryCoverageReport;
    },
    get_destination_country_distribution(period_slug) {
      const report = reports_by_period_and_key.get(
        `${period_slug}:destination-country-distribution`,
      );

      if (!report) {
        return null;
      }

      return report as CountryCoverageReport;
    },
  };
}

export const reports_store = create_reports_store();
