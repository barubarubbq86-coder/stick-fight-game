import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Battle,Character} from '../simulation.js';
import {characterData} from '../data.js';
const originalRandom=Math.random,results=[];
for(const count of [300,600,1000,1500])for(const teams of [2,4])for(const ratio of [.05,.5,.95]){
 let seed=61;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const config=Array.from({length:4},(_,t)=>{const a=characterData.map(()=>0);if(t<teams){a[15]=Math.round(count/teams*ratio);const mix=[0,1,3,10,18];for(let i=0;i<count/teams-a[15];i++)a[mix[i%mix.length]]++;}return a;});
 const b=new Battle(config);let frame=null,max=null,totalDeaths=0;const massDeathFrames=[];const damage=b.stats.recordDamage.bind(b.stats),resolve=b.resolve.bind(b),launch=b.launch.bind(b);let serial=0;const active=new Map();
 b.launch=(...args)=>{launch(...args);const p=b.projectiles.at(-1);assert(!active.has(p),'pool reuses a live projectile');active.set(p,++serial);};
 b.resolve=(u,target,dam,kind,area,all,x,z)=>{frame.attacks.push({attacker:u.id,team:u.team,weapon:u.data.weapon,kind,all,damage:dam});return resolve(u,target,dam,kind,area,all,x,z);};
 b.stats.recordDamage=(source,target,loss,dead)=>{assert(Number.isFinite(loss)&&loss>=0);frame.damageEvents++;frame.deaths+=dead?1:0;damage(source,target,loss,dead);};
 for(let f=0;f<360&&!b.result;f++){
  const hp=[...b.hp];frame={frame:f,time:b.time,projectilesBefore:b.projectiles.length,attacks:[],damageEvents:0,deaths:0};
  b.step(1/30);frame.projectilesAfter=b.projectiles.length;frame.teamHpDelta=hp.map((v,t)=>b.hp[t]-v);
  for(const p of active.keys())if(!b.projectiles.includes(p))active.delete(p);
  assert.equal(new Set(b.projectiles).size,b.projectiles.length);assert(!b.projectiles.some(p=>b.projectilePool.includes(p)));
  for(let t=0;t<4;t++){assert.equal(b.alive[t],b.teams[t].filter(u=>u.hp>0).length);assert(Math.abs(b.hp[t]-b.teams[t].reduce((s,u)=>s+u.hp,0))<1e-6);}
  assert(b.units.every(u=>[u.hp,u.x,u.z,u.y,u.vx,u.vz].every(Number.isFinite)));
  totalDeaths+=frame.deaths;if(frame.deaths>=Math.max(10,count*.1))massDeathFrames.push(frame);if(!max||frame.deaths>max.deaths)max=frame;
 }
 results.push({count,teams,ratio,result:b.result,time:b.time,totalDeaths,massDeathFrames,maxDeathFrame:max});
}
// Controlled simultaneous impacts and reuse: one global hit per projectile, no ally/dead damage.
assert.equal(characterData[15].range,Infinity);assert.equal(characterData[15].damage[0],35);
const b=new Battle([[0],[0]]);b.result=null;
const a=new Character(1,0,15,0,0),enemy=new Character(2,1,18,10,0),ally=new Character(3,0,0,0,2);b.units=[a,enemy,ally];b.teams=[[a,ally],[enemy],[],[]];b.alive=[2,1,0,0];b.hp=[190,300,0,0];b.initial=[...b.hp];b.count=3;b.units.forEach(u=>{b.stats.register(u);u.spawnDelay=100;});
for(let i=0;i<3;i++)b.launch(a,enemy,35,'spear',0,true);b.step(1);assert.equal(enemy.hp,195);assert.equal(ally.hp,100);assert.equal(b.projectiles.length,0);b.step(.01);assert.equal(enemy.hp,195);
b.launch(a,enemy,35,'spear');assert.equal(b.projectiles[0].all,false);assert.equal(b.projectiles[0].area,0);b.step(1);assert.equal(enemy.hp,160);
enemy.receiveDamage(1000,a,'spear',b);const hp=b.hp[1],kills=b.stats.teams[0].kills;enemy.receiveDamage(1000,a,'spear',b);assert.equal(b.hp[1],hp);assert.equal(b.stats.teams[0].kills,kills);
Math.random=originalRandom;
fs.writeFileSync(new URL('phase61-mass-results.json',import.meta.url),JSON.stringify({method:'seed 61, total count, 30Hz, up to 12 simulation seconds; god abilities not used',results},null,2));console.log(results.map(r=>({n:r.count,teams:r.teams,ratio:r.ratio,deaths:r.totalDeaths,maxFrame:r.maxDeathFrame.deaths,time:r.time}))); 
