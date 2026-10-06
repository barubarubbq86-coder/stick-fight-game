import {characterData} from './data.js';
import {formationOffsets} from './placement.js';
import {normalizeMultipliers} from './teams.js';
const type=name=>{const id=characterData.findIndex(c=>c.name===name);if(id<0)throw Error(`未実装キャラ：${name}`);return id;};
const counts=entries=>{const a=characterData.map(()=>0);for(const [name,n] of entries)a[type(name)]=n;return a;};
const squad=(x,z,entries,formation='square')=>({x,z,counts:counts(entries),formation,density:'normal'});
export const challenges=[{
 id:'giant-outpost',title:'巨人の守る陣地を突破せよ！',maxCost:1000,playerTeam:0,enemyTeam:1,
 allowedCharacters:characterData.map((c,id)=>['melee','ranged'].includes(c.role)||c.name==='マッスル'?id:-1).filter(id=>id>=0),
 enemySetup:[{type:type('ギガント'),count:1,x:14,z:0,formation:'square'},{type:type('槍'),count:15,x:27,z:0,formation:'square'}],
 placementZone:{team:0,minX:-45,maxX:-5,minZ:-30,maxZ:30},terrain:[],
 victoryCondition:'enemy-eliminated',defeatCondition:'player-eliminated',enabledGodPowers:false,enabledTerrainEditing:false,enabledMultipliers:false,enabledReinforcements:false,
 teamPresets:[{id:'challenge-balanced',name:'⚖️ 前衛と槍の軍',description:'前衛ノーマルと剣、後方の槍',groups:[squad(5,0,[['ノーマル',20]]),squad(1,-5,[['剣',8]]),squad(-5,3,[['槍',12]])]},
 {id:'challenge-ranged',name:'🔱 槍を守る軍',description:'ノーマルの前衛と多くの槍',groups:[squad(5,0,[['ノーマル',20]]),squad(-5,0,[['槍',30]],'wide')]},
 {id:'challenge-muscle',name:'💪 マッスルと護衛',description:'前にマッスル、周囲の護衛と槍',groups:[squad(6,0,[['マッスル',2]]),squad(0,-4,[['ノーマル',10]]),squad(-5,4,[['槍',24]])]}]
}];
export function challengeStage(def){let id=1;const units=[];for(const g of def.enemySetup)for(const p of formationOffsets(Array(g.count).fill(g.type),g.formation,'normal'))units.push({id:id++,team:def.enemyTeam,type:g.type,x:g.x+p.x,z:g.z+p.z,yaw:-Math.PI/2});return {units,terrain:JSON.parse(JSON.stringify(def.terrain)),multipliers:normalizeMultipliers(),mapId:null,challengeId:def.id};}
export const presetTypes=p=>p.layout?p.layout.map(u=>u.type):p.groups.flatMap(g=>g.counts.flatMap((n,type)=>Array(n).fill(type)));
export const presetCost=p=>presetTypes(p).reduce((cost,type)=>cost+characterData[type].cost,0);
