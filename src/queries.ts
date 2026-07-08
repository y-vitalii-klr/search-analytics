import type { EnvConfig } from './config.js';

interface QueryDefinition {
  query: string;
  query_params: Record<string, string | number>;
}

function get_where_clause(config: EnvConfig): QueryDefinition {
  const clauses: string[] = [];
  const query_params: Record<string, string | number> = {};

  if (config.date_from) {
    clauses.push(`${config.clickhouse_date_column} >= {date_from:String}`);
    query_params.date_from = config.date_from;
  }

  if (config.date_to) {
    clauses.push(`${config.clickhouse_date_column} <= {date_to:String}`);
    query_params.date_to = config.date_to;
  }

  return {
    query: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    query_params,
  };
}

function get_share_expression(numerator: string, denominator: string): string {
  return `if(${denominator} = 0, 0, round(${numerator} / ${denominator}, 6))`;
}

function escape_sql_string(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function get_country_names_list(country_names: string[]): string {
  return country_names
    .map((country_name) => `'${escape_sql_string(country_name)}'`)
    .join(', ');
}

export function build_top_countries_query(config: EnvConfig): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      WITH routes AS (
        SELECT
          origin_country_name,
          destination_country_name,
          origin_city_name,
          destination_city_name,
          count() AS route_searches_total,
          countIf(min_price IS NOT NULL) AS route_searches_with_price
        FROM ${config.clickhouse_table}
        ${where_clause.query}
        GROUP BY
          origin_country_name,
          destination_country_name,
          origin_city_name,
          destination_city_name
      ),
      base AS (
        SELECT
          arrayJoin(
            arrayDistinct([origin_country_name, destination_country_name])
          ) AS country_name,
          route_searches_total,
          route_searches_with_price
        FROM routes
      )
      SELECT
        country_name,
        sum(route_searches_total) AS total_searches,
        sumIf(route_searches_total, route_searches_with_price = 0) AS searches_without_price,
        ${get_share_expression(
          'sum(route_searches_total) - sumIf(route_searches_total, route_searches_with_price = 0)',
          'sum(route_searches_total)',
        )} AS with_price_share,
        ${get_share_expression(
          'sumIf(route_searches_total, route_searches_with_price = 0)',
          'sum(route_searches_total)',
        )} AS without_price_share
      FROM base
      WHERE country_name != ''
      GROUP BY country_name
      ORDER BY total_searches DESC, country_name ASC
      LIMIT {top_countries_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      top_countries_limit: config.top_countries_limit,
    },
  };
}

export function build_country_pair_no_price_query(
  config: EnvConfig,
  origin_country_name: string,
  destination_country_name: string,
): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      SELECT
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name,
        count() AS count
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        origin_country_name = {origin_country_name:String}
        AND destination_country_name = {destination_country_name:String}
        AND min_price IS NULL
      GROUP BY
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name
      ORDER BY count DESC, origin_city_name ASC, destination_city_name ASC
      LIMIT {top_rows_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      origin_country_name,
      destination_country_name,
      top_rows_limit: config.top_rows_limit,
    },
  };
}

export function build_country_pair_missing_price_routes_query(
  config: EnvConfig,
  origin_country_name: string,
  destination_country_name: string,
): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      SELECT
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name,
        count() AS count
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        origin_country_name = {origin_country_name:String}
        AND destination_country_name = {destination_country_name:String}
      GROUP BY
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name
      HAVING countIf(min_price IS NOT NULL) = 0
      ORDER BY count DESC, origin_city_name ASC, destination_city_name ASC
      LIMIT {top_rows_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      origin_country_name,
      destination_country_name,
      top_rows_limit: config.top_rows_limit,
    },
  };
}

export function build_country_pair_top_queries(
  config: EnvConfig,
  origin_country_name: string,
  destination_country_name: string,
): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      SELECT
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name,
        count() AS count
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        origin_country_name = {origin_country_name:String}
        AND destination_country_name = {destination_country_name:String}
      GROUP BY
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name
      ORDER BY count DESC, origin_city_name ASC, destination_city_name ASC
      LIMIT {top_rows_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      origin_country_name,
      destination_country_name,
      top_rows_limit: config.top_rows_limit,
    },
  };
}

export function build_domestic_no_price_query(
  config: EnvConfig,
  country_name: string,
): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      SELECT
        origin_city_name,
        destination_city_name,
        count() AS count
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        origin_country_name = {country_name:String}
        AND destination_country_name = {country_name:String}
        AND min_price IS NULL
      GROUP BY origin_city_name, destination_city_name
      ORDER BY count DESC, origin_city_name ASC, destination_city_name ASC
      LIMIT {top_rows_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      country_name,
      top_rows_limit: config.top_rows_limit,
    },
  };
}

export function build_domestic_missing_price_routes_query(
  config: EnvConfig,
  country_name: string,
): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      SELECT
        origin_city_name,
        destination_city_name,
        count() AS count
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        origin_country_name = {country_name:String}
        AND destination_country_name = {country_name:String}
      GROUP BY origin_city_name, destination_city_name
      HAVING countIf(min_price IS NOT NULL) = 0
      ORDER BY count DESC, origin_city_name ASC, destination_city_name ASC
      LIMIT {top_rows_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      country_name,
      top_rows_limit: config.top_rows_limit,
    },
  };
}

export function build_domestic_top_queries(
  config: EnvConfig,
  country_name: string,
): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      SELECT
        origin_city_name,
        destination_city_name,
        count() AS count
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        origin_country_name = {country_name:String}
        AND destination_country_name = {country_name:String}
      GROUP BY origin_city_name, destination_city_name
      ORDER BY count DESC, origin_city_name ASC, destination_city_name ASC
      LIMIT {top_rows_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      country_name,
      top_rows_limit: config.top_rows_limit,
    },
  };
}

export function build_country_pair_summary_query(
  config: EnvConfig,
  origin_country_name: string,
  destination_country_name: string,
): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      SELECT
        count() AS total_searches,
        countIf(min_price IS NULL) AS searches_without_price
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        origin_country_name = {origin_country_name:String}
        AND destination_country_name = {destination_country_name:String}
    `,
    query_params: {
      ...where_clause.query_params,
      origin_country_name,
      destination_country_name,
    },
  };
}

export function build_country_to_any_query(
  config: EnvConfig,
  country_name: string,
  direction: 'origin' | 'destination',
  only_without_price: boolean,
): QueryDefinition {
  const where_clause = get_where_clause(config);
  const country_filter =
    direction === 'origin'
      ? `
        origin_country_name = {country_name:String}
        AND destination_country_name != {country_name:String}
      `
      : `
        origin_country_name != {country_name:String}
        AND destination_country_name = {country_name:String}
      `;
  const without_price_filter = only_without_price ? 'AND min_price IS NULL' : '';

  return {
    query: `
      SELECT
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name,
        count() AS count
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        ${country_filter}
        ${without_price_filter}
      GROUP BY
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name
      ORDER BY count DESC, origin_city_name ASC, destination_city_name ASC
      LIMIT {top_rows_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      country_name,
      top_rows_limit: config.top_rows_limit,
    },
  };
}

export function build_country_to_any_missing_price_routes_query(
  config: EnvConfig,
  country_name: string,
  direction: 'origin' | 'destination',
): QueryDefinition {
  const where_clause = get_where_clause(config);
  const country_filter =
    direction === 'origin'
      ? `
        origin_country_name = {country_name:String}
        AND destination_country_name != {country_name:String}
      `
      : `
        origin_country_name != {country_name:String}
        AND destination_country_name = {country_name:String}
      `;

  return {
    query: `
      SELECT
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name,
        count() AS count
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        ${country_filter}
      GROUP BY
        origin_city_name,
        destination_city_name,
        origin_country_name,
        destination_country_name
      HAVING countIf(min_price IS NOT NULL) = 0
      ORDER BY count DESC, origin_city_name ASC, destination_city_name ASC
      LIMIT {top_rows_limit:UInt32}
    `,
    query_params: {
      ...where_clause.query_params,
      country_name,
      top_rows_limit: config.top_rows_limit,
    },
  };
}

export function build_country_to_any_summary_query(
  config: EnvConfig,
  country_name: string,
  direction: 'origin' | 'destination',
): QueryDefinition {
  const where_clause = get_where_clause(config);
  const country_filter =
    direction === 'origin'
      ? `
        origin_country_name = {country_name:String}
        AND destination_country_name != {country_name:String}
      `
      : `
        origin_country_name != {country_name:String}
        AND destination_country_name = {country_name:String}
      `;

  return {
    query: `
      SELECT
        count() AS total_searches,
        countIf(min_price IS NULL) AS searches_without_price
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        ${country_filter}
    `,
    query_params: {
      ...where_clause.query_params,
      country_name,
    },
  };
}

export function build_domestic_summary_query(
  config: EnvConfig,
  country_name: string,
): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      SELECT
        count() AS total_searches,
        countIf(min_price IS NULL) AS searches_without_price
      FROM ${config.clickhouse_table}
      ${where_clause.query ? `${where_clause.query} AND` : 'WHERE'}
        origin_country_name = {country_name:String}
        AND destination_country_name = {country_name:String}
    `,
    query_params: {
      ...where_clause.query_params,
      country_name,
    },
  };
}

export function build_country_distribution_query(
  config: EnvConfig,
  direction: 'origin' | 'destination',
): QueryDefinition {
  const where_clause = get_where_clause(config);
  const country_column =
    direction === 'origin'
      ? 'origin_country_name'
      : 'destination_country_name';

  return {
    query: `
      WITH routes AS (
        SELECT
          origin_country_name,
          destination_country_name,
          origin_city_name,
          destination_city_name,
          count() AS route_searches_total,
          countIf(min_price IS NOT NULL) AS route_searches_with_price
        FROM ${config.clickhouse_table}
        ${where_clause.query}
        GROUP BY
          origin_country_name,
          destination_country_name,
          origin_city_name,
          destination_city_name
      )
      SELECT
        ${country_column} AS country_name,
        sum(route_searches_total) AS total_searches,
        sumIf(route_searches_total, route_searches_with_price = 0) AS searches_without_price,
        ${get_share_expression(
          'sum(route_searches_total) - sumIf(route_searches_total, route_searches_with_price = 0)',
          'sum(route_searches_total)',
        )} AS with_price_share,
        ${get_share_expression(
          'sumIf(route_searches_total, route_searches_with_price = 0)',
          'sum(route_searches_total)',
        )} AS without_price_share
      FROM routes
      WHERE
        ${country_column} != ''
      GROUP BY ${country_column}
      ORDER BY total_searches DESC, country_name ASC
    `,
    query_params: where_clause.query_params,
  };
}

export function build_country_stats_query(
  config: EnvConfig,
  country_names: string[],
): QueryDefinition {
  const where_clause = get_where_clause(config);
  const country_names_list = get_country_names_list(country_names);

  return {
    query: `
      WITH routes AS (
        SELECT
          origin_country_name,
          destination_country_name,
          origin_city_name,
          destination_city_name,
          count() AS route_searches_total,
          countIf(min_price IS NOT NULL) AS route_searches_with_price
        FROM ${config.clickhouse_table}
        ${where_clause.query}
        GROUP BY
          origin_country_name,
          destination_country_name,
          origin_city_name,
          destination_city_name
      ),
      base AS (
        SELECT
          arrayJoin(
            arrayDistinct([origin_country_name, destination_country_name])
          ) AS country_name,
          route_searches_total,
          route_searches_with_price
        FROM routes
      )
      SELECT
        country_name,
        sum(route_searches_total) AS total_searches,
        sumIf(route_searches_total, route_searches_with_price = 0) AS searches_without_price,
        ${get_share_expression(
          'sum(route_searches_total) - sumIf(route_searches_total, route_searches_with_price = 0)',
          'sum(route_searches_total)',
        )} AS with_price_share,
        ${get_share_expression(
          'sumIf(route_searches_total, route_searches_with_price = 0)',
          'sum(route_searches_total)',
        )} AS without_price_share
      FROM base
      WHERE country_name IN (${country_names_list})
      GROUP BY country_name
      ORDER BY total_searches DESC, country_name ASC
    `,
    query_params: where_clause.query_params,
  };
}

export function build_global_stats_query(config: EnvConfig): QueryDefinition {
  const where_clause = get_where_clause(config);

  return {
    query: `
      WITH routes AS (
        SELECT
          origin_country_name,
          destination_country_name,
          origin_city_name,
          destination_city_name,
          count() AS route_searches_total,
          countIf(min_price IS NOT NULL) AS route_searches_with_price
        FROM ${config.clickhouse_table}
        ${where_clause.query}
        GROUP BY
          origin_country_name,
          destination_country_name,
          origin_city_name,
          destination_city_name
      )
      SELECT
        'global' AS scope,
        sum(route_searches_total) AS total_searches,
        sumIf(route_searches_total, route_searches_with_price = 0) AS searches_without_price,
        ${get_share_expression(
          'sum(route_searches_total) - sumIf(route_searches_total, route_searches_with_price = 0)',
          'sum(route_searches_total)',
        )} AS with_price_share,
        ${get_share_expression(
          'sumIf(route_searches_total, route_searches_with_price = 0)',
          'sum(route_searches_total)',
        )} AS without_price_share
      FROM routes
    `,
    query_params: where_clause.query_params,
  };
}
