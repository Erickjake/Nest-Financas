import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://localhost:4318/v1/traces',
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'financas-api',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
    'deployment.environment.name': process.env.NODE_ENV ?? 'development',
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

Promise.resolve(sdk.start()).catch((err: unknown) => {
  console.error('Erro ao iniciar OpenTelemetry:', err);
});

process.on('SIGTERM', () => {
  Promise.resolve(sdk.shutdown()).catch((err: unknown) => {
    console.error('Erro ao finalizar OpenTelemetry:', err);
  });
});
