export function buildDateFilter(filter: {
  startDate?: string;
  endDate?: string;
}): Record<string, Date> | undefined {
  const dateFilter: Record<string, Date> = {};
  if (filter.startDate) dateFilter.gte = new Date(filter.startDate);
  if (filter.endDate) dateFilter.lte = new Date(filter.endDate);
  return Object.keys(dateFilter).length ? dateFilter : undefined;
}
