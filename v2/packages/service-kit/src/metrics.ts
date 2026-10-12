import { performance } from "node:perf_hooks";
import type { Express, RequestHandler } from "express";
import { internalAuth } from "./http.js";

const bounds = [0.05, 0.1, 0.25, 0.5, 0.8, 1, 3, 5, 10];
type Observation = { count: number; sum: number; buckets: number[] };

/** Only registered route templates are labels. User ids, query strings and raw URLs never are. */
export function installHttpMetrics(app: Express, service: string) {
  const observed = new Map<string, Observation>();
  let inFlight = 0;
  const middleware: RequestHandler = (req, res, next) => {
    const started = performance.now();
    inFlight++;
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true; inFlight--;
      const route = typeof req.route?.path === "string" ? req.route.path : "unmatched";
      if (route.startsWith("/health/") || route === "/metrics") return;
      const method = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(req.method) ? req.method : "OTHER";
      const labels = `service=${JSON.stringify(service)},method=${JSON.stringify(method)},route=${JSON.stringify(route)},status_class="${Math.floor(res.statusCode / 100)}xx"`;
      const item = observed.get(labels) ?? { count: 0, sum: 0, buckets: bounds.map(() => 0) };
      const seconds = (performance.now() - started) / 1000;
      item.count++; item.sum += seconds;
      bounds.forEach((bound, index) => { if (seconds <= bound) item.buckets[index] = (item.buckets[index] ?? 0) + 1; });
      observed.set(labels, item);
    };
    res.once("finish", record); res.once("close", record);
    next();
  };
  app.use(middleware);
  app.get("/metrics", internalAuth("METRICS_TOKEN"), (_req, res) => {
    const lines = ["# TYPE khana_http_duration_seconds histogram", "# HELP khana_http_duration_seconds Time spent serving a request."];
    for (const [labels, item] of observed) {
      bounds.forEach((bound, index) => lines.push(`khana_http_duration_seconds_bucket{${labels},le="${bound}"} ${item.buckets[index]}`));
      lines.push(`khana_http_duration_seconds_bucket{${labels},le="+Inf"} ${item.count}`, `khana_http_duration_seconds_count{${labels}} ${item.count}`, `khana_http_duration_seconds_sum{${labels}} ${item.sum}`);
    }
    lines.push("# TYPE khana_http_in_flight gauge", `khana_http_in_flight{service=${JSON.stringify(service)}} ${Math.max(0, inFlight - 1)}`, "# TYPE khana_process_resident_bytes gauge", `khana_process_resident_bytes{service=${JSON.stringify(service)}} ${process.memoryUsage().rss}`);
    res.type("text/plain; version=0.0.4").send(lines.join("\n") + "\n");
  });
}
