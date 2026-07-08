export function format_number(value: number): string {
  return new Intl.NumberFormat('uk-UA').format(value);
}

export function format_percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function get_share(total: number, part: number): number {
  if (total === 0) {
    return 0;
  }

  return part / total;
}

export function get_country_pair_label(
  origin_country_name: string | null,
  destination_country_name: string | null,
): string {
  return `${origin_country_name ?? 'Невідомо'}-${destination_country_name ?? 'Невідомо'}`;
}

export function get_period_label(
  date_from: string | null,
  date_to: string | null,
): string {
  if (!date_from && !date_to) {
    return 'За весь час';
  }

  return `${date_from ?? '...'} - ${date_to ?? '...'}`;
}
