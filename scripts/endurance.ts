import {generate,tick,validateGame} from "../app/page";

const scenarios=[
 {seed:1337,size:300,ai:15,shape:"spiral" as const,density:"normal" as const},
 {seed:424242,size:400,ai:23,shape:"elliptical" as const,density:"dense" as const},
 {seed:8675309,size:500,ai:31,shape:"ring" as const,density:"sparse" as const},
 {seed:20260923,size:600,ai:39,shape:"spiral" as const,density:"normal" as const}
];
const turns=Number(process.env.ENDURANCE_TURNS??500);
const scenarioIndex=process.env.ENDURANCE_SCENARIO===undefined?null:Number(process.env.ENDURANCE_SCENARIO);
const selected=scenarioIndex===null?scenarios:scenarios.filter((_,i)=>i===scenarioIndex);
if(!selected.length)throw new Error("Invalid ENDURANCE_SCENARIO");

function rng(seed:number){
 let s=seed>>>0;
 return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}
}
const empireScore=(g:any,e:any)=>{
 const systems=g.stars.filter((s:any)=>s.owner===e.id).length;
 const planets=g.planets.filter((p:any)=>p.owner===e.id).length;
 const population=g.planets.filter((p:any)=>p.owner===e.id).reduce((a:number,p:any)=>a+(Number(p.pop)||0),0);
 const fleetPower=g.fleets.filter((f:any)=>f.owner===e.id&&f.hp>0).reduce((a:number,f:any)=>a+(Number(f.hp)||0),0);
 const completedByDiscipline=Object.fromEntries(["physics","society","engineering"].map(d=>[d,e.research?.[d]?.completed?.length??0]));\n const techs=Object.values(completedByDiscipline).reduce((a:any,n:any)=>a+Number(n),0);
 const economy=["credits","minerals","food","consumer","alloys","science","influence","unity","trade"].reduce((a,k)=>a+(Number(e[k])||0),0);
 const score=Math.round(systems*100+planets*150+population*10+fleetPower+techs*75+economy*.05);
 return {id:e.id,name:e.name,active:e.active!==false,score,systems,planets,population:Math.round(population*10)/10,fleetPower:Math.round(fleetPower),techs,completedByDiscipline,techLevel:e.tech,economy:Math.round(economy)};
};

const original=Math.random;
const results=[];
try{
 for(const scenario of selected){
  const {seed,size,ai,shape,density}=scenario;
  const started=Date.now();
  Math.random=rng(seed);
  let g=generate(size,ai,shape,density,2,4,"balanced","normal","normal","normal","normal");
  let peakFleets=g.fleets.length,peakWars=g.wars.length,peakEmpires=g.empires.length;
  const checkpoints:any[]=[];
  for(let i=0;i<turns;i++){
   const turnStarted=Date.now();
   g=tick(g);
   const issues=validateGame(g);
   if(issues.length)throw new Error(`seed ${seed} turn ${g.turn}: ${issues.join("; ")}`);
   if(g.log.some(x=>x.startsWith("SIMULATION INTEGRITY:")))throw new Error(`seed ${seed} turn ${g.turn}: runtime integrity log emitted`);
   peakFleets=Math.max(peakFleets,g.fleets.length);peakWars=Math.max(peakWars,g.wars.length);peakEmpires=Math.max(peakEmpires,g.empires.length);
   if(g.turn%100===0){
    const leaders=g.empires.map(e=>empireScore(g,e)).sort((a,b)=>b.score-a.score).slice(0,5);
    checkpoints.push({turn:g.turn,elapsedMs:Date.now()-started,lastTurnMs:Date.now()-turnStarted,activeEmpires:g.empires.filter(e=>e.active!==false).length,fleets:g.fleets.length,wars:g.wars.length,leaders});
    console.log("CHECKPOINT "+JSON.stringify(checkpoints[checkpoints.length-1]));
   }
  }
  const standings=g.empires.map(e=>empireScore(g,e)).sort((a,b)=>b.score-a.score);
  results.push({seed,size,ai,shape,density,turn:g.turn,elapsedMs:Date.now()-started,activeEmpires:g.empires.filter(e=>e.active!==false).length,totalEmpires:g.empires.length,fleets:g.fleets.length,wars:g.wars.length,peakFleets,peakWars,peakEmpires,winner:standings[0],top10:standings.slice(0,10),checkpoints});
 }
}finally{Math.random=original}
console.log("ENDURANCE_RESULT "+JSON.stringify({turnsPerScenario:turns,scenarios:selected.length,totalTurns:turns*selected.length,results},null,2));
