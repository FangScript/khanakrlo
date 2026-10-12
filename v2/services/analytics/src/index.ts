import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, getPool, internalAuth, parsePort, requireRole, requireSession, startEventConsumer, startService } from "@khana/service-kit";

const service = "analytics";
const databaseUrl = databaseUrlFor(service);
const pool = getPool(databaseUrl);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value)=>!Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)));
async function eventCounts(start:string,end:string){
  return await pool.query(
    `SELECT event_day::text AS day,event_type AS "eventType",producer,sum(event_count)::text AS "eventCount"
     FROM analytics_event_counts WHERE event_day BETWEEN $1::date AND $2::date
     GROUP BY event_day,event_type,producer ORDER BY event_day DESC,event_type,producer`,[start,end]);
}
const app = createService({ name:service,version:"0.1.0",databaseUrl,routes(router) {
  router.get("/v1/reports/event-counts",requireSession,requireRole("staff"),asyncRoute(async(req,res)=>{
    const today = new Date().toISOString().slice(0,10);
    const end = day.parse(req.query.end ?? today);
    const defaultStart = new Date(Date.parse(`${end}T00:00:00.000Z`)-6*86400000).toISOString().slice(0,10);
    const start = day.parse(req.query.start ?? defaultStart);
    if (start>end) { res.status(400).json({error:"INVALID_DATE_RANGE",message:"Start date must be on or before end date."}); return; }
    if (Date.parse(`${end}T00:00:00.000Z`)-Date.parse(`${start}T00:00:00.000Z`)>90*86400000) { res.status(400).json({error:"DATE_RANGE_TOO_LARGE",message:"Choose a period of 90 days or less."}); return; }
    const counts = await eventCounts(start,end);
    res.setHeader("Cache-Control","no-store");
    res.json({start,end,items:counts.rows});
  }));
  router.post("/internal/v1/reports/event-counts",internalAuth("ANALYTICS_INTERNAL_TOKEN"),asyncRoute(async(req,res)=>{
    const {start,end}=z.object({start:day,end:day}).strict().parse(req.body);
    if(start>end||Date.parse(`${end}T00:00:00.000Z`)-Date.parse(`${start}T00:00:00.000Z`)>90*86400000){res.status(400).json({error:"INVALID_DATE_RANGE"});return;}
    const counts=await eventCounts(start,end);
    res.setHeader("Cache-Control","no-store");
    res.json({start,end,items:counts.rows});
  }));
} });

const brokerUrl = process.env.RABBITMQ_URL;
if (brokerUrl) startEventConsumer(pool,brokerUrl,service,["#"],async(client,event)=>{
  // Analytics stores only aggregate counters, never event payloads or personal data.
  const eventDay = event.occurredAt.slice(0,10);
  await client.query(
    `INSERT INTO analytics_event_counts(event_day,event_type,producer,event_count) VALUES($1::date,$2,$3,1)
     ON CONFLICT(event_day,event_type,producer) DO UPDATE SET event_count=analytics_event_counts.event_count+1,updated_at=now()`,
    [eventDay,event.type,event.producer],
  );
});

await startService(app,parsePort(process.env.PORT,3111),service);
