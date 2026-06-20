type Properties = Record<string, string>;
type Measurements = Record<string, number>;

type Envelope = {
  name: string;
  time: string;
  iKey: string;
  tags: Record<string, string>;
  data: {
    baseType: "EventData" | "ExceptionData" | "MetricData";
    baseData: Record<string, unknown>;
  };
};

let parsedConnectionString: { instrumentationKey: string; endpoint: string } | null | undefined;

export function trackServerEvent(name: string, properties: Properties = {}, measurements: Measurements = {}): void {
  sendTelemetry({
    name: "Microsoft.ApplicationInsights.Event",
    data: {
      baseType: "EventData",
      baseData: {
        ver: 2,
        name,
        properties,
        measurements,
      },
    },
  });
}

export function trackServerException(error: unknown, properties: Properties = {}): void {
  const normalized = error instanceof Error ? error : new Error("Unknown server exception");

  sendTelemetry({
    name: "Microsoft.ApplicationInsights.Exception",
    data: {
      baseType: "ExceptionData",
      baseData: {
        ver: 2,
        exceptions: [
          {
            typeName: normalized.name,
            message: normalized.message,
            hasFullStack: Boolean(normalized.stack),
            stack: normalized.stack,
          },
        ],
        properties,
      },
    },
  });
}

export function trackServerMetric(name: string, value: number, properties: Properties = {}): void {
  sendTelemetry({
    name: "Microsoft.ApplicationInsights.Metric",
    data: {
      baseType: "MetricData",
      baseData: {
        ver: 2,
        metrics: [
          {
            name,
            value,
            count: 1,
          },
        ],
        properties,
      },
    },
  });
}

function sendTelemetry(payload: Pick<Envelope, "name" | "data">): void {
  const config = getApplicationInsightsConfig();
  if (!config) {
    return;
  }

  const envelope: Envelope = {
    ...payload,
    time: new Date().toISOString(),
    iKey: config.instrumentationKey,
    tags: {
      "ai.cloud.role": "malgrim-nextjs",
    },
  };

  void fetch(`${config.endpoint}/v2/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(envelope),
    keepalive: true,
  }).catch(() => undefined);
}

function getApplicationInsightsConfig(): { instrumentationKey: string; endpoint: string } | null {
  if (parsedConnectionString !== undefined) {
    return parsedConnectionString;
  }

  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) {
    parsedConnectionString = null;
    return null;
  }

  const parts = new Map(
    connectionString
      .split(";")
      .map((part) => part.split("="))
      .filter((part): part is [string, string] => part.length === 2 && Boolean(part[0]) && Boolean(part[1]))
      .map(([key, value]) => [key.toLowerCase(), value]),
  );

  const instrumentationKey = parts.get("instrumentationkey");
  if (!instrumentationKey) {
    parsedConnectionString = null;
    return null;
  }

  const endpoint = (parts.get("ingestionendpoint") ?? "https://dc.services.visualstudio.com").replace(/\/$/, "");
  parsedConnectionString = { instrumentationKey, endpoint };
  return parsedConnectionString;
}
