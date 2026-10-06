import {teamIds,teamData} from './teams.js';
import {characterData} from './data.js';
/** Extension contract. Only Sandbox is a shipped game mode in Phase 3. */
export class BattleRules{
 constructor({victoryCondition=null,timeLimit=null,costLimit=null,allowedCharacters=null,placementAreas=null}={}){
  if(victoryCondition!==null&&typeof victoryCondition!=='function')throw Error('勝利条件が不正です。');
  for(const v of [timeLimit,costLimit])if(v!==null&&(!Number.isFinite(v)||v<0))throw Error('ルールの上限が不正です。');
  if(allowedCharacters!==null&&(!Array.isArray(allowedCharacters)||allowedCharacters.some(t=>!Number.isInteger(t)||!characterData[t])))throw Error('使用可能キャラが不正です。');
  if(placementAreas!==null&&(!Array.isArray(placementAreas)||placementAreas.some(a=>![a.minX,a.maxX,a.minZ,a.maxZ].every(Number.isFinite)||a.minX>a.maxX||a.minZ>a.maxZ||a.team!==undefined&&!teamIds.includes(a.team))))throw Error('配置エリアが不正です。');
  this.victoryCondition=victoryCondition;this.timeLimit=timeLimit;this.costLimit=costLimit;this.allowedCharacters=allowedCharacters?new Set(allowedCharacters):null;this.placementAreas=placementAreas;
  this.unrestricted=costLimit===null&&allowedCharacters===null&&placementAreas===null;
 }
 canPlace({team,type,x,z,totalCost=0}){if(this.allowedCharacters&&!this.allowedCharacters.has(type))return false;if(this.costLimit!==null&&totalCost>this.costLimit)return false;
  if(this.placementAreas&&!this.placementAreas.some(a=>(a.team===undefined||a.team===team)&&x-characterData[type].radius>=a.minX&&x+characterData[type].radius<=a.maxX&&z-characterData[type].radius>=a.minZ&&z+characterData[type].radius<=a.maxZ))return false;return true;
 }
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
 for(const u of records)if(!rules.canPlace({...u,team,totalCost}))throw Error('現在のルールではこの配置を使用できません。');
}
// timeLimit is a configuration field: future modes must define timeout outcomes
// through evaluate/victoryCondition. No challenge, defense or boss mode is shipped.
