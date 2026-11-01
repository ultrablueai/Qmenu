import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const agents=readFileSync("AGENTS.md","utf8");
const required=[
 "project-audit","tenant-security","auth-access-qa",
 "visual-mobile-qa","payment-loyalty-certification","release-gate"
];
test("all six Beger agent skills exist with frontmatter and safety gates",()=>{
 for(const id of required){
  const source=readFileSync(".agents/skills/"+id+"/SKILL.md","utf8");
  assert.ok(source.startsWith("---\nname: "+id+"\n"),id+" frontmatter");
  assert.match(source,/description:/,id+" skill description");
  assert.match(source,/(Phase|phase|current-phase|gate)/,id+" phase contract");
  assert.ok(source.length>350,id+" substantive skill");
  assert.ok(agents.includes(id),id+" discoverable in AGENTS.md");
 }
});
test("coordinator never promotes test success into commercial GO",()=>{
 assert.match(agents,/Production deploys/);
 assert.match(agents,/not.*autonomous background agents/i);
 assert.match(agents,/phase/i);
 assert.match(agents,/Browser/i);
});
