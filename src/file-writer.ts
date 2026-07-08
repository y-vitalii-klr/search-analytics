import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  ManifestEntry,
  ManifestFile,
  PeriodCatalogEntry,
  PeriodCatalogFile,
  ReportFile,
} from './types.js';

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

export async function reset_period_directory(
  output_directory: string,
  period_slug: string,
): Promise<string> {
  const period_directory = path.join(output_directory, 'periods', period_slug);

  await rm(period_directory, { recursive: true, force: true });
  await mkdir(period_directory, { recursive: true });

  return period_directory;
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

function get_period_label(
  date_from: string | null,
  date_to: string | null,
): string {
  if (!date_from && !date_to) {
    return 'За весь час';
  }

  return `${date_from ?? '...'} - ${date_to ?? '...'}`;
}

async function read_period_manifest(
  output_directory: string,
  period_slug: string,
): Promise<ManifestFile | null> {
  const manifest_path = path.join(
    output_directory,
    'periods',
    period_slug,
    '_meta',
    'index.json',
  );

  try {
    const content = await readFile(manifest_path, 'utf8');

    return JSON.parse(content) as ManifestFile;
  } catch {
    return null;
  }
}

export async function write_period_catalog(
  output_directory: string,
  current_period_slug: string,
): Promise<void> {
  const periods_directory = path.join(output_directory, 'periods');

  await mkdir(periods_directory, { recursive: true });

  const period_slugs = await readdir(periods_directory);
  const periods: PeriodCatalogEntry[] = [];

  for (const period_slug of period_slugs) {
    const manifest = await read_period_manifest(output_directory, period_slug);

    if (!manifest) {
      continue;
    }

    periods.push({
      period_slug,
      label: get_period_label(
        manifest.metadata.period.date_from,
        manifest.metadata.period.date_to,
      ),
      date_from: manifest.metadata.period.date_from,
      date_to: manifest.metadata.period.date_to,
      generated_at: manifest.metadata.generated_at,
      top_countries_limit: manifest.metadata.top_countries_limit,
      top_rows_limit: manifest.metadata.top_rows_limit,
      manifest_path: `periods/${period_slug}/_meta/index.json`,
    });
  }

  periods.sort((left, right) => left.label.localeCompare(right.label));

  const catalog: PeriodCatalogFile = {
    periods,
    default_period_slug: current_period_slug,
  };

  const meta_directory = path.join(output_directory, '_meta');

  await mkdir(meta_directory, { recursive: true });
  await writeFile(
    path.join(meta_directory, 'index.json'),
    JSON.stringify(catalog, null, 2),
  );
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
