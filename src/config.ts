import { config as load_env } from 'dotenv';

load_env();

export interface EnvConfig {
  clickhouse_url: string;
  clickhouse_username: string;
  clickhouse_password: string;
  clickhouse_database: string;
  clickhouse_table: string;
  clickhouse_date_column: string | null;
  date_from: string | null;
  date_to: string | null;
  top_countries_limit: number;
  top_rows_limit: number;
  output_directory: string;
}

const TABLE_PATTERN = /^[a-zA-Z0-9_.]+$/;
const COLUMN_PATTERN = /^[a-zA-Z0-9_]+$/;

function get_env(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function get_optional_env(name: string): string | null {
  const value = process.env[name];

  if (!value) {
    return null;
  }

  return value;
}

function get_number_env(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed_value = Number(value);

  if (!Number.isInteger(parsed_value) || parsed_value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }

  return parsed_value;
}

function validate_identifier(value: string, name: string, pattern: RegExp): string {
  if (!pattern.test(value)) {
    throw new Error(`Environment variable ${name} contains invalid characters`);
  }

  return value;
}

function validate_date_range(
  date_from: string | null,
  date_to: string | null,
  clickhouse_date_column: string | null,
): void {
  if (!date_from && !date_to) {
    return;
  }

  if (!clickhouse_date_column) {
    throw new Error(
      'CLICKHOUSE_DATE_COLUMN is required when DATE_FROM or DATE_TO is set',
    );
  }
}

export function get_config(): EnvConfig {
  const clickhouse_table = validate_identifier(
    get_env('CLICKHOUSE_TABLE'),
    'CLICKHOUSE_TABLE',
    TABLE_PATTERN,
  );
  const clickhouse_date_column = get_optional_env('CLICKHOUSE_DATE_COLUMN');

  if (clickhouse_date_column) {
    validate_identifier(
      clickhouse_date_column,
      'CLICKHOUSE_DATE_COLUMN',
      COLUMN_PATTERN,
    );
  }

  const date_from = get_optional_env('DATE_FROM');
  const date_to = get_optional_env('DATE_TO');

  validate_date_range(date_from, date_to, clickhouse_date_column);

  return {
    clickhouse_url: get_env('CLICKHOUSE_URL'),
    clickhouse_username: get_env('CLICKHOUSE_USERNAME'),
    clickhouse_password: process.env.CLICKHOUSE_PASSWORD ?? '',
    clickhouse_database: get_env('CLICKHOUSE_DATABASE'),
    clickhouse_table,
    clickhouse_date_column,
    date_from,
    date_to,
    top_countries_limit: get_number_env('TOP_COUNTRIES_LIMIT', 20),
    top_rows_limit: get_number_env('TOP_ROWS_LIMIT', 100),
    output_directory: 'output',
  };
}
