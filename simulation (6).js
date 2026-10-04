import {SandboxMode,assertPlacementAllowed} from './rules.js';
import {BattleStats} from './battle-stats.js';
import {teamIds,teamData,normalizeMultipliers} from './teams.js';
import {characterData} from './data.js';
import {Terrain} from './terrain.js';
export {Terrain} from './terrain.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Character{
 constructor(id,team,type,x,z,multipliers={hp:1,attack:1,speed:1}){this.id=id;this.team=team;this.type=type;this.data=characterData[type];this.multipliers={...multipliers};this.maxHp=this.data.hp*multipliers.hp;this.hp=this.maxHp;this.x=x;this.z=z;this.y=0;this.yaw=team?-Math.PI/2:Math.PI/2;this.cooldown=Math.random()*2;this.stun=0;this.flash=0;this.visualHit=0;this.motion=0;this.vx=0;this.vz=0;this.vy=0;this.deadTime=0;this.spawnDelay=0;this.targeters=0;this.attack=null;this.command={x:0,z:0,target:null,attack:false};this.controller=new AIController();}
 setController(controller){this.controller.releaseTarget?.();this.controller=controller;this.command={x:0,z:0,target:null,attack:false};}
 update(dt,battle){this.flash=Math.max(0,this.flash-dt);this.cooldown-=dt;this.stun=Math.max(0,this.stun-dt);this.motion+=dt;const ground=battle.terrain.heightAt(this.x,this.z),grounded=this.y<=ground+.02&&this.vy<=0;const next=battle.terrain.move(this.x,this.z,this.x+this.vx*dt,this.z+this.vz*dt,this.data.radius);this.x=next.x;this.z=next.z;this.vx*=Math.exp(-5*dt);this.vz*=Math.exp(-5*dt);if(!grounded||this.vy>0){this.y=Math.max(ground,this.y+this.vy*dt);this.vy-=12*dt;if(this.y<=ground){this.y=ground;this.vy=0;}}else{this.y=ground;this.vy=0;}

 if(this.hp<=0){this.deadTime+=dt;return;}if(battle.result){this.command={x:0,z:0,attack:false,target:null};if(this.attack){this.attack.time+=dt;if(this.attack.time>=this.data.windup+.45)this.attack=null;}return;}if(this.spawnDelay>0){this.spawnDelay=Math.max(0,this.spawnDelay-dt);return;}if(this.stun>0)return;
 if(this.attack){this.attack.time+=dt;if(!this.attack.fired&&this.attack.time>=this.data.windup){battle.performAttack(this,this.attack.target);this.attack.fired=true;}if(this.attack.time>=this.data.windup+.45)this.attack=null;return;}
 const cmd=this.command;let len=Math.hypot(cmd.x,cmd.z);if(len>0){const step=this.data.speed*this.multipliers.speed*dt;const nx=this.x+cmd.x/len*step,nz=this.z+cmd.z/len*step;const pos=battle.terrain.move(this.x,this.z,nx,nz,this.data.radius);this.x=pos.x;this.z=pos.z;this.yaw=Math.atan2(cmd.x,cmd.z);}this.x=Math.max(-49,Math.min(49,this.x));this.z=Math.max(-34,Math.min(34,this.z));this.y=grounded?battle.terrain.heightAt(this.x,this.z):Math.max(battle.terrain.heightAt(this.x,this.z),this.y);
 if(cmd.target&&cmd.target.hp>0){this.yaw=Math.atan2(cmd.target.x-this.x,cmd.target.z-this.z);if(cmd.attack&&this.cooldown<=0&&distance(this,cmd.target)<=this.data.range+1){this.attack={target:cmd.target,time:0,fired:false};this.cooldown=this.data.interval+this.data.windup;}}
 }
 receiveDamage(amount,source,kind,battle){if(battle.result||this.hp<=0||this.data.immune)return;let loss=Math.min(this.hp,amount);this.hp-=loss;battle.hp[this.team]-=loss;battle.stats.recordDamage(source,this,loss,this.hp<=0);this.flash=.18;this.visualHit++;source.visualHit=(source.visualHit||0)+1;let dx=this.x-source.x,dz=this.z-source.z,len=Math.hypot(dx,dz)||1;let force=['hammer','muscle','gigant','water','fire','lightning','dumbbell'].includes(kind)?7:2;this.vx=dx/len*force;this.vz=dz/len*force;this.vy=force*.45;this.stun=kind==='water'?1.3:.15;if(this.hp<=0){this.controller.releaseTarget?.();battle.alive[this.team]--;this.attack=null;this.deadTime=.01;this.vy=Math.max(this.vy,3);battle.checkResult();}}
}
export class SpatialGrid{
 constructor(cell=4){this.cell=cell;this.cells=new Map();this.pool=[];}
 rebuild(units){for(const a of this.cells.values()){a.length=0;this.pool.push(a);}this.cells.clear();for(const u of units){if(u.hp<=0)continue;let key=`${Math.floor(u.x/this.cell)},${Math.floor(u.z/this.cell)}`;let a=this.cells.get(key);if(!a){a=this.pool.pop()||[];this.cells.set(key,a);}a.push(u);}}
 insert(u){const key=`${Math.floor(u.x/this.cell)},${Math.floor(u.z/this.cell)}`;let a=this.cells.get(key);if(!a){a=this.pool.pop()||[];this.cells.set(key,a);}a.push(u);}
 visit(x,z,r,fn){let c=this.cell;for(let i=Math.floor((x-r)/c);i<=Math.floor((x+r)/c);i++)for(let j=Math.floor((z-r)/c);j<=Math.floor((z+r)/c);j++){const a=this.cells.get(`${i},${j}`);if(a)fn(a);}}
}
export class AIController{
 constructor(){this.target=null;this.claimedTarget=null;this.nextThink=0;this.nextPath=0;this.stuckTime=0;}
 releaseTarget(){if(this.claimedTarget)this.claimedTarget.targeters=Math.max(0,this.claimedTarget.targeters-1);this.claimedTarget=null;this.target=null;}
 setTarget(target){if(this.claimedTarget===target){this.target=target;return;}this.releaseTarget();this.target=target;this.claimedTarget=target;if(target)target.targeters++;this.pathDir=null;}
 update(u,b,dt){
  if(b.time>=this.nextThink||!this.target||this.target.hp<=0){
   const elapsed=Math.min(1,b.time-(this.lastThink??b.time)),moved=Math.hypot(u.x-(this.lastX??u.x),u.z-(this.lastZ??u.z));
   const pursuing=this.target&&distance(u,this.target)>u.data.range&&Math.hypot(u.command.x,u.command.z)>.1;
   this.stuckTime=b.terrain.obstacles.length&&pursuing&&moved<.08?this.stuckTime+elapsed:0;
   const avoid=this.stuckTime>1.2?this.target:null;
   this.lastX=u.x;this.lastZ=u.z;this.lastThink=b.time;this.nextThink=b.time+.25+(u.id%7)*.025;
   this.setTarget(b.findEnemy(u,this.target,avoid));if(avoid){this.stuckTime=0;this.nextPath=0;}
  }
  const v=this.target;if(!v){u.command={x:0,z:0,target:null,attack:false};return;}
  const dx=v.x-u.x,dz=v.z-u.z,d=Math.hypot(dx,dz)||1,r=u.data.range;
  let gx=v.x,gz=v.z,move=d>r*.88?1:(u.data.aiType==='ranged'&&Number.isFinite(r)&&d<r*.45?-1:0);
  // Nearby melee units approach distinct positions around a target, rather than its center.
  if(u.data.aiType==='melee'&&d<5){const angle=u.id*2.3999632297,ring=r*.78;let x=v.x+Math.cos(angle)*ring,z=v.z+Math.sin(angle)*ring;
   if(b.terrain.canOccupy(x,z,u.data.radius)&&(!b.terrain.obstacles.length||b.terrain.reachable(u.x,u.z,x,z,u.data.radius))){gx=x;gz=z;move=Math.hypot(gx-u.x,gz-u.z)>.22?1:0;}}
  let vx=gx-u.x,vz=gz-u.z,len=Math.hypot(vx,vz)||1,dir={x:vx/len,z:vz/len};
  if(b.terrain.obstacles.length&&move>0){const cell=b.terrain.index(u.x,u.z);
   if(!this.pathDir||b.time>=this.nextPath||this.pathCell!==cell||Math.hypot(gx-this.pathX,gz-this.pathZ)>1){this.pathDir=b.terrain.direction(u.x,u.z,gx,gz,u.data.radius);this.nextPath=b.time+.25;this.pathCell=cell;this.pathX=gx;this.pathZ=gz;}
   dir=this.pathDir;
  }
  let push=move?b.allySteering(u):{x:0,z:0};u.command={x:dir.x*move+push.x,z:dir.z*move+push.z,target:v,attack:d<=r};
 }
}
export class Battle{
 constructor(config,stage=null,mode=new SandboxMode()){this.mode=mode;this.rules=mode.rules;this.report=null;this.units=[];this.multipliers=normalizeMultipliers(stage?.multipliers);this.teams=teamIds.map(()=>[]);this.initial=teamIds.map(()=>0);this.hp=teamIds.map(()=>0);this.alive=teamIds.map(()=>0);this.effects=[];this.effectPool=[];this.projectiles=[];this.projectilePool=[];this.grid=new SpatialGrid();this.time=0;this.result=null;this.endingTime=0;this.terrain=new Terrain(stage?.terrain||[]);this.count=config.flat().reduce((a,b)=>a+b,0);this.events=0;this.nextPrune=2;let id=0;
 if(!stage)config.forEach((counts,t)=>counts.forEach((n,k)=>{for(let j=0;j<n;j++){// Three battlefronts with depth and space between individuals.
 let lane=id%3,z=(lane-1)*20+(Math.random()-.5)*12,x=(t%2?1:-1)*(7+Math.random()*29);if(t>=2)z=(t===2?-1:1)*(16+Math.random()*14);let u=new Character(id++,t,k,x,z,this.multipliers[t]);this.units.push(u);this.teams[t].push(u);this.initial[t]+=u.hp;this.alive[t]++;}}));if(stage){for(const rec of stage.units){let u=new Character(rec.id,rec.team,rec.type,rec.x,rec.z,this.multipliers[rec.team]);u.yaw=rec.yaw;u.y=this.terrain.heightAt(u.x,u.z);this.units.push(u);this.teams[u.team].push(u);this.initial[u.team]+=u.hp;this.alive[u.team]++;id=Math.max(id,u.id+1);}this.count=stage.units.length;}this.nextId=id;this.hp=[...this.initial];this.grid.rebuild(this.units);this.stats=new BattleStats();
 if(!this.rules.unrestricted)for(const team of teamIds)assertPlacementAllowed(this.rules,{units:[]},team,this.teams[team]);for(const u of this.units)this.stats.register(u);
 }
 addCharacter(team,type,x,z){if(this.result||!teamIds.includes(team)||!Number.isInteger(type)||!characterData[type]||!Number.isFinite(x)||!Number.isFinite(z)||!this.terrain.canOccupy(x,z,characterData[type].radius))return null;
 if(!this.rules.canPlace({team,type,x,z,totalCost:this.stats.teams[team].cost+characterData[type].cost}))return null;
 const u=new Character(this.nextId++,team,type,x,z,this.multipliers[team]);this.stats.register(u,true);u.y=this.terrain.heightAt(x,z);u.spawnDelay=.35;this.units.push(u);this.teams[team].push(u);this.initial[team]+=u.hp;this.hp[team]+=u.hp;this.alive[team]++;this.count++;this.grid.insert(u);this.fx('spawn',x,z,team,1.2);return u;}
 findEnemy(u,current=null,avoid=null){
  for(const r of [5,12,28,100]){let best=null,score=Infinity;
   this.grid.visit(u.x,u.z,r,a=>{for(let j=0;j<Math.min(a.length,16);j++){
    const v=a[(u.id*13+j)%a.length];if(v.team===u.team||v.hp<=0||v===avoid)continue;
    const d=distance(u,v),load=Math.max(0,v.targeters-(v===current?1:0));
    const s=d+load*(u.data.aiType==='melee'?1.15:.45)-(v===current?.7:0);
    if(s<score&&(!this.terrain.obstacles.length||d<=u.data.range||this.terrain.reachable(u.x,u.z,v.x,v.z,u.data.radius))){score=s;best=v;}
   }});if(best)return best;
  }return null;
 }
 allySteering(u){let x=0,z=0;this.grid.visit(u.x,u.z,u.data.radius+1.7,a=>{for(let j=0;j<Math.min(a.length,8);j++){
  const v=a[(u.id*11+j)%a.length];if(v===u||v.team!==u.team||v.hp<=0)continue;
  let dx=u.x-v.x,dz=u.z-v.z,d=Math.hypot(dx,dz),r=u.data.radius+v.data.radius+.35;
  if(d>=r)continue;if(d<.001){const angle=(u.id+v.id)*2.3999632297,sign=u.id<v.id?1:-1;dx=Math.cos(angle)*sign;dz=Math.sin(angle)*sign;d=1;}
  const weight=Math.max(.1,(r-Math.min(d,r))/r);x+=dx/d*weight;z+=dz/d*weight;
 }});const length=Math.hypot(x,z),scale=length>.65?.65/length:1;return {x:x*scale,z:z*scale};}
 fx(kind,x,z,team,radius=1){if(this.effects.length>=180)return;let e=this.effectPool.pop()||{};Object.assign(e,{kind,x,z,team,radius,time:0,duration:kind==='dumbbell'?1.2:.7});this.effects.push(e);}
 launch(u,v,damage,kind,area=0,all=false,offset=0){let p=this.projectilePool.pop()||{};Object.assign(p,{x:u.x,y:1.1,z:u.z,sx:u.x,sz:u.z,sy:u.y+1.1,ty:v.y+1.1,tx:v.x,tz:v.z,target:v,source:u,damage,kind,area,all,time:-offset,duration:kind==='dumbbell'?1.1:Math.max(.3,Math.min(1.2,distance(u,v)/22))});this.projectiles.push(p);}
 performAttack(u,v){if(this.result)return;if(!v||v.hp<=0){v=this.findEnemy(u);if(!v)return;}this.events++;let c=u.data,w=c.weapon,kind=w,damage=c.damage,area=0,all=false;
 if(['water','fire'].includes(w)&&Math.random()<c.specialChance){damage=[c.specialDamage];area=w==='water'?5.5:7;}
 if(w==='allSpear'){kind='spear';all=true;}if(w==='katana')all=true;
 if(w==='god'){let n=Math.floor(Math.random()*3);kind=['katana','lightning','dumbbell'][n];damage=[c.damage[n]];all=n!==2;area=n===2?12:0;}
 if(w==='muscle'){kind='muscle';area=Math.random()<.34?2.8:0;}
 if(w==='gigant'){kind='gigant';area=4.4;}
 damage=damage.map(d=>d*u.multipliers.attack);
 if(['spear','water','fire','dumbbell'].includes(kind)){if(all){this.launch(u,v,damage[0],'spear',0,true);this.fx('allSpear',u.x,u.z,u.team,15);}else if(area){this.launch(u,v,damage[0],kind,area);if(kind==='water')for(let i=1;i<5;i++)this.fx('water',u.x+i*.4,u.z,u.team,.3);}else damage.forEach((d,i)=>this.launch(u,v,d,kind,0,false,i*.09));}
 else {this.resolve(u,v,damage,kind,area,all,v.x,v.z);this.fx(kind,v.x,v.z,u.team,all?22:area||1.5);}}
 resolve(u,target,damage,kind,area,all,x,z){if(all){for(const t of teamIds)if(t!==u.team)for(const v of this.teams[t])if(v.hp>0)v.receiveDamage(damage[0],u,kind,this);}
 else if(area){this.grid.visit(x,z,area,a=>{for(const v of a)if(v.team!==u.team&&v.hp>0&&Math.hypot(v.x-x,v.z-z)<=area)v.receiveDamage(damage[0],u,kind,this);});}
 else{for(let d of damage){let v=target&&target.hp>0?target:this.findEnemy(u);if(v&&distance(u,v)<=u.data.range+2)v.receiveDamage(d,u,kind,this);}}}
 separate(dt){for(const u of this.units){if(u.hp<=0)continue;let dx=0,dz=0;this.grid.visit(u.x,u.z,u.data.radius+1.7,a=>{for(let j=0;j<Math.min(a.length,18);j++){
  const v=a[(u.id+Math.floor(this.time*30)+j)%a.length];if(v===u||v.hp<=0)continue;
  let x=u.x-v.x,z=u.z-v.z,d=Math.hypot(x,z),r=u.data.radius+v.data.radius+(u.team===v.team?.14:0);
  if(d>=r)continue;if(d<.001){const angle=(u.id+v.id)*2.3999632297,sign=u.id<v.id?1:-1;x=Math.cos(angle)*sign*.01;z=Math.sin(angle)*sign*.01;d=.01;}
  dx+=x/d*(r-d);dz+=z/d*(r-d);
 }});if(dx||dz){let scale=Math.min(.5,dt*10),length=Math.hypot(dx,dz);if(length*scale>.4)scale=.4/length;
 const p=this.terrain.move(u.x,u.z,u.x+dx*scale,u.z+dz*scale,u.data.radius);u.x=p.x;u.z=p.z;}}}
 checkResult(){if(this.result)return;const result=this.rules.evaluate(this);if(result){this.result=result;this.report=this.stats.summary(result,this.time,this.alive);}}
 step(dt){if(this.result){this.endingTime+=dt;for(const u of this.units)u.update(dt,this);for(let i=this.projectiles.length-1;i>=0;i--){let p=this.projectiles[i];p.time+=dt;if(p.time>=p.duration){this.fx(p.kind,p.tx,p.tz,p.source.team,p.area||1);this.projectilePool.push(p);this.projectiles.splice(i,1);}}for(let i=this.effects.length-1;i>=0;i--){let e=this.effects[i];e.time+=dt;if(e.time>e.duration){this.effectPool.push(e);this.effects.splice(i,1);}}return;}this.time+=dt;this.grid.rebuild(this.units);for(const u of this.units){if(!this.result&&u.hp>0&&u.stun<=0&&u.spawnDelay<=0&&!u.attack)u.controller.update(u,this,dt);u.update(dt,this);}this.separate(dt);
 for(let i=this.projectiles.length-1;i>=0;i--){let p=this.projectiles[i];p.time+=dt;if(p.time>=p.duration){if(p.all)this.resolve(p.source,p.target,[p.damage],p.kind,0,true,p.tx,p.tz);else if(p.area)this.resolve(p.source,p.target,[p.damage],p.kind,p.area,false,p.tx,p.tz);else if(p.target.hp>0&&Math.hypot(p.target.x-p.tx,p.target.z-p.tz)<3)p.target.receiveDamage(p.damage,p.source,p.kind,this);this.fx(p.kind,p.tx,p.tz,p.source.team,p.area||1);this.projectilePool.push(p);this.projectiles[i]=this.projectiles.at(-1);this.projectiles.pop();}}
 for(let i=this.effects.length-1;i>=0;i--){let e=this.effects[i];e.time+=dt;if(e.time>e.duration){this.effectPool.push(e);this.effects[i]=this.effects.at(-1);this.effects.pop();}}
 if(this.time>=this.nextPrune){this.units=this.units.filter(u=>u.hp>0||u.deadTime<2);this.teams=this.teams.map(a=>a.filter(u=>u.hp>0||u.deadTime<2));this.nextPrune=this.time+2;}
 this.checkResult();}
}
