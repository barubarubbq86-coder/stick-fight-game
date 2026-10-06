import {teamIds} from './teams.js';
/** Aggregate at damage/spawn events, never by replaying a hit log each frame. */
export class BattleStats{
 constructor(){this.records=new Map();this.teams=teamIds.map(()=>({spawned:0,reinforcements:0,kills:0,damage:0,cost:0,divineDeaths:0}));}
 register(u,reinforcement=false){this.records.set(u.id,{id:u.id,team:u.team,type:u.type,kills:0,damage:0,alive:true});const t=this.teams[u.team];t.spawned++;t.cost+=u.data.cost;if(reinforcement)t.reinforcements++;}
 recordDamage(source,target,loss,killed){if(!(loss>0))return;const record=this.records.get(source?.id),victim=this.records.get(target.id),enemy=source&&source.team!==target.team;
  if(record&&enemy){record.damage+=loss;this.teams[record.team].damage+=loss;if(killed){record.kills++;this.teams[record.team].kills++;}}
  if(killed&&victim){victim.alive=false;if(source?.divine)this.teams[victim.team].divineDeaths++;}
 }
 summary(result,time,alive){let mvp=null,damageLeader=null;for(const r of this.records.values()){
  if(r.kills>0&&(!mvp||r.kills>mvp.kills||r.kills===mvp.kills&&(r.damage>mvp.damage||r.damage===mvp.damage&&r.id<mvp.id)))mvp=r;
  if(r.damage>0&&(!damageLeader||r.damage>damageLeader.damage||r.damage===damageLeader.damage&&r.id<damageLeader.id))damageLeader=r;
 }
 return {result,time,teams:this.teams.map((t,team)=>({...t,team,survivors:alive[team],deaths:t.spawned-alive[team]})),mvp:mvp?{...mvp}:null,damageLeader:damageLeader?{...damageLeader}:null};
 }
}
