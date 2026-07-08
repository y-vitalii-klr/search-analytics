import { Card, Col, Row, Statistic } from 'antd';

import type { ReportCardStat } from '../types';

interface StatsCardsProps {
  stats: ReportCardStat[];
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <Row gutter={[16, 16]}>
      {stats.map((stat) => (
        <Col key={stat.label} xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title={stat.label} value={stat.value} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
