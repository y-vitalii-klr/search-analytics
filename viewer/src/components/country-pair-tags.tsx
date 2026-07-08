import { Empty, Flex, Tag, Typography } from 'antd';

import type { ManifestEntry } from '../types';

const { CheckableTag } = Tag;

interface CountryPairTagsProps {
  entries: ManifestEntry[];
  selected_report_key: string | null;
  on_select: (report_key: string) => void;
}

export function CountryPairTags({
  entries,
  selected_report_key,
  on_select,
}: CountryPairTagsProps) {
  if (entries.length === 0) {
    return <Empty description="Звіти не знайдено" />;
  }

  return (
    <Flex gap={8} wrap>
      {entries.map((entry) => {
        const label = `${entry.origin_country_name}-${entry.destination_country_name}`;

        return (
          <CheckableTag
            key={entry.report_key}
            checked={entry.report_key === selected_report_key}
            onChange={() => on_select(entry.report_key)}
          >
            <Typography.Text>{label}</Typography.Text>
          </CheckableTag>
        );
      })}
    </Flex>
  );
}
