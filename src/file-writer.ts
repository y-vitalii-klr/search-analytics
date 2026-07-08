import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ManifestEntry, ManifestFile, ReportFile } from './types.js';

function get_output_path(
  output_directory: string,
  relative_file_path: string,
): string {
  return path.join(output_directory, relative_file_path);
}

export async function reset_output_directory(output_directory: string): Promise<void> {
  await rm(output_directory, { recursive: true, force: true });
  await mkdir(output_directory, { recursive: true });
}

export async function write_report_file<T>(
  output_directory: string,
  relative_file_path: string,
  report_file: ReportFile<T>,
): Promise<void> {
  const output_path = get_output_path(output_directory, relative_file_path);

  await mkdir(path.dirname(output_path), { recursive: true });
  await writeFile(output_path, JSON.stringify(report_file, null, 2));
}

export async function write_manifest_file(
  output_directory: string,
  manifest: ManifestFile,
): Promise<void> {
  await write_report_file(output_directory, '_meta/manifest.json', {
    metadata: {
      report_key: 'manifest',
      report_type: 'manifest',
      generated_at: manifest.metadata.generated_at,
      period: manifest.metadata.period,
      filters: {
        top_countries_limit: manifest.metadata.top_countries_limit,
        top_rows_limit: manifest.metadata.top_rows_limit,
      },
    },
    summary: {
      rows: manifest.reports.length,
      searches_total: manifest.countries.length,
      searches_without_price: 0,
    },
    data: manifest.reports,
  });

  const output_path = get_output_path(output_directory, '_meta/index.json');

  await writeFile(output_path, JSON.stringify(manifest, null, 2));
}

export function create_manifest_entry(
  report_key: string,
  report_type: string,
  file_path: string,
  origin_country_name: string | null,
  destination_country_name: string | null,
): ManifestEntry {
  return {
    report_key,
    report_type,
    file_path,
    origin_country_name,
    destination_country_name,
  };
}
