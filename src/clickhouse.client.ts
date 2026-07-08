import { createClient } from '@clickhouse/client';

import type { EnvConfig } from './config.js';

export function create_clickhouse_client(config: EnvConfig) {
  return createClient({
    url: config.clickhouse_url,
    username: config.clickhouse_username,
    password: config.clickhouse_password,
    database: config.clickhouse_database,
    clickhouse_settings: {
      readonly: '1',
    },
  });
}

export async function run_query<T>(
  query_client: ReturnType<typeof create_clickhouse_client>,
  query: string,
  query_params: Record<string, string | number | string[]>,
): Promise<T[]> {
  const result_set = await query_client.query({
    query,
    format: 'JSONEachRow',
    query_params,
  });

  return result_set.json<T>();
}
