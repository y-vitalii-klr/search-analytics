import manifest_json from '../../../output/_meta/index.json';

import type { AppReport, ManifestFile } from '../types';

const report_modules = import.meta.glob('../../../output/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, AppReport | ManifestFile>;

function normalize_file_path(module_path: string): string {
  return module_path.replace('../../../output/', '');
}

export function load_reports() {
  const manifest = manifest_json as ManifestFile;
  const reports_by_file_path = new Map<string, AppReport>();

  Object.entries(report_modules).forEach(([module_path, report]) => {
    const file_path = normalize_file_path(module_path);

    if (file_path === '_meta/index.json' || file_path === '_meta/manifest.json') {
      return;
    }

    reports_by_file_path.set(file_path, report as AppReport);
  });

  return {
    manifest,
    reports_by_file_path,
  };
}
