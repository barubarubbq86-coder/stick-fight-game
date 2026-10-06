import {godAbilities} from './god-abilities.js';
import {teamIds,teamData} from './teams.js';
import {characterData} from './data.js';
/** Extension contract. Sandbox defaults remain unrestricted; modes extend validation and outcomes. */
export class BattleRules{
 constructor({victoryCondition=null,timeLimit=null,costLimit=null,allowedCharacters=null,placementAreas=null,godAbilities:abilityRules=null}={}){
  if(victoryCondition!==null&&typeof victoryCondition!=='function')throw Error('勝利条件が不正です。');
  for(const v of [timeLimit,costLimit])if(v!==null&&(!Number.isFinite(v)||v<0))throw Error('ルールの上限が不正です。');
  if(allowedCharacters!==null&&(!Array.isArray(allowedCharacters)||allowedCharacters.some(t=>!Number.isInteger(t)||!characterData[t])))throw Error('使用可能キャラが不正です。');
  if(placementAreas!==null&&(!Array.isArray(placementAreas)||placementAreas.some(a=>![a.minX,a.maxX,a.minZ,a.maxZ].every(Number.isFinite)||a.minX>a.maxX||a.minZ>a.maxZ||a.team!==undefined&&!teamIds.includes(a.team))))throw Error('配置エリアが不正です。');
  if(abilityRules!==null&&abilityRules!==false&&(typeof abilityRules!=='object'||Array.isArray(abilityRules)||Object.keys(abilityRules).some(k=>!godAbilities[k])))throw Error('神能力ルールが不正です。');
  this.abilityRules={};for(const key of Object.keys(godAbilities)){const r=abilityRules===false?{enabled:false}:abilityRules?.[key]??{};if(typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['enabled','maxUses','cooldown'].includes(k))||r.enabled!==undefined&&typeof r.enabled!=='boolean'||r.maxUses!==undefined&&r.maxUses!==null&&(!Number.isInteger(r.maxUses)||r.maxUses<0)||r.cooldown!==undefined&&(!Number.isFinite(r.cooldown)||r.cooldown<0))throw Error('神能力の回数・時間が不正です。');this.abilityRules[key]={enabled:true,maxUses:null,cooldown:godAbilities[key].cooldown,...r};}
  this.victoryCondition=victoryCondition;this.timeLimit=timeLimit;this.costLimit=costLimit;this.allowedCharacters=allowedCharacters?new Set(allowedCharacters):null;this.placementAreas=placementAreas;
  this.unrestricted=costLimit===null&&allowedCharacters===null&&placementAreas===null;
 }
 canPlace({team,type,x,z,totalCost=0}){if(this.allowedCharacters&&!this.allowedCharacters.has(type))return false;if(this.costLimit!==null&&totalCost>this.costLimit)return false;
  if(this.placementAreas&&!this.placementAreas.some(a=>(a.team===undefined||a.team===team)&&x-characterData[type].radius>=a.minX&&x+characterData[type].radius<=a.maxX&&z-characterData[type].radius>=a.minZ&&z+characterData[type].radius<=a.maxZ))return false;return true;
 }
 canEditTeam(team){return teamIds.includes(team);}
 assertEditableTeam(team){if(!this.canEditTeam(team))throw Error('このTEAMは編集できません。');}
 assertTerrainEditing(){}
 assertMultipliersEditing(){}
 canReinforce(){return true;}
 validateStage(stage){}
 validateInitialBattle(stage){if(!this.unrestricted)for(const team of teamIds)assertPlacementAllowed(this,{units:[]},team,stage.units.filter(u=>u.team===team));}
 godAbility(key){return this.abilityRules[key]||{enabled:false,maxUses:0,cooldown:0};}
 evaluate(battle){return this.victoryCondition?.(battle)??null;}
}
export class SandboxRules extends BattleRules{
 evaluate(battle){const survivors=teamIds.filter(t=>battle.alive[t]>0);if(survivors.length<=1)return survivors.length?`TEAM ${teamData[survivors[0]].name} WIN`:'DRAW';
  if(battle.teams.every(a=>a.filter(u=>u.hp>0).every(u=>u.data.immune)))return 'DRAW';return null;
 }
}
export class GameMode{constructor(id,rules){if(!(rules instanceof BattleRules))throw Error('BattleRulesが必要です。');this.id=id;this.rules=rules;}}
export class SandboxMode extends GameMode{constructor(){super('sandbox',new SandboxRules());}}
export const referenceCost=units=>units.reduce((n,u)=>n+(characterData[u.type]?.cost||0),0);
export function assertPlacementAllowed(rules,stage,team,records){if(rules.unrestricted)return;
 const totalCost=referenceCost(stage.units.filter(u=>u.team===team))+referenceCost(records);
 if(rules.costLimit!==null&&totalCost>rules.costLimit)throw Error('コストが足りません');
 for(const u of records)if(!rules.canPlace({...u,team,totalCost}))throw Error(rules.definition?rules.canEditTeam(team)?rules.allowedCharacters&&!records.every(r=>rules.allowedCharacters.has(r.type))?'このキャラは使用できません':'青い自軍配置エリアに置いてください':'敵軍は固定されています。TEAM Aを編成してください。':'現在のルールではこの配置を使用できません。');
}
// timeLimit is configuration; each mode defines its outcome through evaluate/victoryCondition.
// Attack Challenge uses elimination; Defense Challenge evaluates flag HP and its duration.
