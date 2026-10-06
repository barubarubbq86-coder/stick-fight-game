import {godAbilities} from './god-abilities.js';
import {teamIds} from './teams.js';
/** Independent commands: future rules can prohibit, limit or adjust each ability. */
export class Interventions{
 constructor(battle){this.battle=battle;this.clock=0;this.readyAt={};this.uses=Object.fromEntries(Object.keys(godAbilities).map(k=>[k,0]));this.reinforced=0;this.damage=0;this.healing=0;this.kills=0;}
 tick(dt){if(Number.isFinite(dt)&&dt>0)this.clock+=dt;}
 state(key){const def=godAbilities[key];if(!def)return {allowed:false,ready:false,reason:'不明な能力です。'};const rule=this.battle.rules.godAbility(key),uses=this.uses[key],remaining=Math.max(0,(this.readyAt[key]||0)-this.clock),allowed=rule.enabled&&(rule.maxUses===null||uses<rule.maxUses)&&!this.battle.result;
  return {...rule,uses,remaining,allowed,ready:allowed&&remaining<=0,reason:this.battle.result?'決着後は使えません。':!rule.enabled?'このルールでは使用できません。':rule.maxUses!==null&&uses>=rule.maxUses?'使用回数の上限です。':remaining>0?`あと${remaining.toFixed(1)}秒`:''};
 }
 summary(){return {uses:{...this.uses},reinforced:this.reinforced,damage:this.damage,healing:this.healing,kills:this.kills};}
 use(key){const state=this.state(key);if(!state.ready)throw Error(state.reason);this.uses[key]++;this.readyAt[key]=this.clock+state.cooldown;}
 cast(key,x,z,{team=null,types=null,formation='square',density='normal'}={}){
  const b=this.battle,def=godAbilities[key],state=this.state(key);if(!state.ready)throw Error(state.reason);if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>=49||Math.abs(z)>=34)throw Error('戦場の地面をタップしてください。');
  if(key==='reinforcement'){const plan=b.planReinforcements(team,types,x,z,formation,density);this.use(key);const units=plan.units.map(u=>b.addCharacter(team,u.type,u.x,u.z));this.reinforced+=units.length;return {count:units.length,adjusted:plan.adjusted};}
  if(key==='heal'&&team!==null&&!teamIds.includes(team))throw Error('回復対象のTEAMを選んでください。');
  // Rebuild once per tap, so moving units are found in their current cells.
  b.grid.rebuild(b.units);this.use(key);const source={id:null,team:null,x,z,divine:true,visualHit:0};let count=0;
  b.deferResult(()=>{b.grid.visit(x,z,def.radius,cells=>{for(const u of cells){const d=Math.hypot(u.x-x,u.z-z);if(u.hp<=0||d>def.radius||key==='heal'&&team!==null&&u.team!==team)continue;
   if(key==='heal'){const amount=Math.max(0,Math.min(def.healing,u.maxHp-u.hp));if(amount===0)continue;u.hp+=amount;b.hp[u.team]+=amount;u.flash=.18;this.healing+=amount;count++;}
   else{const hp=u.hp;u.receiveDamage(def.damage,source,key==='lightning'?'lightning':'shock',b);this.damage+=hp-u.hp;if(hp>0&&u.hp<=0)this.kills++;count++;
    if(key==='shock'){const angle=d>.001?Math.atan2(u.z-z,u.x-x):u.id*2.3999632297,force=def.force*(.5+.5*(1-d/def.radius));u.vx=Math.cos(angle)*force;u.vz=Math.sin(angle)*force;u.vy=Math.max(u.vy,force*.6);u.stun=Math.max(u.stun,.4);}
   }
  }});b.fx(key==='lightning'?'divineLightning':key,x,z,0,def.radius);});return {count};
 }
}
