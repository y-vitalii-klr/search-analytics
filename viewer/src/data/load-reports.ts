import catalog_json from '../../../output/_meta/index.json';

import type { AppReport, ManifestFile, PeriodCatalogFile } from '../types';

const report_modules = import.meta.glob('../../../output/periods/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, AppReport | ManifestFile>;

function normalize_file_path(module_path: string): string {
  return module_path.replace('../../../output/periods/', '');
}

export function load_reports() {
  const catalog_source = catalog_json as unknown;
  const manifests_by_period_slug = new Map<string, ManifestFile>();
  const reports_by_period_and_file_path = new Map<string, AppReport>();

  Object.entries(report_modules).forEach(([module_path, report]) => {
    const file_path = normalize_file_path(module_path);
    const [period_slug, ...path_parts] = file_path.split('/');
    const relative_file_path = path_parts.join('/');

    if (!period_slug || !relative_file_path) {
      return;
    }

    if (relative_file_path === '_meta/index.json') {
      manifests_by_period_slug.set(period_slug, report as ManifestFile);
      return;
    }

    if (relative_file_path === '_meta/manifest.json') {
      return;
    }

    reports_by_period_and_file_path.set(
      `${period_slug}:${relative_file_path}`,
      report as AppReport,
    );
  });

  const is_period_catalog =
    typeof catalog_source === 'object' &&
    catalog_source !== null &&
    'periods' in catalog_source &&
    'default_period_slug' in catalog_source;
  const catalog: PeriodCatalogFile = is_period_catalog
    ? (catalog_source as PeriodCatalogFile)
    : {
        periods: [],
        default_period_slug: null,
      };

  return {
    catalog,
    manifests_by_period_slug,
    reports_by_period_and_file_path,
  };
}
