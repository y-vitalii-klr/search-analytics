import { load_reports } from '../data/load-reports';
import type {
  AppReport,
  CountryCoverageReport,
  GlobalStatsReport,
  ManifestEntry,
  RouteReport,
  TopCountriesReport,
} from '../types';

interface ReportsStore {
  manifest: ReturnType<typeof load_reports>['manifest'];
  reports_by_key: Map<string, AppReport>;
  get_reports_by_type: (report_type: string) => ManifestEntry[];
  get_route_report: (report_key: string) => RouteReport | null;
  get_global_stats: () => GlobalStatsReport | null;
  get_country_coverage: () => CountryCoverageReport | null;
  get_top_countries: () => TopCountriesReport | null;
  get_origin_country_distribution: () => CountryCoverageReport | null;
  get_destination_country_distribution: () => CountryCoverageReport | null;
}

function create_reports_store(): ReportsStore {
  const { manifest, reports_by_file_path } = load_reports();
  const reports_by_key = new Map<string, AppReport>();

  manifest.reports.forEach((report_entry) => {
    const report = reports_by_file_path.get(report_entry.file_path);

    if (report) {
      reports_by_key.set(report_entry.report_key, report);
    }
  });

  return {
    manifest,
    reports_by_key,
    get_reports_by_type(report_type) {
      return manifest.reports.filter((report) => report.report_type === report_type);
    },
    get_route_report(report_key) {
      const report = reports_by_key.get(report_key);

      if (!report) {
        return null;
      }

      return report as RouteReport;
    },
    get_global_stats() {
      const report = reports_by_key.get('global-stats');

      if (!report) {
        return null;
      }

      return report as GlobalStatsReport;
    },
    get_country_coverage() {
      const report = reports_by_key.get('country-coverage');

      if (!report) {
        return null;
      }

      return report as CountryCoverageReport;
    },
    get_top_countries() {
      const report = reports_by_key.get('top-countries');

      if (!report) {
        return null;
      }

      return report as TopCountriesReport;
    },
    get_origin_country_distribution() {
      const report = reports_by_key.get('origin-country-distribution');

      if (!report) {
        return null;
      }

      return report as CountryCoverageReport;
    },
    get_destination_country_distribution() {
      const report = reports_by_key.get('destination-country-distribution');

      if (!report) {
        return null;
      }

      return report as CountryCoverageReport;
    },
  };
}

export const reports_store = create_reports_store();
