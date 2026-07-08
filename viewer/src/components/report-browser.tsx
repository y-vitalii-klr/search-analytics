import { useEffect, useMemo, useState } from 'react';

import {
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Row,
  Segmented,
  Space,
  Table,
  Typography,
} from 'antd';

import { CountryPairTags } from './country-pair-tags';
import { ReportChart } from './report-chart';
import { StatsCards } from './stats-cards';
import { format_number, get_country_pair_label } from '../lib/format';
import { reports_store } from '../store/reports-store';
import type { ManifestEntry, ReportMode, RouteRow } from '../types';

interface ReportBrowserProps {
  title: string;
  domestic_report_type: string;
  international_report_type: string;
  include_without_price: boolean;
}

function sort_entries(entries: ManifestEntry[]): ManifestEntry[] {
  return [...entries].sort((left, right) => {
    const left_label = get_country_pair_label(
      left.origin_country_name,
      left.destination_country_name,
    );
    const right_label = get_country_pair_label(
      right.origin_country_name,
      right.destination_country_name,
    );

    return left_label.localeCompare(right_label);
  });
}

function get_route_label(row: RouteRow): string {
  return `${row.origin_city_name} -> ${row.destination_city_name}`;
}

export function ReportBrowser({
  title,
  domestic_report_type,
  international_report_type,
  include_without_price,
}: ReportBrowserProps) {
  const [report_mode, set_report_mode] = useState<ReportMode>('international');
  const [search_value, set_search_value] = useState('');
  const international_reports = useMemo(
    () => sort_entries(reports_store.get_reports_by_type(international_report_type)),
    [international_report_type],
  );
  const domestic_reports = useMemo(
    () => sort_entries(reports_store.get_reports_by_type(domestic_report_type)),
    [domestic_report_type],
  );
  const available_reports = report_mode === 'international'
    ? international_reports
    : domestic_reports;
  const filtered_reports = useMemo(() => {
    const normalized_query = search_value.trim().toLowerCase();

    if (!normalized_query) {
      return available_reports;
    }

    return available_reports.filter((entry) =>
      get_country_pair_label(
        entry.origin_country_name,
        entry.destination_country_name,
      )
        .toLowerCase()
        .includes(normalized_query),
    );
  }, [available_reports, search_value]);
  const [selected_report_key, set_selected_report_key] = useState<string | null>(null);

  useEffect(() => {
    const first_report_key = filtered_reports[0]?.report_key ?? null;

    if (!first_report_key) {
      set_selected_report_key(null);
      return;
    }

    const has_selected_report = filtered_reports.some(
      (entry) => entry.report_key === selected_report_key,
    );

    if (!has_selected_report) {
      set_selected_report_key(first_report_key);
    }
  }, [filtered_reports, selected_report_key]);

  const selected_report = selected_report_key
    ? reports_store.get_route_report(selected_report_key)
    : null;
  const selected_entry = filtered_reports.find(
    (entry) => entry.report_key === selected_report_key,
  );
  const chart_data = (selected_report?.data ?? []).slice(0, 10).map((row) => ({
    label: get_route_label(row),
    value: row.count,
  }));

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        <Segmented
          options={[
            { label: 'Між країнами', value: 'international' },
            { label: 'В межах країни', value: 'domestic' },
          ]}
          value={report_mode}
          onChange={(value) => set_report_mode(value as ReportMode)}
        />
      </Flex>

      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Input.Search
            placeholder="Пошук за парою країн"
            value={search_value}
            onChange={(event) => set_search_value(event.target.value)}
            allowClear
          />
          <CountryPairTags
            entries={filtered_reports}
            selected_report_key={selected_report_key}
            on_select={set_selected_report_key}
          />
        </Space>
      </Card>

      {!selected_report || !selected_entry ? (
        <Card>
          <Empty description="Оберіть звіт для перегляду деталей" />
        </Card>
      ) : (
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <StatsCards
            stats={[
              {
                label: 'Пара країн',
                value: get_country_pair_label(
                  selected_entry.origin_country_name,
                  selected_entry.destination_country_name,
                ),
              },
              {
                label: 'Кількість рядків',
                value: format_number(selected_report.summary.rows),
              },
              {
                label: 'Загальна кількість пошуків',
                value: format_number(selected_report.summary.searches_total),
              },
              {
                label: include_without_price
                  ? 'Без ціни'
                  : 'Пошуки без ціни',
                value: include_without_price
                  ? format_number(selected_report.summary.searches_without_price)
                  : format_number(selected_report.summary.searches_without_price),
              },
            ]}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <ReportChart
                title="Топ маршрутів"
                data={chart_data}
                value_label="Пошуки"
              />
            </Col>
            <Col xs={24} xl={10}>
              <Card title="Підсумок звіту">
                <Space direction="vertical" size={8}>
                  <Typography.Text strong>
                    {get_country_pair_label(
                      selected_entry.origin_country_name,
                      selected_entry.destination_country_name,
                    )}
                  </Typography.Text>
                  <Typography.Text>
                    Згенеровано: {selected_report.metadata.generated_at}
                  </Typography.Text>
                  <Typography.Text>
                    Кількість рядків: {format_number(selected_report.summary.rows)}
                  </Typography.Text>
                  <Typography.Text>
                    Загальна кількість пошуків:{' '}
                    {format_number(selected_report.summary.searches_total)}
                  </Typography.Text>
                  <Typography.Text>
                    Пошуки без ціни:{' '}
                    {format_number(selected_report.summary.searches_without_price)}
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
          </Row>

          <Card title="Таблиця маршрутів">
            <Table<RouteRow>
              dataSource={selected_report.data}
              rowKey={(row) =>
                `${row.origin_city_name}-${row.destination_city_name}`
              }
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: 'Місто відправлення',
                  dataIndex: 'origin_city_name',
                  key: 'origin_city_name',
                },
                {
                  title: 'Місто призначення',
                  dataIndex: 'destination_city_name',
                  key: 'destination_city_name',
                },
                {
                  title: 'Кількість пошуків',
                  dataIndex: 'count',
                  key: 'count',
                  render: (value: number) => format_number(value),
                  sorter: (left, right) => left.count - right.count,
                  defaultSortOrder: 'descend',
                },
              ]}
            />
          </Card>
        </Space>
      )}
    </Space>
  );
}
