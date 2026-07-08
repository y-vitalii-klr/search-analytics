import path from 'node:path';
import process from 'node:process';

import { create_clickhouse_client, run_query } from './clickhouse.client.js';
import { get_config } from './config.js';
import {
  create_manifest_entry,
  reset_period_directory,
  write_manifest_file,
  write_period_catalog,
  write_report_file,
} from './file-writer.js';
import {
  build_country_pair_no_price_query,
  build_country_pair_missing_price_routes_query,
  build_country_pair_summary_query,
  build_country_pair_top_queries,
  build_country_to_any_query,
  build_country_to_any_missing_price_routes_query,
  build_country_to_any_summary_query,
  build_country_distribution_query,
  build_country_stats_query,
  build_domestic_missing_price_routes_query,
  build_domestic_no_price_query,
  build_domestic_summary_query,
  build_domestic_top_queries,
  build_global_stats_query,
  build_top_countries_query,
} from './queries.js';
import type {
  CountryCoverageRow,
  CountryRow,
  GlobalStatsRow,
  ManifestFile,
  ReportFile,
  RouteRow,
  RouteSummaryRow,
  Summary,
} from './types.js';

function get_slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function get_period_slug(
  date_from: string | null,
  date_to: string | null,
): string {
  if (!date_from && !date_to) {
    return 'all-time';
  }

  const normalized_from = (date_from ?? 'open')
    .replace(/[^0-9a-zA-Z]+/g, '-')
    .toLowerCase();
  const normalized_to = (date_to ?? 'open')
    .replace(/[^0-9a-zA-Z]+/g, '-')
    .toLowerCase();

  return `${normalized_from}_to_${normalized_to}`;
}

function get_summary_from_rows(
  rows: RouteRow[],
  route_summary: RouteSummaryRow,
): Summary {
  return {
    rows: rows.length,
    searches_total: route_summary.total_searches,
    searches_without_price: route_summary.searches_without_price,
  };
}

function get_summary_from_country_rows(rows: CountryCoverageRow[]): Summary {
  const searches_total = rows.reduce(
    (total, row) => total + row.total_searches,
    0,
  );
  const searches_without_price = rows.reduce(
    (total, row) => total + row.searches_without_price,
    0,
  );

  return {
    rows: rows.length,
    searches_total,
    searches_without_price,
  };
}

function create_route_report(
  report_key: string,
  report_type: string,
  generated_at: string,
  date_from: string | null,
  date_to: string | null,
  filters: Record<string, boolean | number | string | null>,
  route_summary: RouteSummaryRow,
  rows: RouteRow[],
): ReportFile<RouteRow> {
  return {
    metadata: {
      report_key,
      report_type,
      generated_at,
      period: {
        date_from,
        date_to,
      },
      filters,
    },
    summary: get_summary_from_rows(rows, route_summary),
    data: rows,
  };
}

function create_country_report(
  report_key: string,
  report_type: string,
  generated_at: string,
  date_from: string | null,
  date_to: string | null,
  filters: Record<string, boolean | number | string | null>,
  rows: CountryCoverageRow[],
): ReportFile<CountryCoverageRow> {
  return {
    metadata: {
      report_key,
      report_type,
      generated_at,
      period: {
        date_from,
        date_to,
      },
      filters,
    },
    summary: get_summary_from_country_rows(rows),
    data: rows,
  };
}

function normalize_route_rows(rows: RouteRow[]): RouteRow[] {
  return rows.map((row) => ({
    ...row,
    count: Number(row.count),
  }));
}

function normalize_country_rows(rows: CountryRow[]): CountryCoverageRow[] {
  return rows.map((row) => ({
    country_name: row.country_name,
    total_searches: Number(row.total_searches),
    searches_without_price: Number(row.searches_without_price),
    with_price_share: Number(row.with_price_share),
    without_price_share: Number(row.without_price_share),
  }));
}

function normalize_global_rows(rows: GlobalStatsRow[]): GlobalStatsRow[] {
  return rows.map((row) => ({
    scope: row.scope,
    total_searches: Number(row.total_searches),
    searches_without_price: Number(row.searches_without_price),
    with_price_share: Number(row.with_price_share),
    without_price_share: Number(row.without_price_share),
  }));
}

function normalize_route_summary_row(row: RouteSummaryRow | undefined): RouteSummaryRow {
  return {
    total_searches: Number(row?.total_searches ?? 0),
    searches_without_price: Number(row?.searches_without_price ?? 0),
  };
}

async function create_route_report_bundle(
  output_directory: string,
  manifest: ManifestFile,
  generated_at: string,
  date_from: string | null,
  date_to: string | null,
  no_price_key: string,
  no_price_path: string,
  top_queries_key: string,
  top_queries_path: string,
  manifest_origin_country_name: string,
  manifest_destination_country_name: string,
  no_price_filters: Record<string, boolean | number | string | null>,
  top_queries_filters: Record<string, boolean | number | string | null>,
  route_summary: RouteSummaryRow,
  no_price_rows: RouteRow[],
  top_queries_rows: RouteRow[],
): Promise<void> {
  await write_report_file(
    output_directory,
    no_price_path,
    create_route_report(
      no_price_key,
      'country_pair_no_price',
      generated_at,
      date_from,
      date_to,
      no_price_filters,
      route_summary,
      no_price_rows,
    ),
  );
  manifest.reports.push(
    create_manifest_entry(
      no_price_key,
      'country_pair_no_price',
      no_price_path,
      manifest_origin_country_name,
      manifest_destination_country_name,
    ),
  );

  await write_report_file(
    output_directory,
    top_queries_path,
    create_route_report(
      top_queries_key,
      'country_pair_top_queries',
      generated_at,
      date_from,
      date_to,
      top_queries_filters,
      route_summary,
      top_queries_rows,
    ),
  );
  manifest.reports.push(
    create_manifest_entry(
      top_queries_key,
      'country_pair_top_queries',
      top_queries_path,
      manifest_origin_country_name,
      manifest_destination_country_name,
    ),
  );
}

async function create_missing_price_report(
  output_directory: string,
  manifest: ManifestFile,
  report_key: string,
  report_type: string,
  file_path: string,
  generated_at: string,
  date_from: string | null,
  date_to: string | null,
  filters: Record<string, boolean | number | string | null>,
  origin_country_name: string,
  destination_country_name: string,
  rows: RouteRow[],
): Promise<void> {
  const searches_total = rows.reduce((total, row) => total + row.count, 0);

  await write_report_file(
    output_directory,
    file_path,
    create_route_report(
      report_key,
      report_type,
      generated_at,
      date_from,
      date_to,
      filters,
      {
        total_searches: searches_total,
        searches_without_price: searches_total,
      },
      rows,
    ),
  );
  manifest.reports.push(
    create_manifest_entry(
      report_key,
      report_type,
      file_path,
      origin_country_name,
      destination_country_name,
    ),
  );
}

async function main(): Promise<void> {
  const config = get_config();
  const output_directory = path.join(process.cwd(), config.output_directory);
  const period_slug = get_period_slug(config.date_from, config.date_to);
  const period_output_directory = await reset_period_directory(
    output_directory,
    period_slug,
  );
  const generated_at = new Date().toISOString();
  const query_client = create_clickhouse_client(config);

  const top_countries_result = build_top_countries_query(config);
  const top_countries_rows = normalize_country_rows(
    await run_query<CountryRow>(
      query_client,
      top_countries_result.query,
      top_countries_result.query_params,
    ),
  );
  const top_countries = top_countries_rows.map((row) => row.country_name);

  const manifest: ManifestFile = {
    period_slug,
    metadata: {
      generated_at,
      period: {
        date_from: config.date_from,
        date_to: config.date_to,
      },
      top_countries_limit: config.top_countries_limit,
      top_rows_limit: config.top_rows_limit,
    },
    countries: top_countries,
    reports: [],
  };

  await write_report_file(period_output_directory, 'stats/top-countries.json', {
    metadata: {
      report_key: 'top-countries',
      report_type: 'top_countries',
      generated_at,
      period: {
        date_from: config.date_from,
        date_to: config.date_to,
      },
      filters: {
        top_countries_limit: config.top_countries_limit,
      },
    },
    summary: get_summary_from_country_rows(top_countries_rows),
    data: top_countries_rows,
  });
  manifest.reports.push(
    create_manifest_entry(
      'top-countries',
      'top_countries',
      'stats/top-countries.json',
      null,
      null,
    ),
  );

  for (const country_name of top_countries) {
    const country_slug = get_slug(country_name);
    const domestic_summary_result = build_domestic_summary_query(
      config,
      country_name,
    );
    const domestic_summary = normalize_route_summary_row(
      (
        await run_query<RouteSummaryRow>(
          query_client,
          domestic_summary_result.query,
          domestic_summary_result.query_params,
        )
      )[0],
    );

    const domestic_no_price_result = build_domestic_no_price_query(
      config,
      country_name,
    );
    const domestic_no_price_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        domestic_no_price_result.query,
        domestic_no_price_result.query_params,
      ),
    );
    const domestic_no_price_path =
      `domestic/no-price/${country_slug}.json`;
    const domestic_no_price_key = `domestic-no-price-${country_slug}`;

    await write_report_file(
      period_output_directory,
      domestic_no_price_path,
      create_route_report(
        domestic_no_price_key,
        'domestic_no_price',
        generated_at,
        config.date_from,
        config.date_to,
        {
          country_name,
          has_price: false,
          limit: config.top_rows_limit,
        },
        domestic_summary,
        domestic_no_price_rows,
      ),
    );
    manifest.reports.push(
      create_manifest_entry(
        domestic_no_price_key,
        'domestic_no_price',
        domestic_no_price_path,
        country_name,
        country_name,
      ),
    );

    const domestic_top_queries_result = build_domestic_top_queries(
      config,
      country_name,
    );
    const domestic_top_queries_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        domestic_top_queries_result.query,
        domestic_top_queries_result.query_params,
      ),
    );
    const domestic_top_queries_path =
      `domestic/top-queries/${country_slug}.json`;
    const domestic_top_queries_key = `domestic-top-queries-${country_slug}`;

    await write_report_file(
      period_output_directory,
      domestic_top_queries_path,
      create_route_report(
        domestic_top_queries_key,
        'domestic_top_queries',
        generated_at,
        config.date_from,
        config.date_to,
        {
          country_name,
          limit: config.top_rows_limit,
        },
        domestic_summary,
        domestic_top_queries_rows,
      ),
    );
    manifest.reports.push(
      create_manifest_entry(
        domestic_top_queries_key,
        'domestic_top_queries',
        domestic_top_queries_path,
        country_name,
        country_name,
      ),
    );

    const domestic_missing_price_routes_result =
      build_domestic_missing_price_routes_query(config, country_name);
    const domestic_missing_price_routes_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        domestic_missing_price_routes_result.query,
        domestic_missing_price_routes_result.query_params,
      ),
    );

    await create_missing_price_report(
      period_output_directory,
      manifest,
      `domestic-missing-price-routes-${country_slug}`,
      'domestic_missing_price_routes',
      `domestic/missing-price-routes/${country_slug}.json`,
      generated_at,
      config.date_from,
      config.date_to,
      {
        country_name,
        no_price_route_only: true,
        limit: config.top_rows_limit,
      },
      country_name,
      country_name,
      domestic_missing_price_routes_rows,
    );
  }

  const full_matrix_countries = top_countries.slice(0, 5);
  const any_direction_countries = top_countries.slice(5);

  for (const origin_country_name of full_matrix_countries) {
    for (const destination_country_name of full_matrix_countries) {
      if (origin_country_name === destination_country_name) {
        continue;
      }

      const origin_slug = get_slug(origin_country_name);
      const destination_slug = get_slug(destination_country_name);
      const pair_slug = `${origin_slug}-to-${destination_slug}`;
      const country_pair_summary_result = build_country_pair_summary_query(
        config,
        origin_country_name,
        destination_country_name,
      );
      const country_pair_summary = normalize_route_summary_row(
        (
          await run_query<RouteSummaryRow>(
            query_client,
            country_pair_summary_result.query,
            country_pair_summary_result.query_params,
          )
        )[0],
      );

      const country_pair_no_price_result = build_country_pair_no_price_query(
        config,
        origin_country_name,
        destination_country_name,
      );
      const country_pair_no_price_rows = normalize_route_rows(
        await run_query<RouteRow>(
          query_client,
          country_pair_no_price_result.query,
          country_pair_no_price_result.query_params,
        ),
      );

      const country_pair_top_queries_result = build_country_pair_top_queries(
        config,
        origin_country_name,
        destination_country_name,
      );
      const country_pair_top_queries_rows = normalize_route_rows(
        await run_query<RouteRow>(
          query_client,
          country_pair_top_queries_result.query,
          country_pair_top_queries_result.query_params,
        ),
      );

      await create_route_report_bundle(
        period_output_directory,
        manifest,
        generated_at,
        config.date_from,
        config.date_to,
        `country-pair-no-price-${pair_slug}`,
        `country-pairs/no-price/${pair_slug}.json`,
        `country-pair-top-queries-${pair_slug}`,
        `country-pairs/top-queries/${pair_slug}.json`,
        origin_country_name,
        destination_country_name,
        {
          origin_country_name,
          destination_country_name,
          has_price: false,
          limit: config.top_rows_limit,
        },
        {
          origin_country_name,
          destination_country_name,
          limit: config.top_rows_limit,
        },
        country_pair_summary,
        country_pair_no_price_rows,
        country_pair_top_queries_rows,
      );

      const country_pair_missing_price_routes_result =
        build_country_pair_missing_price_routes_query(
          config,
          origin_country_name,
          destination_country_name,
        );
      const country_pair_missing_price_routes_rows = normalize_route_rows(
        await run_query<RouteRow>(
          query_client,
          country_pair_missing_price_routes_result.query,
          country_pair_missing_price_routes_result.query_params,
        ),
      );

      await create_missing_price_report(
        period_output_directory,
        manifest,
        `country-pair-missing-price-routes-${pair_slug}`,
        'country_pair_missing_price_routes',
        `country-pairs/missing-price-routes/${pair_slug}.json`,
        generated_at,
        config.date_from,
        config.date_to,
        {
          origin_country_name,
          destination_country_name,
          no_price_route_only: true,
          limit: config.top_rows_limit,
        },
        origin_country_name,
        destination_country_name,
        country_pair_missing_price_routes_rows,
      );
    }
  }

  for (const country_name of any_direction_countries) {
    const country_slug = get_slug(country_name);

    const origin_any_summary_result = build_country_to_any_summary_query(
      config,
      country_name,
      'origin',
    );
    const origin_any_summary = normalize_route_summary_row(
      (
        await run_query<RouteSummaryRow>(
          query_client,
          origin_any_summary_result.query,
          origin_any_summary_result.query_params,
        )
      )[0],
    );
    const origin_any_no_price_result = build_country_to_any_query(
      config,
      country_name,
      'origin',
      true,
    );
    const origin_any_no_price_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        origin_any_no_price_result.query,
        origin_any_no_price_result.query_params,
      ),
    );
    const origin_any_top_queries_result = build_country_to_any_query(
      config,
      country_name,
      'origin',
      false,
    );
    const origin_any_top_queries_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        origin_any_top_queries_result.query,
        origin_any_top_queries_result.query_params,
      ),
    );

    await create_route_report_bundle(
      period_output_directory,
      manifest,
      generated_at,
      config.date_from,
      config.date_to,
      `country-pair-no-price-${country_slug}-to-any`,
      `country-pairs/no-price/${country_slug}-to-any.json`,
      `country-pair-top-queries-${country_slug}-to-any`,
      `country-pairs/top-queries/${country_slug}-to-any.json`,
      country_name,
      'Any',
      {
        origin_country_name: country_name,
        destination_country_name: 'Any',
        has_price: false,
        limit: config.top_rows_limit,
      },
      {
        origin_country_name: country_name,
        destination_country_name: 'Any',
        limit: config.top_rows_limit,
      },
      origin_any_summary,
      origin_any_no_price_rows,
      origin_any_top_queries_rows,
    );

    const origin_any_missing_price_routes_result =
      build_country_to_any_missing_price_routes_query(
        config,
        country_name,
        'origin',
      );
    const origin_any_missing_price_routes_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        origin_any_missing_price_routes_result.query,
        origin_any_missing_price_routes_result.query_params,
      ),
    );

    await create_missing_price_report(
      period_output_directory,
      manifest,
      `country-pair-missing-price-routes-${country_slug}-to-any`,
      'country_pair_missing_price_routes',
      `country-pairs/missing-price-routes/${country_slug}-to-any.json`,
      generated_at,
      config.date_from,
      config.date_to,
      {
        origin_country_name: country_name,
        destination_country_name: 'Any',
        no_price_route_only: true,
        limit: config.top_rows_limit,
      },
      country_name,
      'Any',
      origin_any_missing_price_routes_rows,
    );

    const any_destination_summary_result = build_country_to_any_summary_query(
      config,
      country_name,
      'destination',
    );
    const any_destination_summary = normalize_route_summary_row(
      (
        await run_query<RouteSummaryRow>(
          query_client,
          any_destination_summary_result.query,
          any_destination_summary_result.query_params,
        )
      )[0],
    );
    const any_destination_no_price_result = build_country_to_any_query(
      config,
      country_name,
      'destination',
      true,
    );
    const any_destination_no_price_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        any_destination_no_price_result.query,
        any_destination_no_price_result.query_params,
      ),
    );
    const any_destination_top_queries_result = build_country_to_any_query(
      config,
      country_name,
      'destination',
      false,
    );
    const any_destination_top_queries_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        any_destination_top_queries_result.query,
        any_destination_top_queries_result.query_params,
      ),
    );

    await create_route_report_bundle(
      period_output_directory,
      manifest,
      generated_at,
      config.date_from,
      config.date_to,
      `country-pair-no-price-any-to-${country_slug}`,
      `country-pairs/no-price/any-to-${country_slug}.json`,
      `country-pair-top-queries-any-to-${country_slug}`,
      `country-pairs/top-queries/any-to-${country_slug}.json`,
      'Any',
      country_name,
      {
        origin_country_name: 'Any',
        destination_country_name: country_name,
        has_price: false,
        limit: config.top_rows_limit,
      },
      {
        origin_country_name: 'Any',
        destination_country_name: country_name,
        limit: config.top_rows_limit,
      },
      any_destination_summary,
      any_destination_no_price_rows,
      any_destination_top_queries_rows,
    );

    const any_destination_missing_price_routes_result =
      build_country_to_any_missing_price_routes_query(
        config,
        country_name,
        'destination',
      );
    const any_destination_missing_price_routes_rows = normalize_route_rows(
      await run_query<RouteRow>(
        query_client,
        any_destination_missing_price_routes_result.query,
        any_destination_missing_price_routes_result.query_params,
      ),
    );

    await create_missing_price_report(
      period_output_directory,
      manifest,
      `country-pair-missing-price-routes-any-to-${country_slug}`,
      'country_pair_missing_price_routes',
      `country-pairs/missing-price-routes/any-to-${country_slug}.json`,
      generated_at,
      config.date_from,
      config.date_to,
      {
        origin_country_name: 'Any',
        destination_country_name: country_name,
        no_price_route_only: true,
        limit: config.top_rows_limit,
      },
      'Any',
      country_name,
      any_destination_missing_price_routes_rows,
    );
  }

  const country_stats_result = build_country_stats_query(config, top_countries);
  const country_stats_rows = normalize_country_rows(
    await run_query<CountryRow>(
      query_client,
      country_stats_result.query,
      country_stats_result.query_params,
    ),
  );

  await write_report_file(
    period_output_directory,
    'stats/country-coverage.json',
    create_country_report(
      'country-coverage',
      'country_coverage',
      generated_at,
      config.date_from,
      config.date_to,
      {
        countries_count: top_countries.length,
      },
      country_stats_rows,
    ),
  );
  manifest.reports.push(
    create_manifest_entry(
      'country-coverage',
      'country_coverage',
      'stats/country-coverage.json',
      null,
      null,
    ),
  );

  const global_stats_result = build_global_stats_query(config);
  const global_stats_rows = normalize_global_rows(
    await run_query<GlobalStatsRow>(
      query_client,
      global_stats_result.query,
      global_stats_result.query_params,
    ),
  );
  const global_stats_summary = global_stats_rows[0];

  await write_report_file(period_output_directory, 'stats/global.json', {
    metadata: {
      report_key: 'global-stats',
      report_type: 'global_stats',
      generated_at,
      period: {
        date_from: config.date_from,
        date_to: config.date_to,
      },
      filters: {},
    },
    summary: {
      rows: global_stats_rows.length,
      searches_total: global_stats_summary?.total_searches ?? 0,
      searches_without_price:
        global_stats_summary?.searches_without_price ?? 0,
    },
    data: global_stats_rows,
  });
  manifest.reports.push(
    create_manifest_entry(
      'global-stats',
      'global_stats',
      'stats/global.json',
      null,
      null,
    ),
  );

  const origin_distribution_result = build_country_distribution_query(
    config,
    'origin',
  );
  const origin_distribution_rows = normalize_country_rows(
    await run_query<CountryRow>(
      query_client,
      origin_distribution_result.query,
      origin_distribution_result.query_params,
    ),
  );

  await write_report_file(
    period_output_directory,
    'stats/origin-country-distribution.json',
    create_country_report(
      'origin-country-distribution',
      'origin_country_distribution',
      generated_at,
      config.date_from,
      config.date_to,
      {
        direction: 'origin',
      },
      origin_distribution_rows,
    ),
  );
  manifest.reports.push(
    create_manifest_entry(
      'origin-country-distribution',
      'origin_country_distribution',
      'stats/origin-country-distribution.json',
      null,
      null,
    ),
  );

  const destination_distribution_result = build_country_distribution_query(
    config,
    'destination',
  );
  const destination_distribution_rows = normalize_country_rows(
    await run_query<CountryRow>(
      query_client,
      destination_distribution_result.query,
      destination_distribution_result.query_params,
    ),
  );

  await write_report_file(
    period_output_directory,
    'stats/destination-country-distribution.json',
    create_country_report(
      'destination-country-distribution',
      'destination_country_distribution',
      generated_at,
      config.date_from,
      config.date_to,
      {
        direction: 'destination',
      },
      destination_distribution_rows,
    ),
  );
  manifest.reports.push(
    create_manifest_entry(
      'destination-country-distribution',
      'destination_country_distribution',
      'stats/destination-country-distribution.json',
      null,
      null,
    ),
  );

  await write_manifest_file(period_output_directory, manifest);
  await write_period_catalog(output_directory, period_slug);
  await query_client.close();
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
