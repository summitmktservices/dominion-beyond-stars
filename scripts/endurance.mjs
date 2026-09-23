import fs from "node:fs";
const source=fs.readFileSync("app/page.tsx","utf8");
const checks=[
 ["coalition helper",/const warSide=/],
 ["authoritative war lookup",/const warBetween=/],
 ["central peace cleanup",/const endWar=/],
 ["runtime validator",/const validateGame=/],
 ["observed foreign power",/const observedEmpirePower=/],
 ["dynamic empire snapshots",/for\(const e of \[\.\.\.n\.empires\]\)/],
 ["fleet sanitation",/n\.fleets=n\.fleets\.filter\(f=>f\.hp>0&&shipCount\(f\)>0\)/],
 ["resource sanitation",/Number\.isFinite\(e\[k\]\)/],
 ["war relation reconciliation",/if\(atWar\(n,e\.id,other\)\)r\.status="war"/],
 ["coalition combat",/atWar\(g,winner\.owner,g\.stars\[system\]\.owner!\)/]
];
const failed=checks.filter(([,re])=>!re.test(source)).map(([name])=>name);
const forbidden=[
 ["old exact AI posture",/theirs=n\.fleets\.filter\(f=>f\.owner===other\)/],
 ["old bilateral AI enemy fleets",/rel\(e,x\.owner\)\.status==="war"/],
 ["old bilateral hostile raid",/rel\(n\.empires\[f\.owner\],star\.owner\)\.status==="war"/]
].filter(([,re])=>re.test(source)).map(([name])=>name);
if(failed.length||forbidden.length){
 console.error(JSON.stringify({failed,forbidden},null,2));process.exit(1);
}
const metrics={
 sourceBytes:source.length,
 warSideCalls:(source.match(/warSide\(/g)||[]).length,
 atWarCalls:(source.match(/atWar\(/g)||[]).length,
 integrityChecks:(source.match(/issues\.push\(/g)||[]).length,
 directRelationWarChecks:(source.match(/\.status==="war"/g)||[]).length
};
console.log("Endurance architecture audit passed");
console.log(JSON.stringify(metrics,null,2));
if(metrics.directRelationWarChecks>18){
 console.error("Too many direct bilateral war checks remain: "+metrics.directRelationWarChecks);
 process.exit(1);
}
