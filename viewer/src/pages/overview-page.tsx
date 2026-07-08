import { Alert, Card, Col, Row, Space, Table, Typography } from 'antd';

import { ReportChart } from '../components/report-chart';
import { StatsCards } from '../components/stats-cards';
import {
  format_number,
  format_percent,
  get_period_label,
  get_share,
} from '../lib/format';
import { reports_store } from '../store/reports-store';
import type { CountryCoverageRow } from '../types';

const COUNTRY_DISTRIBUTION_LIMIT = 10;

export function OverviewPage() {
  const global_report = reports_store.get_global_stats();
  const country_coverage_report = reports_store.get_country_coverage();
  const top_countries_report = reports_store.get_top_countries();
  const origin_country_distribution_report =
    reports_store.get_origin_country_distribution();
  const destination_country_distribution_report =
    reports_store.get_destination_country_distribution();
  const global_row = global_report?.data[0];
  const total_searches = global_row?.total_searches ?? 0;
  const without_price_searches = global_row?.searches_without_price ?? 0;
  const with_price_searches = total_searches - without_price_searches;
  const pie_data = [
    { label: 'With price', value: with_price_searches },
    { label: 'Without price', value: without_price_searches },
  ];
  const country_chart_data = (country_coverage_report?.data ?? []).map((row) => ({
    label: row.country_name,
    value: Number((get_share(row.total_searches, row.searches_without_price) * 100).toFixed(1)),
    secondary_value: Number(
      ((1 - get_share(row.total_searches, row.searches_without_price)) * 100).toFixed(1),
    ),
  }));
  const origin_country_pie_data =
    (origin_country_distribution_report?.data ?? [])
      .slice(0, COUNTRY_DISTRIBUTION_LIMIT)
      .map((row) => ({
        label: row.country_name,
        value: row.total_searches,
      }));
  const destination_country_pie_data =
    (destination_country_distribution_report?.data ?? [])
      .slice(0, COUNTRY_DISTRIBUTION_LIMIT)
      .map((row) => ({
        label: row.country_name,
        value: row.total_searches,
      }));

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Загальна статистика
      </Typography.Title>

      <Alert
        type="info"
        showIcon
        message="Пояснення"
        description="Цей розділ показує загальний обсяг пошуків, частку пошуків без ціни, покриття по країнах і розподіл пошуків за країнами відправлення та призначення. Покриття по країнах тут рахується за маршрутами, для яких у вибраному періоді взагалі не було жодного запису з ціною. Для кругових діаграм за країнами показуються лише топ 10 країн, щоб графіки залишалися читабельними."
      />

      <StatsCards
        stats={[
          {
            label: 'Загальна кількість пошуків',
            value: format_number(total_searches),
          },
          {
            label: 'Пошуки без ціни',
            value: format_number(without_price_searches),
          },
          {
            label: 'Покриття',
            value: format_percent(get_share(total_searches, with_price_searches)),
          },
          {
            label: 'Період',
            value: get_period_label(
              global_report?.metadata.period.date_from ?? null,
              global_report?.metadata.period.date_to ?? null,
            ),
          },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <ReportChart
            title="Пошуки з ціною та без ціни"
            chart_type="pie"
            data={pie_data}
          />
        </Col>
        <Col xs={24} xl={14}>
          <ReportChart
            title="Покриття по країнах"
            data={country_chart_data}
            value_label="% без ціни"
            secondary_label="% з ціною"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <ReportChart
            title="Країни, звідки шукають"
            chart_type="pie"
            data={origin_country_pie_data}
          />
        </Col>
        <Col xs={24} xl={12}>
          <ReportChart
            title="Країни, куди шукають"
            chart_type="pie"
            data={destination_country_pie_data}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Таблиця покриття по країнах">
            <Table<CountryCoverageRow>
              dataSource={country_coverage_report?.data ?? []}
              rowKey={(row) => row.country_name}
              pagination={false}
              columns={[
                {
                  title: 'Країна',
                  dataIndex: 'country_name',
                  key: 'country_name',
                },
                {
                  title: 'Загальна кількість пошуків',
                  dataIndex: 'total_searches',
                  key: 'total_searches',
                  render: (value: number) => format_number(value),
                },
                {
                  title: 'Пошуки без ціни',
                  dataIndex: 'searches_without_price',
                  key: 'searches_without_price',
                  render: (value: number) => format_number(value),
                },
                {
                  title: '% без ціни',
                  key: 'without_price_share',
                  render: (_, row) =>
                    format_percent(
                      get_share(row.total_searches, row.searches_without_price),
                    ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Топ країн">
            <Table<CountryCoverageRow>
              dataSource={top_countries_report?.data ?? []}
              rowKey={(row) => row.country_name}
              pagination={false}
              columns={[
                {
                  title: 'Країна',
                  dataIndex: 'country_name',
                  key: 'country_name',
                },
                {
                  title: 'Загальна кількість пошуків',
                  dataIndex: 'total_searches',
                  key: 'total_searches',
                  render: (value: number) => format_number(value),
                },
                {
                  title: 'Пошуки без ціни',
                  dataIndex: 'searches_without_price',
                  key: 'searches_without_price',
                  render: (value: number) => format_number(value),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
