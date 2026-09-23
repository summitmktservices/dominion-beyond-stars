import {generate,tick,validateGame} from "../app/page";

const scenarios=[
 {seed:731991,size:300,ai:15,shape:"elliptical" as const,density:"dense" as const},
 {seed:992173,size:400,ai:23,shape:"ring" as const,density:"normal" as const},
 {seed:451337,size:500,ai:31,shape:"spiral" as const,density:"sparse" as const},
 {seed:888041,size:600,ai:39,shape:"elliptical" as const,density:"normal" as const}
];
const turns=Number(process.env.ENDURANCE_TURNS??500);
const scenarioIndex=process.env.ENDURANCE_SCENARIO===undefined?null:Number(process.env.ENDURANCE_SCENARIO);
const selected=scenarioIndex===null?scenarios:scenarios.filter((_,i)=>i===scenarioIndex);
if(!selected.length)throw new Error("Invalid ENDURANCE_SCENARIO");

function rng(seed:number){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}}
const military=(f:any)=>Object.entries(f.ships??{}).reduce((a,[k,n])=>a+Number(n||0)*({interceptor:2,corvette:3,frigate:6,destroyer:9,cruiser:14,carrier:19,battleship:27,dreadnought:40,titan:65} as any)[k],0)*(Number(f.hp)||0)/100;
const empireScore=(g:any,e:any)=>{
 const systems=g.stars.filter((s:any)=>s.owner===e.id).length,ps=g.planets.filter((p:any)=>p.owner===e.id),planets=ps.length;
 const population=ps.reduce((a:number,p:any)=>a+(Number(p.pop)||0),0);
 const fleetPower=g.fleets.filter((f:any)=>f.owner===e.id&&f.hp>0).reduce((a:number,f:any)=>a+military(f),0);
 const completedByDiscipline=Object.fromEntries(["physics","society","engineering"].map(d=>[d,e.research?.[d]?.completed?.length??0]));
 const techs=Object.values(completedByDiscipline).reduce((a:any,n:any)=>a+Number(n),0);
 const economy=["credits","minerals","food","consumer","alloys","science","influence","unity","trade"].reduce((a,k)=>a+(Number(e[k])||0),0);
 const score=Math.round(systems*100+planets*150+population*10+fleetPower+techs*75+economy*.05);
 return{id:e.id,name:e.name,active:e.active!==false,origin:e.origin??null,score,systems,planets,population:+population.toFixed(1),fleetPower:Math.round(fleetPower),fleets:g.fleets.filter((f:any)=>f.owner===e.id&&f.hp>0).length,techs,completedByDiscipline,techLevel:e.tech,economy:Math.round(economy),credits:Math.round(e.credits),alloys:Math.round(e.alloys),science:Math.round(e.science),unity:Math.round(e.unity),trade:Math.round(e.trade)};
};
const original=Math.random,results:any[]=[];
try{for(const scenario of selected){
 const {seed,size,ai,shape,density}=scenario,started=Date.now();Math.random=rng(seed);
 let g=generate(size,ai,shape,density,2,4,"balanced","normal","normal","normal","normal");
 let peakFleets=g.fleets.length,peakWars=g.wars.length,peakEmpires=g.empires.length,peakCrises=g.crises.length;
 const initialEmpires=g.empires.length,checkpoints:any[]=[];let priorWars=new Set<string>(),warsStarted=0,warsEnded=0,breakaways=0,crisesStarted=0,interventionsStarted=0;
 let prevEmpireCount=g.empires.length,prevCrisisCount=g.crises.length,prevInterventionCount=g.interventions.length;const warHistory:any[]=[];
 for(let i=0;i<turns;i++){
  const turnStarted=Date.now();g=tick(g);const issues=validateGame(g);
  if(issues.length)throw new Error(`seed ${seed} turn ${g.turn}: ${issues.join("; ")}`);
  if(g.log.some(x=>x.startsWith("SIMULATION INTEGRITY:")))throw new Error(`seed ${seed} turn ${g.turn}: runtime integrity log emitted`);
  const keys=new Set(g.wars.map((w:any)=>[w.a,w.b,w.start,w.goalType].join(":")));
  for(const k of keys)if(!priorWars.has(k)){warsStarted++;const w=g.wars.find((w:any)=>[w.a,w.b,w.start,w.goalType].join(":")===k);if(w){const a=g.empires[w.a],b=g.empires[w.b],kind=w.goalType==="liberation"?"independence":(a?.origin?.kind==="breakaway"||b?.origin?.kind==="breakaway")?"breakaway-external":"interstate";warHistory.push({turn:g.turn,kind,goalType:w.goalType,a:a?.name,b:b?.name,aBreakaway:a?.origin?.kind==="breakaway",bBreakaway:b?.origin?.kind==="breakaway"})}}for(const k of priorWars)if(!keys.has(k))warsEnded++;priorWars=keys;
  if(g.empires.length>prevEmpireCount)breakaways+=g.empires.length-prevEmpireCount;
  if(g.crises.length>prevCrisisCount)crisesStarted+=g.crises.length-prevCrisisCount;
  if(g.interventions.length>prevInterventionCount)interventionsStarted+=g.interventions.length-prevInterventionCount;
  prevEmpireCount=g.empires.length;prevCrisisCount=g.crises.length;prevInterventionCount=g.interventions.length;
  peakFleets=Math.max(peakFleets,g.fleets.length);peakWars=Math.max(peakWars,g.wars.length);peakEmpires=Math.max(peakEmpires,g.empires.length);peakCrises=Math.max(peakCrises,g.crises.filter((c:any)=>!c.resolved).length);
  if(g.turn%100===0){const leaders=g.empires.map((e:any)=>empireScore(g,e)).sort((a:any,b:any)=>b.score-a.score).slice(0,5);const snap={turn:g.turn,elapsedMs:Date.now()-started,lastTurnMs:Date.now()-turnStarted,activeEmpires:g.empires.filter((e:any)=>e.active!==false).length,fleets:g.fleets.length,wars:g.wars.length,activeCrises:g.crises.filter((c:any)=>!c.resolved).length,breakaways,warsStarted,warsEnded,leaders};checkpoints.push(snap);console.log("CHECKPOINT "+JSON.stringify(snap))}
 }
 const standings=g.empires.map((e:any)=>empireScore(g,e)).sort((a:any,b:any)=>b.score-a.score),active=standings.filter((e:any)=>e.active);
 const biggest=standings.slice().sort((a:any,b:any)=>b.systems-a.systems)[0],mostPop=standings.slice().sort((a:any,b:any)=>b.population-a.population)[0],strongest=standings.slice().sort((a:any,b:any)=>b.fleetPower-a.fleetPower)[0],mostAdvanced=standings.slice().sort((a:any,b:any)=>b.techs-a.techs)[0],richest=standings.slice().sort((a:any,b:any)=>b.economy-a.economy)[0];
 const warsByKind=warHistory.reduce((m:any,w:any)=>(m[w.kind]=(m[w.kind]??0)+1,m),{}),defeatHistory=g.defeatHistory??[],defeatsByCause=defeatHistory.reduce((m:any,d:any)=>(m[d.cause]=(m[d.cause]??0)+1,m),{}),systemicCrises=defeatHistory.filter((d:any)=>d.cause==="systemic-collapse").flatMap((d:any)=>d.activeCrises??[]).reduce((m:any,k:any)=>(m[k]=(m[k]??0)+1,m),{});results.push({seed,size,ai,shape,density,turn:g.turn,elapsedMs:Date.now()-started,initialEmpires,activeEmpires:active.length,totalEmpires:g.empires.length,defeatedEmpires:standings.filter((e:any)=>!e.active).length,defeatsByCause,systemicCrises,defeatHistory,breakaways,crisesStarted,interventionsStarted,warsStarted,warsEnded,warsByKind,warHistory,ongoingWars:g.wars.length,fleets:g.fleets.length,peakFleets,peakWars,peakEmpires,peakCrises,winner:standings[0],superlatives:{biggest,mostPop,strongest,mostAdvanced,richest},top10:standings.slice(0,10),checkpoints});
}}finally{Math.random=original}
console.log("ENDURANCE_RESULT "+JSON.stringify({turnsPerScenario:turns,scenarios:selected.length,totalTurns:turns*selected.length,results},null,2));
