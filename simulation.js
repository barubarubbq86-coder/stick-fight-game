import {characterData} from './data.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Character{
 constructor(id,team,type,x,z){this.id=id;this.team=team;this.type=type;this.data=characterData[type];this.hp=this.data.hp;this.x=x;this.z=z;this.y=0;this.yaw=team?-Math.PI/2:Math.PI/2;this.cooldown=Math.random()*2;this.stun=0;this.flash=0;this.motion=0;this.vx=0;this.vz=0;this.vy=0;this.deadTime=0;this.spawnDelay=0;this.attack=null;this.command={x:0,z:0,target:null,attack:false};this.controller=new AIController();}
 setController(controller){this.controller=controller;this.command={x:0,z:0,target:null,attack:false};}
 update(dt,battle){this.flash=Math.max(0,this.flash-dt);this.cooldown-=dt;this.stun=Math.max(0,this.stun-dt);this.motion+=dt;this.x+=this.vx*dt;this.z+=this.vz*dt;this.vx*=Math.exp(-5*dt);this.vz*=Math.exp(-5*dt);if(this.y>0||this.vy>0){this.y=Math.max(0,this.y+this.vy*dt);this.vy-=12*dt;if(!this.y)this.vy=0;}
 if(this.hp<=0){this.deadTime+=dt;return;}if(this.spawnDelay>0){this.spawnDelay=Math.max(0,this.spawnDelay-dt);return;}if(this.stun>0)return;
 if(this.attack){this.attack.time+=dt;if(!this.attack.fired&&this.attack.time>=this.data.windup){battle.performAttack(this,this.attack.target);this.attack.fired=true;}if(this.attack.time>=this.data.windup+.45)this.attack=null;return;}
 const cmd=this.command;let len=Math.hypot(cmd.x,cmd.z);if(len>0){const step=this.data.speed*dt;const nx=this.x+cmd.x/len*step,nz=this.z+cmd.z/len*step;if(battle.terrain.canOccupy(nx,nz,this.data.radius)){this.x=nx;this.z=nz;}this.yaw=Math.atan2(cmd.x,cmd.z);}this.x=Math.max(-49,Math.min(49,this.x));this.z=Math.max(-34,Math.min(34,this.z));this.y=Math.max(battle.terrain.heightAt(this.x,this.z),this.y);
 if(cmd.target&&cmd.target.hp>0){this.yaw=Math.atan2(cmd.target.x-this.x,cmd.target.z-this.z);if(cmd.attack&&this.cooldown<=0&&distance(this,cmd.target)<=this.data.range+1){this.attack={target:cmd.target,time:0,fired:false};this.cooldown=this.data.interval+this.data.windup;}}
 }
 receiveDamage(amount,source,kind,battle){if(this.hp<=0||this.data.immune)return;let loss=Math.min(this.hp,amount);this.hp-=loss;battle.hp[this.team]-=loss;this.flash=.18;let dx=this.x-source.x,dz=this.z-source.z,len=Math.hypot(dx,dz)||1;let force=['hammer','muscle','water','fire','lightning','dumbbell'].includes(kind)?7:2;this.vx=dx/len*force;this.vz=dz/len*force;this.vy=force*.45;this.stun=kind==='water'?1.3:.15;if(this.hp<=0){battle.alive[this.team]--;this.attack=null;this.deadTime=.01;this.vy=Math.max(this.vy,3);}}
}
export class SpatialGrid{
 constructor(cell=4){this.cell=cell;this.cells=new Map();this.pool=[];}
 rebuild(units){for(const a of this.cells.values()){a.length=0;this.pool.push(a);}this.cells.clear();for(const u of units){if(u.hp<=0)continue;let key=`${Math.floor(u.x/this.cell)},${Math.floor(u.z/this.cell)}`;let a=this.cells.get(key);if(!a){a=this.pool.pop()||[];this.cells.set(key,a);}a.push(u);}}
 insert(u){const key=`${Math.floor(u.x/this.cell)},${Math.floor(u.z/this.cell)}`;let a=this.cells.get(key);if(!a){a=this.pool.pop()||[];this.cells.set(key,a);}a.push(u);}
 visit(x,z,r,fn){let c=this.cell;for(let i=Math.floor((x-r)/c);i<=Math.floor((x+r)/c);i++)for(let j=Math.floor((z-r)/c);j<=Math.floor((z+r)/c);j++){const a=this.cells.get(`${i},${j}`);if(a)fn(a);}}
}
export class AIController{
 constructor(){this.target=null;this.nextThink=0;}
 update(u,b,dt){if(b.time>=this.nextThink||!this.target||this.target.hp<=0){this.nextThink=b.time+.25+(u.id%7)*.025;this.target=b.findEnemy(u);}
 let v=this.target;if(!v){u.command={x:0,z:0,target:null,attack:false};return;}let dx=v.x-u.x,dz=v.z-u.z,d=Math.hypot(dx,dz)||1,r=u.data.range;
 let move=d>r*.88?1:(u.data.aiType==='ranged'&&Number.isFinite(r)&&d<r*.45?-1:0);
 // Different approach sides prevent a single battle line; movement itself belongs to Character.
 let flank=move>0&&d>4?Math.sin(u.id*2.4)*.28:0;u.command={x:dx/d*move-dz/d*flank,z:dz/d*move+dx/d*flank,target:v,attack:d<=r};}
}
export class Terrain{heightAt(x,z){return 0;}canOccupy(x,z,radius){return Math.abs(x)<49&&Math.abs(z)<34;}}
export class Battle{
 constructor(config){this.units=[];this.teams=[[],[]];this.initial=[0,0];this.hp=[0,0];this.alive=[0,0];this.effects=[];this.effectPool=[];this.projectiles=[];this.projectilePool=[];this.grid=new SpatialGrid();this.time=0;this.result=null;this.terrain=new Terrain();this.count=config.flat().reduce((a,b)=>a+b,0);this.events=0;this.nextPrune=2;let id=0;
 config.forEach((counts,t)=>counts.forEach((n,k)=>{for(let j=0;j<n;j++){// Three battlefronts with depth and space between individuals.
 let lane=id%3,z=(lane-1)*20+(Math.random()-.5)*12,x=(t?1:-1)*(7+Math.random()*29);let u=new Character(id++,t,k,x,z);this.units.push(u);this.teams[t].push(u);this.initial[t]+=u.hp;this.alive[t]++;}}));this.nextId=id;this.hp=[...this.initial];this.grid.rebuild(this.units);}
 addCharacter(team,type,x,z){if(this.result||![0,1].includes(team)||!Number.isInteger(type)||!characterData[type]||!Number.isFinite(x)||!Number.isFinite(z)||!this.terrain.canOccupy(x,z,characterData[type].radius))return null;
 const u=new Character(this.nextId++,team,type,x,z);u.y=this.terrain.heightAt(x,z);u.spawnDelay=.35;this.units.push(u);this.teams[team].push(u);this.initial[team]+=u.hp;this.hp[team]+=u.hp;this.alive[team]++;this.count++;this.grid.insert(u);this.fx('spawn',x,z,team,1.2);return u;}
 findEnemy(u){let best=null,score=Infinity;for(let r of [5,12,28,100]){this.grid.visit(u.x,u.z,r,a=>{for(let j=0;j<Math.min(a.length,16);j++){let v=a[(u.id*13+j)%a.length];if(v.team===u.team||v.hp<=0)continue;let d=distance(u,v),s=d+(v.id%7)*.12;if(s<score){score=s;best=v;}}});if(best)break;}return best;}
 fx(kind,x,z,team,radius=1){if(this.effects.length>=180)return;let e=this.effectPool.pop()||{};Object.assign(e,{kind,x,z,team,radius,time:0,duration:kind==='dumbbell'?1.2:.7});this.effects.push(e);}
 launch(u,v,damage,kind,area=0,all=false,offset=0){let p=this.projectilePool.pop()||{};Object.assign(p,{x:u.x,y:1.1,z:u.z,sx:u.x,sz:u.z,tx:v.x,tz:v.z,target:v,source:u,damage,kind,area,all,time:-offset,duration:kind==='dumbbell'?1.1:Math.max(.3,Math.min(1.2,distance(u,v)/22))});this.projectiles.push(p);}
 performAttack(u,v){if(!v||v.hp<=0){v=this.findEnemy(u);if(!v)return;}this.events++;let c=u.data,w=c.weapon,kind=w,damage=c.damage,area=0,all=false;
 if(['water','fire'].includes(w)&&Math.random()<c.specialChance){damage=[c.specialDamage];area=w==='water'?5.5:7;}
 if(w==='allSpear'){kind='spear';all=true;}if(w==='katana')all=true;
 if(w==='god'){let n=Math.floor(Math.random()*3);kind=['katana','lightning','dumbbell'][n];damage=[c.damage[n]];all=n!==2;area=n===2?12:0;}
 if(w==='muscle'){kind='muscle';area=Math.random()<.34?2.8:0;}
 if(['spear','water','fire','dumbbell'].includes(kind)){if(all){this.launch(u,v,35,'spear',0,true);this.fx('allSpear',u.x,u.z,u.team,15);}else if(area){this.launch(u,v,damage[0],kind,area);if(kind==='water')for(let i=1;i<5;i++)this.fx('water',u.x+i*.4,u.z,u.team,.3);}else damage.forEach((d,i)=>this.launch(u,v,d,kind,0,false,i*.09));}
 else {this.resolve(u,v,damage,kind,area,all,v.x,v.z);this.fx(kind,v.x,v.z,u.team,all?22:area||1.5);}}
 resolve(u,target,damage,kind,area,all,x,z){if(all){for(const v of this.teams[1-u.team])if(v.hp>0)v.receiveDamage(damage[0],u,kind,this);}
 else if(area){this.grid.visit(x,z,area,a=>{for(const v of a)if(v.team!==u.team&&v.hp>0&&Math.hypot(v.x-x,v.z-z)<=area)v.receiveDamage(damage[0],u,kind,this);});}
 else{for(let d of damage){let v=target&&target.hp>0?target:this.findEnemy(u);if(v&&distance(u,v)<=u.data.range+2)v.receiveDamage(d,u,kind,this);}}}
 separate(dt){for(const u of this.units){if(u.hp<=0)continue;let dx=0,dz=0,n=0;this.grid.visit(u.x,u.z,1.6,a=>{for(let j=0;j<Math.min(a.length,18);j++){let v=a[(u.id+j)%a.length];if(v===u||v.hp<=0)continue;let x=u.x-v.x,z=u.z-v.z,d=Math.hypot(x,z),r=u.data.radius+v.data.radius;if(d<r){if(d<.001){x=Math.cos(u.id)*.01;z=Math.sin(u.id)*.01;d=.01;}dx+=x/d*(r-d);dz+=z/d*(r-d);n++;}}});if(n){u.x+=dx*Math.min(.5,dt*8);u.z+=dz*Math.min(.5,dt*8);}}}
 step(dt){if(this.result)return;this.time+=dt;this.grid.rebuild(this.units);for(const u of this.units){if(u.hp>0&&u.stun<=0&&u.spawnDelay<=0&&!u.attack)u.controller.update(u,this,dt);u.update(dt,this);}this.separate(dt);
 for(let i=this.projectiles.length-1;i>=0;i--){let p=this.projectiles[i];p.time+=dt;if(p.time>=p.duration){if(p.all)this.resolve(p.source,p.target,[p.damage],p.kind,0,true,p.tx,p.tz);else if(p.area)this.resolve(p.source,p.target,[p.damage],p.kind,p.area,false,p.tx,p.tz);else if(p.target.hp>0&&Math.hypot(p.target.x-p.tx,p.target.z-p.tz)<3)p.target.receiveDamage(p.damage,p.source,p.kind,this);this.fx(p.kind,p.tx,p.tz,p.source.team,p.area||1);this.projectilePool.push(p);this.projectiles[i]=this.projectiles.at(-1);this.projectiles.pop();}}
 for(let i=this.effects.length-1;i>=0;i--){let e=this.effects[i];e.time+=dt;if(e.time>e.duration){this.effectPool.push(e);this.effects[i]=this.effects.at(-1);this.effects.pop();}}
 if(this.time>=this.nextPrune){this.units=this.units.filter(u=>u.hp>0||u.deadTime<2);this.teams=this.teams.map(a=>a.filter(u=>u.hp>0||u.deadTime<2));this.nextPrune=this.time+2;}
 if(!this.alive[0]||!this.alive[1])this.result=this.alive[0]?'TEAM A WIN':this.alive[1]?'TEAM B WIN':'DRAW';else if(this.teams.every(a=>a.filter(u=>u.hp>0).every(u=>u.data.immune)))this.result='DRAW';}
}
