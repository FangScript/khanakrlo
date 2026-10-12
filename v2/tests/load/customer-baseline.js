// Run with k6, against staging fixtures only. This is a foundation API baseline,
// not the 50-orders/minute checkout/KDS/dispatch/location acceptance run.
import http from "k6/http";
import { check } from "k6";
const base = __ENV.API_BASE_URL;
const token = __ENV.ACCESS_TOKEN;
if (!base || !token) throw new Error("Provide API_BASE_URL and a valid staging ACCESS_TOKEN.");
export const options = {
  scenarios: { profileReads: { executor: "constant-arrival-rate", rate: 50, timeUnit: "1m", duration: "5m", preAllocatedVUs: 5, maxVUs: 20 } },
  thresholds: { http_req_duration: ["p(95)<=500"], http_req_failed: ["rate<0.01"], checks: ["rate==1"], dropped_iterations: ["count==0"] },
};
export default function () {
  const response = http.get(`${base}/v1/customer/profile`, { headers: { Authorization: `Bearer ${token}` }, tags: { name: "customer-profile" }, timeout: "5s" });
  check(response, { "profile returned": (value) => value.status === 200 });
}
