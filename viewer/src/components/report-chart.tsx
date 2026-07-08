import { Card } from 'antd';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ReportChartItem {
  label: string;
  value: number;
  secondary_value?: number;
}

interface ReportChartProps {
  title: string;
  data: ReportChartItem[];
  chart_type?: 'bar' | 'pie';
  value_label?: string;
  secondary_label?: string;
}

const PIE_COLORS = ['#1677ff', '#faad14', '#52c41a', '#722ed1'];

export function ReportChart({
  title,
  data,
  chart_type = 'bar',
  value_label = 'Значення',
  secondary_label,
}: ReportChartProps) {
  return (
    <Card title={title}>
      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          {chart_type === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`${entry.label}-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                angle={-18}
                textAnchor="end"
                interval={0}
                height={72}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name={value_label} fill="#1677ff" radius={[6, 6, 0, 0]} />
              {secondary_label ? (
                <Bar
                  dataKey="secondary_value"
                  name={secondary_label}
                  fill="#faad14"
                  radius={[6, 6, 0, 0]}
                />
              ) : null}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
