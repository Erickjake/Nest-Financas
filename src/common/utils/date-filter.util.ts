export function buildDateFilter(filter: {
  startDate?: string;
  endDate?: string;
  DATA?: string;
}): Record<string, Date> | undefined {
  const dateFilter: Record<string, Date> = {};

  if (filter.startDate) {
    dateFilter.gte = new Date(filter.startDate);
  }
  if (filter.endDate) {
    dateFilter.lte = new Date(filter.endDate);
  }

  if (filter.DATA && !filter.startDate && !filter.endDate) {
    if (/^\d{4}-\d{2}$/.test(filter.DATA)) {
      const [year, month] = filter.DATA.split('-');
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      dateFilter.gte = start;
      dateFilter.lte = end;
    } else {
      const exact = new Date(filter.DATA);
      dateFilter.gte = exact;
      dateFilter.lte = exact;
    }
  }

  return Object.keys(dateFilter).length ? dateFilter : undefined;
}
