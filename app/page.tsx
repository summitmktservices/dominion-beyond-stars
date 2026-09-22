"use client";
import { useEffect, useMemo, useState } from "react";

type Star={id:number;name:string;x:number;y:number;neighbors:number[];owner:number|null;surveyed:boolean;richness:number;habitable:boolean;population:number;station:boolean};
type Fleet={id:number;owner:number;name:string;system:number;ships:{corvette:number;frigate:number;cruiser:number};hp:number};
type Relation={score:number;status:"peace"|"rival"|"war"|"alliance";pact:boolean;claims:number[]};
type Empire={id:number;name:string;credits:number;alloys:number;science:number;influence:number;systems:number[];tech:number;relations:Record<number,Relation>};
type Game={turn:number;stars:Star[];empires:Empire[];fleets:Fleet[];player:number;log:string[];selected:number|null;selectedFleet:number|null;nextFleet:number};

const syl=["Ar","Bel","Cor","Dra","Eli","Fen","Gal","Hel","Iri","Jun","Ka","Lor","Mor","Nex","Ori","Pra","Qua","Ryn","Sol","Tor","Ul","Vor","Wen","Xan","Yor","Zen"];
const rn=(n:number)=>Math.floor(Math.random()*n), nm=()=>syl[rn(syl.length)]+syl[rn(syl.length)].toLowerCase()+rn(99);
const power=(f:Fleet,t:number)=>Math.round((f.ships.corvette*3+f.ships.frigate*6+f.ships.cruiser*13)*(1+(t-1)*.12)*(f.hp/100));
const rel=(a:Empire,b:number):Relation=>a.relations[b]??(a.relations[b]={score:0,status:"peace",pact:false,claims:[]});

function generate(count=900,ai=31):Game{
 const stars:Star[]=[];
 for(let i=0;i<count;i++)stars.push({id:i,name:nm(),x:40+Math.random()*1520,y:40+Math.random()*1120,neighbors:[],owner:null,surveyed:false,richness:1+rn(5),habitable:Math.random()<.17,population:0,station:false});
 for(let i=0;i<count;i++){const near=[...stars].filter(s=>s.id!==i).sort((a,b)=>Math.hypot(a.x-stars[i].x,a.y-stars[i].y)-Math.hypot(b.x-stars[i].x,b.y-stars[i].y)).slice(0,3+rn(3));for(const n of near){if(!stars[i].neighbors.includes(n.id))stars[i].neighbors.push(n.id);if(!stars[n.id].neighbors.includes(i))stars[n.id].neighbors.push(i)}}
 const empires:Empire[]=Array.from({length:ai+1},(_,id)=>({id,name:id===0?"Terran Dominion":nm()+" Compact",credits:160,alloys:100,science:0,influence:45,systems:[],tech:1,relations:{}}));
 const fleets:Fleet[]=[];const used=new Set<number>();
 for(const e of empires){let s=rn(count);while(used.has(s))s=rn(count);used.add(s);stars[s].owner=e.id;stars[s].surveyed=e.id===0;stars[s].population=10;stars[s].station=true;e.systems.push(s);fleets.push({id:e.id,owner:e.id,name:e.id===0?"1st Expeditionary Fleet":nm()+" Fleet",system:s,ships:{corvette:6,frigate:1,cruiser:0},hp:100})}
 for(const a of empires)for(const b of empires)if(a.id!==b.id)a.relations[b.id]={score:rn(41)-20,status:"peace",pact:false,claims:[]};
 return{turn:1,stars,empires,fleets,player:0,log:["The interstellar age begins. Your first fleet awaits orders."],selected:empires[0].systems[0],selectedFleet:0,nextFleet:empires.length};
}

function capture(g:Game,winner:number,system:number){
 const s=g.stars[system],old=s.owner;if(old===winner)return;
 if(old!==null)g.empires[old].systems=g.empires[old].systems.filter(x=>x!==system);
 s.owner=winner;g.empires[winner].systems.push(system);s.station=false;
 g.log.unshift(`${g.empires[winner].name} seized ${s.name}.`);
}
function battle(g:Game,system:number){
 const here=g.fleets.filter(f=>f.system===system&&f.hp>0);
 for(let i=0;i<here.length;i++)for(let j=i+1;j<here.length;j++){
  const a=here[i],b=here[j];if(a.owner===b.owner)continue;
  if(rel(g.empires[a.owner],b.owner).status!=="war")continue;
  const ap=power(a,g.empires[a.owner].tech)*(0.8+Math.random()*.4),bp=power(b,g.empires[b.owner].tech)*(0.8+Math.random()*.4);
  const ad=Math.min(100,Math.round(bp/Math.max(1,ap)*55)),bd=Math.min(100,Math.round(ap/Math.max(1,bp)*55));a.hp-=ad;b.hp-=bd;
  g.log.unshift(`Battle at ${g.stars[system].name}: ${a.name} vs ${b.name}.`);
  if(a.hp<=0)g.log.unshift(`${a.name} was destroyed.`);if(b.hp<=0)g.log.unshift(`${b.name} was destroyed.`);
 }
 g.fleets=g.fleets.filter(f=>f.hp>0);
 const survivors=g.fleets.filter(f=>f.system===system);const owners=[...new Set(survivors.map(f=>f.owner))];
 if(owners.length===1){const w=owners[0],s=g.stars[system];if(s.owner!==null&&s.owner!==w&&rel(g.empires[w],s.owner).status==="war")capture(g,w,system)}
}

function tick(g:Game):Game{
 const ng=structuredClone(g) as Game;ng.turn++;
 for(const e of ng.empires){
  const owned=e.systems.map(id=>ng.stars[id]),pops=owned.reduce((a,s)=>a+s.population,0);e.credits+=owned.length*2+pops*.4;e.alloys+=owned.filter(s=>s.station).length*1.3;e.science+=owned.length*.7;e.influence+=1;
  if(e.science>=45*e.tech){e.science-=45*e.tech;e.tech++;if(e.id===0)ng.log.unshift(`Technology tier ${e.tech} achieved.`)}
  for(const sid of e.systems){const s=ng.stars[sid];if(s.population>0&&Math.random()<.25)s.population++}
  if(e.id===0)continue;
  const myF=ng.fleets.filter(f=>f.owner===e.id);
  if(e.alloys>=45&&myF.length<Math.max(2,Math.ceil(e.systems.length/5))){e.alloys-=45;ng.fleets.push({id:ng.nextFleet++,owner:e.id,name:nm()+" Fleet",system:e.systems[rn(e.systems.length)],ships:{corvette:5+rn(4),frigate:rn(3),cruiser:e.tech>=3?rn(2):0},hp:100})}
  const frontier=[...new Set(e.systems.flatMap(id=>ng.stars[id].neighbors))].filter(id=>ng.stars[id].owner===null);
  if(frontier.length&&e.influence>=8){const id=frontier[rn(frontier.length)];ng.stars[id].owner=e.id;e.systems.push(id);e.influence-=8;if(Math.random()<.35)ng.stars[id].station=true}
  for(const f of myF){const hostileNeighbors=ng.stars[f.system].neighbors.filter(id=>{const o=ng.stars[id].owner;return o!==null&&o!==e.id&&rel(e,o).status==="war"});if(hostileNeighbors.length&&Math.random()<.55){f.system=hostileNeighbors[rn(hostileNeighbors.length)];battle(ng,f.system)}}
  if(ng.turn%8===0){const others=ng.empires.filter(x=>x.id!==e.id);const t=others[rn(others.length)],r=rel(e,t.id);if(r.status==="peace"&&r.score<-12&&Math.random()<.09){r.status="war";rel(t,e.id).status="war";ng.log.unshift(`${e.name} declared war on ${t.name}.`)}}
 }
 if(ng.turn%5===0)ng.log.unshift(`Turn ${ng.turn}: ${ng.fleets.length} active fleets operate across the galaxy.`);
 localStorage.setItem("dominion-save-v2",JSON.stringify(ng));return ng;
}

export default function Home(){
 const [game,setGame]=useState<Game|null>(null),[tab,setTab]=useState("Galaxy"),[dip,setDip]=useState<number|null>(null);
 useEffect(()=>{const s=localStorage.getItem("dominion-save-v2");setGame(s?JSON.parse(s):generate())},[]);
 const p=game?.empires[0],selected=useMemo(()=>game?.stars.find(s=>s.id===game.selected)||null,[game]),sf=game?.fleets.find(f=>f.id===game.selectedFleet);
 if(!game||!p)return <main>Generating galaxy…</main>;
 const act=(fn:(g:Game)=>void)=>setGame(old=>{const n=structuredClone(old!) as Game;fn(n);localStorage.setItem("dominion-save-v2",JSON.stringify(n));return n});
 const survey=()=>selected&&act(g=>{const s=g.stars[selected.id];if(!s.surveyed){s.surveyed=true;g.log.unshift(`Surveyed ${s.name}: richness ${s.richness}/5${s.habitable?", habitable world":""}.`)}});
 const claim=()=>selected&&act(g=>{const s=g.stars[selected.id],e=g.empires[0];if(s.owner===null&&s.surveyed&&e.influence>=8){s.owner=0;e.systems.push(s.id);e.influence-=8;g.log.unshift(`Claim established in ${s.name}.`)}});
 const station=()=>selected&&act(g=>{const s=g.stars[selected.id];if(s.owner===0&&!s.station&&p.alloys>=25){s.station=true;g.empires[0].alloys-=25}});
 const colonize=()=>selected&&act(g=>{const s=g.stars[selected.id];if(s.owner===0&&s.habitable&&!s.population&&p.credits>=60){s.population=3;g.empires[0].credits-=60;g.log.unshift(`Colony founded at ${s.name}.`)}});
 const buildFleet=()=>act(g=>{const e=g.empires[0];if(e.alloys>=45){e.alloys-=45;g.fleets.push({id:g.nextFleet++,owner:0,name:`Task Force ${g.nextFleet}`,system:e.systems[0],ships:{corvette:6,frigate:e.tech>=2?2:0,cruiser:e.tech>=3?1:0},hp:100});g.log.unshift("A new task force entered service.")}});
 const move=(to:number)=>sf&&act(g=>{const f=g.fleets.find(x=>x.id===sf.id);if(!f)return;if(g.stars[f.system].neighbors.includes(to)){f.system=to;g.stars[to].surveyed=true;g.selected=to;battle(g,to)}});
 const diplomacy=(id:number,kind:"improve"|"rival"|"war"|"peace"|"alliance")=>act(g=>{const a=g.empires[0],b=g.empires[id],r=rel(a,id),br=rel(b,0);if(kind==="improve"&&a.influence>=5){a.influence-=5;r.score=Math.min(100,r.score+20);br.score=r.score;g.log.unshift(`Relations improved with ${b.name}.`)}if(kind==="rival"){r.status="rival";br.status="rival";r.score-=20}if(kind==="war"){r.status="war";br.status="war";g.log.unshift(`War declared on ${b.name}.`)}if(kind==="peace"&&r.status==="war"){r.status="peace";br.status="peace";g.log.unshift(`Peace concluded with ${b.name}.`)}if(kind==="alliance"&&r.score>=40){r.status="alliance";br.status="alliance";g.log.unshift(`Alliance formed with ${b.name}.`)}});

 return <main>
  <div className="top"><div className="brand"><h1>Dominion: Beyond the Stars</h1><p>Turn {game.turn} · {game.stars.length} systems · {game.empires.length} civilizations</p></div><button onClick={()=>setGame(tick(game))}>End Turn</button></div>
  <div className="statrow"><div className="stat"><b>{Math.floor(p.credits)}</b><span>Credits</span></div><div className="stat"><b>{Math.floor(p.alloys)}</b><span>Alloys</span></div><div className="stat"><b>{Math.floor(p.influence)}</b><span>Influence</span></div></div>

  {tab==="Galaxy"&&<div className="grid two" style={{marginTop:10}}><div className="card"><div className="map"><div className="mapinner">
   {game.stars.flatMap(s=>s.neighbors.filter(n=>n>s.id).map(n=>{const t=game.stars[n],dx=t.x-s.x,dy=t.y-s.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;return <div key={`l${s.id}-${n}`} className="line" style={{left:s.x,top:s.y,width:len,transform:`rotate(${ang}deg)`}}/>}))}
   {game.stars.map(s=><button aria-label={s.name} key={s.id} onClick={()=>act(g=>{g.selected=s.id})} className={`star ${s.owner===0?"owned":s.owner!==null?"enemy":""} ${s.surveyed?"known":""}`} style={{left:s.x,top:s.y}}/>)}
  </div></div></div><div className="card"><h3>{selected?.name||"Select a system"}</h3>{selected&&<><p className="muted">Owner: {selected.owner===null?"Unclaimed":game.empires[selected.owner].name}<br/>Richness: {selected.surveyed?selected.richness:"Unknown"} · Habitable: {selected.surveyed?(selected.habitable?"Yes":"No"):"Unknown"}<br/>Population: {selected.population} · Station: {selected.station?"Yes":"No"}</p><div className="actions"><button onClick={survey}>Survey</button><button onClick={claim}>Claim</button><button onClick={station}>Build Station</button><button onClick={colonize}>Colonize</button></div>{sf&&game.stars[sf.system].neighbors.includes(selected.id)&&<button style={{marginTop:8,width:"100%"}} onClick={()=>move(selected.id)}>Move {sf.name} here</button>}</>}</div></div>}

  {tab==="Empire"&&<div className="card" style={{marginTop:10}}><h3>Your Empire</h3><div className="list"><div className="row"><span>Controlled systems</span><b>{p.systems.length}</b></div><div className="row"><span>Population</span><b>{p.systems.reduce((a,id)=>a+game.stars[id].population,0)}</b></div><div className="row"><span>Technology tier</span><b>{p.tech}</b></div><div className="row"><span>Wars</span><b>{Object.values(p.relations).filter(r=>r.status==="war").length}</b></div></div></div>}

  {tab==="Fleets"&&<div className="card" style={{marginTop:10}}><h3>Fleet Command</h3><div className="actions"><button onClick={buildFleet}>Commission Fleet (45 alloys)</button></div><div className="list" style={{marginTop:10}}>{game.fleets.filter(f=>f.owner===0).map(f=><button className={game.selectedFleet===f.id?"active":""} key={f.id} onClick={()=>{act(g=>{g.selectedFleet=f.id;g.selected=f.system});setTab("Galaxy")}}><b>{f.name}</b><br/><small>{game.stars[f.system].name} · Power {power(f,p.tech)} · Hull {f.hp}% · C {f.ships.corvette}/F {f.ships.frigate}/R {f.ships.cruiser}</small></button>)}</div></div>}

  {tab==="Research"&&<div className="card" style={{marginTop:10}}><h3>Research</h3><p>Technology tier: <b>{p.tech}</b></p><p>Progress: {Math.floor(p.science)} / {45*p.tech}</p><p className="muted">Higher technology increases fleet effectiveness and unlocks heavier hulls.</p></div>}

  {tab==="Diplomacy"&&<div className="card" style={{marginTop:10}}><h3>Diplomacy</h3><div className="list">{game.empires.slice(1).sort((a,b)=>b.systems.length-a.systems.length).map(e=>{const r=rel(p,e.id);return <div key={e.id}><button style={{width:"100%",textAlign:"left"}} onClick={()=>setDip(dip===e.id?null:e.id)}><b>{e.name}</b> · <span className={r.status==="war"?"bad":r.status==="alliance"?"good":""}>{r.status.toUpperCase()}</span><br/><small>Relations {r.score} · {e.systems.length} systems · tech {e.tech} · fleet power {game.fleets.filter(f=>f.owner===e.id).reduce((a,f)=>a+power(f,e.tech),0)}</small></button>{dip===e.id&&<div className="actions" style={{padding:"8px 0"}}><button onClick={()=>diplomacy(e.id,"improve")}>Improve</button><button onClick={()=>diplomacy(e.id,"rival")}>Rival</button><button onClick={()=>diplomacy(e.id,"war")}>Declare War</button><button onClick={()=>diplomacy(e.id,"peace")}>Offer Peace</button><button onClick={()=>diplomacy(e.id,"alliance")}>Alliance</button></div>}</div>})}</div></div>}

  <div className="card" style={{marginTop:10}}><h3>Situation Log</h3><div className="log">{game.log.slice(0,40).map((x,i)=><div key={i}>{x}</div>)}</div></div>
  <div className="tabs">{["Galaxy","Empire","Fleets","Research","Diplomacy"].map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div>
 </main>
}