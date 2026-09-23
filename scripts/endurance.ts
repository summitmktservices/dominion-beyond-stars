import {generate,tick,validateGame} from "../app/page";

const scenarios=[
 {seed:1337,size:300,ai:15,shape:"spiral" as const,density:"normal" as const},
 {seed:424242,size:400,ai:23,shape:"elliptical" as const,density:"dense" as const},
 {seed:8675309,size:500,ai:31,shape:"ring" as const,density:"sparse" as const},
 {seed:20260923,size:600,ai:39,shape:"spiral" as const,density:"normal" as const}
];
const turns=Number(process.env.ENDURANCE_TURNS??500);

function rng(seed:number){
 let s=seed>>>0;
 return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}
}

const original=Math.random;
const results=[];
try{
 for(const scenario of scenarios){
  const {seed,size,ai,shape,density}=scenario;
  Math.random=rng(seed);
  let g=generate(size,ai,shape,density,2,4,"balanced","normal","normal","normal","normal");
  let peakFleets=g.fleets.length,peakWars=g.wars.length,peakEmpires=g.empires.length;
  for(let i=0;i<turns;i++){
   g=tick(g);
   const issues=validateGame(g);
   if(issues.length)throw new Error(`seed ${seed} turn ${g.turn}: ${issues.join("; ")}`);
   if(g.log.some(x=>x.startsWith("SIMULATION INTEGRITY:")))throw new Error(`seed ${seed} turn ${g.turn}: runtime integrity log emitted`);
   peakFleets=Math.max(peakFleets,g.fleets.length);peakWars=Math.max(peakWars,g.wars.length);peakEmpires=Math.max(peakEmpires,g.empires.length);
  }
  results.push({seed,size,ai,shape,density,turn:g.turn,activeEmpires:g.empires.filter(e=>e.active!==false).length,totalEmpires:g.empires.length,fleets:g.fleets.length,wars:g.wars.length,peakFleets,peakWars,peakEmpires});
 }
}finally{Math.random=original}
console.log(JSON.stringify({turnsPerScenario:turns,scenarios:scenarios.length,totalTurns:turns*scenarios.length,results},null,2));
