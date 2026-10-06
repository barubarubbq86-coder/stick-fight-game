/** Only active with at least three surviving teams; no per-frame all-pairs search. */
export class MultiFront{
 constructor(battle){this.battle=battle;this.center=null;this.nextRefresh=0;this.active=false;this.centers=[];this.pressure=Array.from({length:4},()=>[0,0,0,0]);this.refresh();}
 refresh(){const b=this.battle;this.nextRefresh=b.time+.75;this.active=b.alive.filter(n=>n>0).length>=3;if(!this.active)return;
  this.centers=b.teams.map(a=>{let x=0,z=0,n=0;for(const u of a)if(u.hp>0){x+=u.x;z+=u.z;n++;}return n?{x:x/n,z:z/n}:null;});
  if(!this.center){const a=this.centers.filter(Boolean);this.center={x:a.reduce((s,p)=>s+p.x,0)/a.length,z:a.reduce((s,p)=>s+p.z,0)/a.length};}
  this.nextRefresh=b.time+.75;
 }
 update(){if(this.battle.time>=this.nextRefresh||this.active&&this.battle.alive.filter(n=>n>0).length<3)this.refresh();}
 claim(from,to,amount){this.pressure[from][to]=Math.max(0,this.pressure[from][to]+amount);}
 preferred(u){const enemies=this.centers.map((p,t)=>p&&t!==u.team?t:-1).filter(t=>t>=0);return enemies[(u.id*7+Math.floor(this.battle.time/6))%enemies.length];}
 score(u,v,current,preferred){const d=Math.hypot(u.x-v.x,u.z-v.z),load=Math.max(0,v.targeters-(v===current?1:0));
  // Local danger wins over distant preferences. Biases break equivalent choices.
  const close=d<=Math.min(6,u.data.range+1.5),threat=u.lastThreat?.id===v.id&&this.battle.time-u.lastThreat.time<3;
  return d+load*(u.data.aiType==='melee'?1.35:.5)+(this.pressure[u.team][v.team]/Math.max(1,this.battle.alive[u.team]))*5-(v.team===preferred?8:0)-(close?10:0)-(threat?3:0)-(v===current?1:0);
 }
 route(u,v){if(!this.active||!Number.isFinite(u.data.range)||u.id%10>=7||u.controller.rallied)return null;
  const c=this.center,d=Math.hypot(c.x-u.x,c.z-u.z),enemy=Math.hypot(v.x-u.x,v.z-u.z);
  if(d<7){u.controller.rallied=true;return null;}
  if(enemy<=Math.min(6,u.data.range+1))return null;
  // Different ingress points produce crossing fronts, not a single crowded point.
  const a=u.id*2.3999632297;return {x:c.x+Math.cos(a)*3,z:c.z+Math.sin(a)*3};
 }
 findEnemy(u,current,avoid){const b=this.battle;let best=null,score=Infinity;const preferred=this.preferred(u);
  const scan=r=>b.grid.visit(u.x,u.z,r,a=>{for(let j=0;j<Math.min(a.length,16);j++){const v=a[(u.id*13+j+Math.floor(b.time*2))%a.length];if(v.team===u.team||v.hp<=0||v===avoid)continue;const d=Math.hypot(u.x-v.x,u.z-v.z);if(d>r)continue;
   const s=this.score(u,v,current,preferred);if(s<score&&(!b.terrain.obstacles.length||d<=u.data.range||b.terrain.reachable(u.x,u.z,v.x,v.z,u.data.radius))){score=s;best=v;}
  }});
  scan(28);if(!best)scan(120);return best;
 }
}
