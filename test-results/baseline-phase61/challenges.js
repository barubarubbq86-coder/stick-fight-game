import {characterData} from './data.js';
import {formationOffsets} from './placement.js';
import {normalizeMultipliers} from './teams.js';
const type=name=>{const id=characterData.findIndex(c=>c.name===name);if(id<0)throw Error(`未実装キャラ：${name}`);return id;};
const counts=entries=>{const a=characterData.map(()=>0);for(const [name,n] of entries)a[type(name)]=n;return a;};
const squad=(x,z,entries,formation='square')=>({x,z,counts:counts(entries),formation,density:'normal'});
export const challenges=[{
 id:'giant-outpost',kind:'attack',title:'巨人の守る陣地を突破せよ！',maxCost:1000,playerTeam:0,enemyTeam:1,
 allowedCharacters:characterData.map((c,id)=>['melee','ranged'].includes(c.role)||c.name==='マッスル'?id:-1).filter(id=>id>=0),
 enemySetup:[{type:type('ギガント'),count:1,x:14,z:0,formation:'square'},{type:type('槍'),count:15,x:27,z:0,formation:'square'}],
 placementZone:{team:0,minX:-45,maxX:-5,minZ:-30,maxZ:30},terrain:[],
 victoryCondition:'enemy-eliminated',defeatCondition:'player-eliminated',enabledGodPowers:false,enabledTerrainEditing:false,enabledMultipliers:false,enabledReinforcements:false,
 teamPresets:[{id:'challenge-balanced',name:'⚖️ 前衛と槍の軍',description:'前衛ノーマルと剣、後方の槍',groups:[squad(5,0,[['ノーマル',20]]),squad(1,-5,[['剣',8]]),squad(-5,3,[['槍',12]])]},
 {id:'challenge-ranged',name:'🔱 槍を守る軍',description:'ノーマルの前衛と多くの槍',groups:[squad(5,0,[['ノーマル',20]]),squad(-5,0,[['槍',30]],'wide')]},
 {id:'challenge-muscle',name:'💪 マッスルと護衛',description:'前にマッスル、周囲の護衛と槍',groups:[squad(6,0,[['マッスル',2]]),squad(0,-4,[['ノーマル',10]]),squad(-5,4,[['槍',24]])]}]
},{
 id:'flag-defense',kind:'defense',title:'3分間、旗を守れ！',maxCost:1500,playerTeam:0,enemyTeam:1,
 allowedCharacters:characterData.map((c,id)=>['melee','ranged'].includes(c.role)||c.name==='マッスル'?id:-1).filter(id=>id>=0),
 enemySetup:[],placementZone:{team:0,minX:-20,maxX:20,minZ:-18,maxZ:18},teamAnchor:{x:0,z:0},
 terrain:[{id:1,type:'rock',x:0,z:0,yaw:0,scale:.6}],
 objective:{id:'flag',name:'防衛旗',x:0,z:0,hp:5000,radius:1.2},duration:180,
 waves:[{at:0,groups:[{type:type('ノーマル'),count:12,x:-42,z:0},{type:type('ノーマル'),count:12,x:42,z:0},{type:type('ノーマル'),count:12,x:0,z:-29}]},
 {at:60,groups:[{type:type('剣'),count:8,x:-42,z:0},{type:type('剣'),count:8,x:42,z:0},{type:type('ハンマー'),count:8,x:0,z:-29},{type:type('ハンマー'),count:8,x:0,z:29}]},
 {at:120,groups:[{type:type('マッスル'),count:2,x:-42,z:0},{type:type('マッスル'),count:2,x:42,z:0},{type:type('槍'),count:8,x:0,z:-29},{type:type('槍'),count:8,x:0,z:29}]}],
 victoryCondition:'objective-survives-time',defeatCondition:'objective-destroyed',enabledGodPowers:false,enabledTerrainEditing:false,enabledMultipliers:false,enabledReinforcements:false,
 teamPresets:[{id:'defense-balanced',name:'⚖️ 防衛混成軍',description:'4方向の護衛と中央の槍',groups:[squad(-7,0,[['剣',5],['ノーマル',10]]),squad(7,0,[['剣',5],['ノーマル',10]]),squad(0,-7,[['マッスル',2]]),squad(0,7,[['マッスル',1]]),squad(0,3,[['槍',22]])]},
 {id:'defense-ranged',name:'🔱 槍の防衛軍',description:'槍を分散、前方をノーマルで守る',groups:[squad(-6,-4,[['槍',25]]),squad(6,4,[['槍',25]]),squad(0,-10,[['ノーマル',25]])]},
 {id:'defense-muscle',name:'💪 マッスル防衛軍',description:'各方向のマッスルと槍の支援',groups:[squad(-8,0,[['マッスル',2]]),squad(8,0,[['マッスル',2]]),squad(0,-8,[['マッスル',2]]),squad(0,5,[['槍',20],['ノーマル',10]])]}]
}];
export function challengeStage(def){let id=1;const units=[];for(const g of def.enemySetup)for(const p of formationOffsets(Array(g.count).fill(g.type),g.formation,'normal'))units.push({id:id++,team:def.enemyTeam,type:g.type,x:g.x+p.x,z:g.z+p.z,yaw:-Math.PI/2});return {units,terrain:JSON.parse(JSON.stringify(def.terrain)),multipliers:normalizeMultipliers(),mapId:null,challengeId:def.id,...(def.objective?{objective:JSON.parse(JSON.stringify(def.objective))}:{})};}
export const presetTypes=p=>p.layout?p.layout.map(u=>u.type):p.groups.flatMap(g=>g.counts.flatMap((n,type)=>Array(n).fill(type)));
export const presetCost=p=>presetTypes(p).reduce((cost,type)=>cost+characterData[type].cost,0);
