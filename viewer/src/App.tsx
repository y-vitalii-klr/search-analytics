import { useMemo, useState } from 'react';

import { Layout, Menu, Space, Tag, Typography } from 'antd';

import { OverviewPage } from './pages/overview-page';
import { MissingPriceRoutesPage } from './pages/missing-price-routes-page';
import { NoPricePage } from './pages/no-price-page';
import { TopQueriesPage } from './pages/top-queries-page';
import { reports_store } from './store/reports-store';
import type { PageKey } from './types';

const { Header, Content } = Layout;

export default function App() {
  const [active_page, set_active_page] = useState<PageKey>('overview');
  const period = reports_store.manifest.metadata.period;
  const page = useMemo(() => {
    if (active_page === 'no_price') {
      return <NoPricePage />;
    }

    if (active_page === 'missing_price_routes') {
      return <MissingPriceRoutesPage />;
    }

    if (active_page === 'top_queries') {
      return <TopQueriesPage />;
    }

    return <OverviewPage />;
  }, [active_page]);

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
                Країни: {reports_store.manifest.countries.join(', ')}
              </Typography.Text>
            </div>
            <Tag color="blue">
              Період: {period.date_from ?? '...'} - {period.date_to ?? '...'}
            </Tag>
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
