import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/beger-durable-station-notifications.tsx", "utf8");

test("G23 invalidates in-flight requests when branch/station changes or component unmounts", () => {
  assert.match(source, /const requestSequence=useRef\(0\)/);
  assert.match(source, /const requestId=\+\+requestSequence\.current/);
  assert.match(source, /if\(requestId!==requestSequence\.current\)return/);
  assert.match(source, /return\(\)=>\{active=false;requestSequence\.current\+\+;/);
  assert.match(source, /\},\[refresh\]\)/);
});

test("G23 keeps the server-authorized feed and acknowledgement rather than exposing shared local notifications", () => {
  assert.match(source, /rpc\("g23_branch_notifications"/);
  assert.match(source, /p_branch:branchId,p_station:station/);
  assert.match(source, /rpc\("g23_mark_notification_read"/);
  assert.doesNotMatch(source, /localStorage|service_role/);
});
