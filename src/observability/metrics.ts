import { Counter, collectDefaultMetrics, Histogram, Registry } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  prefix: 'financas_api_',
  register: metricsRegistry,
});

function getOrCreateCounter(name: string, help: string, labelNames: string[]): Counter<string> {
  const metric = metricsRegistry.getSingleMetric(name);
  if (metric) {
    return metric as Counter<string>;
  }

  return new Counter({
    name,
    help,
    labelNames,
    registers: [metricsRegistry],
  });
}

function getOrCreateHistogram(
  name: string,
  help: string,
  labelNames: string[],
  buckets: number[],
): Histogram<string> {
  const metric = metricsRegistry.getSingleMetric(name);
  if (metric) {
    return metric as Histogram<string>;
  }

  return new Histogram({
    name,
    help,
    labelNames,
    buckets,
    registers: [metricsRegistry],
  });
}

export const httpRequestsTotal = getOrCreateCounter(
  'financas_api_http_requests_total',
  'Total de requisicoes HTTP recebidas pela API',
  ['method', 'route', 'status_code'],
);

export const httpRequestDurationMs = getOrCreateHistogram(
  'financas_api_http_request_duration_ms',
  'Duracao de requisicoes HTTP em milissegundos',
  ['method', 'route', 'status_code'],
  [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
);
