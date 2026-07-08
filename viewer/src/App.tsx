import { useMemo, useState } from 'react';

import { Layout, Menu, Select, Space, Tag, Typography } from 'antd';

import { OverviewPage } from './pages/overview-page';
import { MissingPriceRoutesPage } from './pages/missing-price-routes-page';
import { NoPricePage } from './pages/no-price-page';
import { TopQueriesPage } from './pages/top-queries-page';
import { reports_store } from './store/reports-store';
import type { PageKey } from './types';

const { Header, Content } = Layout;

export default function App() {
  const default_period_slug = reports_store.get_default_period_slug();
  const [active_page, set_active_page] = useState<PageKey>('overview');
  const [selected_period_slug, set_selected_period_slug] = useState<string>(
    default_period_slug ?? '',
  );
  const period_manifest = reports_store.get_manifest(selected_period_slug);
  const period = period_manifest?.metadata.period ?? {
    date_from: null,
    date_to: null,
  };
  const period_options = reports_store.get_periods().map((period_entry) => ({
    label: period_entry.label,
    value: period_entry.period_slug,
  }));
  const page = useMemo(() => {
    if (active_page === 'no_price') {
      return <NoPricePage period_slug={selected_period_slug} />;
    }

    if (active_page === 'missing_price_routes') {
      return <MissingPriceRoutesPage period_slug={selected_period_slug} />;
    }

    if (active_page === 'top_queries') {
      return <TopQueriesPage period_slug={selected_period_slug} />;
    }

    return <OverviewPage period_slug={selected_period_slug} />;
  }, [active_page, selected_period_slug]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fb' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#ffffff',
          borderBottom: '1px solid #f0f0f0',
          paddingInline: 24,
          height: 'auto',
        }}
      >
        <Space
          direction="vertical"
          size={8}
          style={{ width: '100%', paddingBlock: 16 }}
        >
          <Space
            style={{ width: '100%', justifyContent: 'space-between' }}
            wrap
          >
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Візуалізація аналітики
              </Typography.Title>
              <Typography.Text type="secondary">
                Країни:{' '}
                {period_manifest?.countries.join(', ') ?? 'Немає даних'}
              </Typography.Text>
            </div>
            <Space wrap>
              <Select
                style={{ minWidth: 240 }}
                value={selected_period_slug}
                options={period_options}
                onChange={set_selected_period_slug}
                placeholder="Оберіть період"
              />
              <Tag color="blue">
                Період: {period.date_from ?? '...'} - {period.date_to ?? '...'}
              </Tag>
            </Space>
          </Space>
          <Menu
            mode="horizontal"
            selectedKeys={[active_page]}
            onClick={(event) => set_active_page(event.key as PageKey)}
            items={[
              { key: 'overview', label: 'Загальна статистика' },
              { key: 'no_price', label: 'Топ без цін' },
              {
                key: 'missing_price_routes',
                label: 'Маршрути без жодної ціни',
              },
              { key: 'top_queries', label: 'Топ запитів' },
            ]}
          />
        </Space>
      </Header>
      <Content style={{ padding: 24 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>{page}</div>
      </Content>
    </Layout>
  );
}
