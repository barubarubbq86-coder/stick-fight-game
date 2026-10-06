import {GameMode,BattleRules,referenceCost,assertPlacementAllowed} from './rules.js';
import {characterData} from './data.js';
import {Terrain} from './terrain.js';
import {normalizeMultipliers} from './teams.js';
import {challengeStage} from './challenges.js';
const identity=units=>JSON.stringify(units.map(u=>[u.id,u.team,u.type,u.x,u.z,u.yaw]).sort((a,b)=>a[0]-b[0]));
export class ChallengeRules extends BattleRules{
 constructor(def){super({costLimit:def.maxCost,allowedCharacters:def.allowedCharacters,placementAreas:[def.placementZone],godAbilities:def.enabledGodPowers});this.definition=def;this.fixed=challengeStage(def);this.lockedEnemies=identity(this.fixed.units);this.fixedTerrain=JSON.stringify(this.fixed.terrain);}
 canEditTeam(team){return team===this.definition.playerTeam;}
 assertEditableTeam(team){if(!this.canEditTeam(team))throw Error('敵軍は固定されています。TEAM Aを編成してください。');}
 assertTerrainEditing(){if(!this.definition.enabledTerrainEditing)throw Error('このチャレンジの地形は固定です。');}
 assertMultipliersEditing(){if(!this.definition.enabledMultipliers)throw Error('チャレンジでは陣営倍率を変更できません。');}
 canReinforce(){return this.definition.enabledReinforcements;}
 canPlace(record){return this.canEditTeam(record.team)&&super.canPlace(record);}
 validateStage(stage){if(stage.challengeId!==this.definition.id)throw Error('このチャレンジの編成を選んでください。');if(!Array.isArray(stage.units)||!Array.isArray(stage.terrain)||new Set(stage.units.map(u=>u.id)).size!==stage.units.length)throw Error('配置データが不正です。');
  const fixed=stage.units.filter(u=>u.team!==this.definition.playerTeam);if(identity(fixed)!==this.lockedEnemies||JSON.stringify(stage.terrain)!==this.fixedTerrain)throw Error('敵軍・地形は固定です。');
  if(JSON.stringify(normalizeMultipliers(stage.multipliers))!==JSON.stringify(this.fixed.multipliers))throw Error('チャレンジの陣営倍率は1倍です。');
  const units=stage.units.filter(u=>u.team===this.definition.playerTeam);assertPlacementAllowed(this,{units:[]},this.definition.playerTeam,units);const terrain=new Terrain(stage.terrain);
  if(units.some(u=>!Number.isInteger(u.id)||!Number.isInteger(u.type)||!characterData[u.type]||![u.x,u.z,u.yaw].every(Number.isFinite)||!terrain.canOccupy(u.x,u.z,characterData[u.type].radius)))throw Error('配置データが不正です。');
 }
 validateInitialBattle(stage){this.validateStage(stage);}
 evaluate(battle){const def=this.definition;if(def.defeatCondition==='player-eliminated'&&battle.alive[def.playerTeam]===0)return 'CHALLENGE LOSE';if(def.victoryCondition==='enemy-eliminated'&&battle.alive[def.enemyTeam]===0)return 'CHALLENGE WIN';return null;}
}
export class ChallengeMode extends GameMode{constructor(def){super('challenge',new ChallengeRules(def));this.definition=def;this.storageKey='stick-fight-challenge-'+def.id+'-v1';}}
export function challengeFeedback(battle){const def=battle.mode.definition;if(!def)return null;const giant=battle.teams[def.enemyTeam].find(u=>characterData[u.type].name==='ギガント');const total=def.enemySetup.filter(g=>characterData[g.type].name==='ギガント').reduce((sum,g)=>sum+g.count*characterData[g.type].hp,0);const hp=giant?.hp||0;return {won:battle.result==='CHALLENGE WIN',enemyRemaining:battle.alive[def.enemyTeam],giantHp:Math.max(0,hp),giantMaxHp:total,giantPercent:total?Math.ceil(hp/total*100):0,playerKills:battle.stats.teams[def.playerTeam].kills,usedCost:referenceCost(battle.stats.records.size?[...battle.stats.records.values()].filter(u=>u.team===def.playerTeam):[])};}
