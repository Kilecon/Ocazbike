import { opentelemetry } from "@elysia/opentelemetry";
import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";

import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

//
// TRACES -> TEMPO
//

export const telemetry = opentelemetry({
  serviceName: "elysia-api",

  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      }),
    ),
  ],
});

//
// METRICS -> PROMETHEUS
//

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
});

const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,

      exportIntervalMillis: 5000,
    }),
  ],
});

metrics.setGlobalMeterProvider(meterProvider);

export const meter = metrics.getMeter("elysia-api");
