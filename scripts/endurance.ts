import {generate,tick,validateGame} from "../app/page";

const seeds=[1337,424242,8675309];
const turns=Number(process.env.ENDURANCE_TURNS??250);

function rng(seed:number){
 let s=seed>>>0;
 return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}
}

const original=Math.random;
const results=[];
try{
 for(const seed of seeds){
  Math.random=rng(seed);
  let g=generate(300,15,"spiral","normal",2,4,"balanced","normal","normal","normal","normal");
  let peakFleets=g.fleets.length,peakWars=g.wars.length,peakEmpires=g.empires.length;
  for(let i=0;i<turns;i++){
   g=tick(g);
   const issues=validateGame(g);
   if(issues.length)throw new Error(`seed ${seed} turn ${g.turn}: ${issues.join("; ")}`);
   if(g.log.some(x=>x.startsWith("SIMULATION INTEGRITY:")))throw new Error(`seed ${seed} turn ${g.turn}: runtime integrity log emitted`);
   peakFleets=Math.max(peakFleets,g.fleets.length);peakWars=Math.max(peakWars,g.wars.length);peakEmpires=Math.max(peakEmpires,g.empires.length);
  }
  results.push({seed,turn:g.turn,activeEmpires:g.empires.filter(e=>e.active!==false).length,totalEmpires:g.empires.length,fleets:g.fleets.length,wars:g.wars.length,peakFleets,peakWars,peakEmpires});
 }
}finally{Math.random=original}
console.log(JSON.stringify({turnsPerSeed:turns,seeds:seeds.length,totalTurns:turns*seeds.length,results},null,2));
