"use client";
import { useEffect, useMemo, useState } from "react";

type Star = {id:number;name:string;x:number;y:number;neighbors:number[];owner:number|null;surveyed:boolean;richness:number;habitable:boolean;population:number;station:boolean};
type Empire = {id:number;name:string;credits:number;alloys:number;science:number;influence:number;systems:number[];tech:number;fleet:number;relations:Record<number,number>};
type Game = {turn:number;stars:Star[];empires:Empire[];player:number;log:string[];selected:number|null;};

const syllables=["Ar","Bel","Cor","Dra","Eli","Fen","Gal","Hel","Iri","Jun","Ka","Lor","Mor","Nex","Ori","Pra","Qua","Ryn","Sol","Tor","Ul","Vor","Wen","Xan","Yor","Zen"];
const rn=(n:number)=>Math.floor(Math.random()*n);
const name=()=>syllables[rn(syllables.length)]+syllables[rn(syllables.length)].toLowerCase()+rn(99);

function generate(count=900, ai=31):Game{
  const stars:Star[]=[];
  for(let i=0;i<count;i++) stars.push({id:i,name:name(),x:40+Math.random()*1520,y:40+Math.random()*1120,neighbors:[],owner:null,surveyed:false,richness:1+rn(5),habitable:Math.random()<.17,population:0,station:false});
  for(let i=0;i<count;i++){
    const near=[...stars].filter(s=>s.id!==i).sort((a,b)=>Math.hypot(a.x-stars[i].x,a.y-stars[i].y)-Math.hypot(b.x-stars[i].x,b.y-stars[i].y)).slice(0,3+rn(3));
    for(const n of near){ if(!stars[i].neighbors.includes(n.id)) stars[i].neighbors.push(n.id); if(!stars[n.id].neighbors.includes(i)) stars[n.id].neighbors.push(i); }
  }
  const empires:Empire[]=[];
  for(let e=0;e<ai+1;e++) empires.push({id:e,name:e===0?"Terran Dominion":name()+" Compact",credits:120,alloys:80,science:0,influence:40,systems:[],tech:1,fleet:20,relations:{}});
  const used=new Set<number>();
  for(const e of empires){
    let s=rn(count); while(used.has(s)) s=rn(count); used.add(s);
    stars[s].owner=e.id; stars[s].surveyed=e.id===0; stars[s].population=10; stars[s].station=true; e.systems.push(s);
  }
  return {turn:1,stars,empires,player:0,log:["Year 2200 equivalent: your civilization enters the interstellar age."],selected:empires[0].systems[0]};
}

function tick(g:Game):Game{
  const ng=structuredClone(g) as Game;
  ng.turn++;
  for(const e of ng.empires){
    const owned=e.systems.map(id=>ng.stars[id]);
    const stations=owned.filter(s=>s.station).length;
    const pops=owned.reduce((a,s)=>a+s.population,0);
    e.credits+=owned.length*2+pops*.4;
    e.alloys+=stations*1.2;
    e.science+=owned.filter(s=>s.surveyed||e.id!==0).length*.7;
    e.influence+=1;
    if(e.science>40*e.tech){e.science-=40*e.tech;e.tech++; if(e.id===0) ng.log.unshift(`Research breakthrough: technology tier ${e.tech} reached.`)}
    if(e.id!==0){
      const frontier=[...new Set(e.systems.flatMap(id=>ng.stars[id].neighbors))].filter(id=>ng.stars[id].owner===null);
      if(frontier.length&&e.influence>=8){const id=frontier[rn(frontier.length)];ng.stars[id].owner=e.id;e.systems.push(id);e.influence-=8;if(Math.random()<.45)ng.stars[id].station=true}
      if(e.alloys>50&&Math.random()<.18){e.fleet+=10+e.tech*2;e.alloys-=35}
      for(const sid of e.systems){const s=ng.stars[sid];if(s.habitable&&s.population===0&&e.credits>80&&Math.random()<.08){s.population=3;e.credits-=60}else if(s.population>0&&Math.random()<.3)s.population+=1}
    }
  }
  if(ng.turn%5===0) ng.log.unshift(`Turn ${ng.turn}: ${ng.empires.length} civilizations continue expanding across ${ng.stars.length} systems.`);
  localStorage.setItem("dominion-save",JSON.stringify(ng));
  return ng;
}

export default function Home(){
  const [game,setGame]=useState<Game|null>(null); const [tab,setTab]=useState("Galaxy");
  useEffect(()=>{const s=localStorage.getItem("dominion-save");setGame(s?JSON.parse(s):generate())},[]);
  const p=game?.empires[0];
  const selected=useMemo(()=>game?.stars.find(s=>s.id===game.selected)||null,[game]);
  if(!game||!p)return <main>Generating galaxy…</main>;
  const act=(fn:(g:Game)=>void)=>setGame(old=>{const n=structuredClone(old!) as Game;fn(n);localStorage.setItem("dominion-save",JSON.stringify(n));return n});

  const survey=()=>selected&&act(g=>{const s=g.stars[selected.id]; if(!s.surveyed){s.surveyed=true;g.log.unshift(`Survey complete: ${s.name}. Richness ${s.richness}/5${s.habitable?", habitable world detected":""}.`) }});
  const claim=()=>selected&&act(g=>{const s=g.stars[selected.id],e=g.empires[0]; if(s.owner===null&&e.influence>=8&&s.surveyed){s.owner=0;e.systems.push(s.id);e.influence-=8;g.log.unshift(`Claim established in ${s.name}.`) }});
  const station=()=>selected&&act(g=>{const s=g.stars[selected.id],e=g.empires[0];if(s.owner===0&&!s.station&&e.alloys>=25){s.station=true;e.alloys-=25;g.log.unshift(`Orbital station completed in ${s.name}.`) }});
  const colonize=()=>selected&&act(g=>{const s=g.stars[selected.id],e=g.empires[0];if(s.owner===0&&s.habitable&&s.population===0&&e.credits>=60){s.population=3;e.credits-=60;g.log.unshift(`Colony founded in ${s.name}.`) }});
  const buildFleet=()=>act(g=>{const e=g.empires[0];if(e.alloys>=35){e.alloys-=35;e.fleet+=12+e.tech*2;g.log.unshift("Fleet reinforcement completed.")}});
  const reset=()=>{const n=generate();localStorage.setItem("dominion-save",JSON.stringify(n));setGame(n)};

  return <main>
    <div className="top"><div className="brand"><h1>Dominion: Beyond the Stars</h1><p>Turn {game.turn} · {game.stars.length} systems · {game.empires.length} civilizations</p></div><button onClick={()=>setGame(tick(game))}>End Turn</button></div>
    <div className="statrow">
      <div className="stat"><b>{Math.floor(p.credits)}</b><span>Credits</span></div>
      <div className="stat"><b>{Math.floor(p.alloys)}</b><span>Alloys</span></div>
      <div className="stat"><b>{Math.floor(p.influence)}</b><span>Influence</span></div>
    </div>

    {tab==="Galaxy"&&<div className="grid two" style={{marginTop:10}}>
      <div className="card"><div className="map"><div className="mapinner">
        {game.stars.flatMap(s=>s.neighbors.filter(n=>n>s.id).map(n=>{const t=game.stars[n],dx=t.x-s.x,dy=t.y-s.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;return <div key={`l${s.id}-${n}`} className="line" style={{left:s.x,top:s.y,width:len,transform:`rotate(${ang}deg)`}}/>}))}
        {game.stars.map(s=><button aria-label={s.name} key={s.id} onClick={()=>act(g=>{g.selected=s.id})} className={`star ${s.owner===0?"owned":s.owner!==null?"enemy":""} ${s.surveyed?"known":""}`} style={{left:s.x,top:s.y}} />)}
      </div></div></div>
      <div className="card"><h3 style={{marginTop:0}}>{selected?.name||"Select a system"}</h3>{selected&&<>
        <p className="muted">Owner: {selected.owner===null?"Unclaimed":game.empires[selected.owner].name}<br/>Richness: {selected.surveyed?selected.richness:"Unknown"} · Habitable: {selected.surveyed?(selected.habitable?"Yes":"No"):"Unknown"}<br/>Population: {selected.population} · Station: {selected.station?"Yes":"No"}</p>
        <div className="actions"><button onClick={survey}>Survey</button><button onClick={claim}>Claim</button><button onClick={station}>Build Station</button><button onClick={colonize}>Colonize</button></div>
      </>}</div>
    </div>}

    {tab==="Empire"&&<div className="card" style={{marginTop:10}}><h3>Your Empire</h3><div className="list">
      <div className="row"><span>Controlled systems</span><b>{p.systems.length}</b></div>
      <div className="row"><span>Population</span><b>{p.systems.reduce((a,id)=>a+game.stars[id].population,0)}</b></div>
      <div className="row"><span>Technology tier</span><b>{p.tech}</b></div>
      <div className="row"><span>Fleet power</span><b>{p.fleet}</b></div>
    </div><div className="actions" style={{marginTop:10}}><button onClick={buildFleet}>Build Fleet (35 alloys)</button><button onClick={reset}>New Galaxy</button></div></div>}

    {tab==="Fleets"&&<div className="card" style={{marginTop:10}}><h3>Fleet Command</h3><p>Total fleet power: <b>{p.fleet}</b></p><p className="muted">Fleet construction scales with technology. Tactical combat and ship design are next-layer systems.</p><button onClick={buildFleet}>Build Reinforcements</button></div>}

    {tab==="Research"&&<div className="card" style={{marginTop:10}}><h3>Research</h3><p>Technology tier: <b>{p.tech}</b></p><p>Progress: {Math.floor(p.science)} / {40*p.tech}</p><p className="muted">Each controlled system contributes research. Later builds will split physics, society, engineering, traditions, and rare breakthroughs.</p></div>}

    {tab==="Diplomacy"&&<div className="card" style={{marginTop:10}}><h3>Known Powers</h3><div className="list">{game.empires.slice(1).sort((a,b)=>b.systems.length-a.systems.length).map(e=><div className="row" key={e.id}><span>{e.name}<small><br/>{e.systems.length} systems · tech {e.tech}</small></span><b>{e.fleet}</b></div>)}</div></div>}

    <div className="card" style={{marginTop:10}}><h3 style={{marginTop:0}}>Situation Log</h3><div className="log">{game.log.slice(0,30).map((x,i)=><div key={i}>{x}</div>)}</div></div>
    <div className="tabs">{["Galaxy","Empire","Fleets","Research","Diplomacy"].map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div>
  </main>
}