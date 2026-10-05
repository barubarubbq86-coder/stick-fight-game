import {characterData} from './data.js';
import {teamIds} from './teams.js';
import {formationData,densityData,expandCounts,planGroup,PlacementSpace} from './placement.js';
import {Terrain} from './terrain.js';
import {assertPlacementAllowed} from './rules.js';
export const teamAnchor=t=>({x:t%2?24:-24,z:t<2?-14:14});
const counts=entries=>{const a=characterData.map(()=>0);for(const [name,n] of entries){const t=characterData.findIndex(c=>c.name===name);if(t<0)throw Error('未知のキャラ');a[t]=n;}return a;};
const squad=(x,z,entries,formation='square',density='normal')=>({x,z,counts:counts(entries),formation,density});
export const teamPresets=[
 {id:'standard',name:'⚖️ 標準軍',description:'前衛・左右の護衛・後方の槍兵',groups:[squad(4,0,[['ノーマル',24]]),squad(1,-6,[['剣',12]]),squad(2,6,[['マッスル',4]]),squad(-6,0,[['槍',12]])]},
 {id:'melee',name:'⚔️ 近接特化軍',description:'前にマッスル、左右に剣士とハンマー',groups:[squad(6,0,[['マッスル',6]]),squad(0,-6,[['剣',16],['二刀流',8]]),squad(0,6,[['ハンマー',12],['二ハンマー流',6]])]},
 {id:'ranged',name:'🏹 遠距離軍',description:'前列の槍兵と、後方の火・水能力',groups:[squad(4,0,[['槍',20],['槍2つ',8]],'wide'),squad(-5,-6,[['火能力',4]]),squad(-5,6,[['水能力',6]])]},
 {id:'mass',name:'👥 大軍',description:'ノーマル中心の300体。4つの部隊で展開',groups:[squad(3,-5,[['ノーマル',110]],'square','close'),squad(3,5,[['ノーマル',110]],'square','close'),squad(-6,-5,[['剣',40]]),squad(-6,5,[['槍',40]])]},
 {id:'elite',name:'💎 少数精鋭軍',description:'少人数の強者。刀の全体攻撃を含む',groups:[squad(5,0,[['マッスル',6]]),squad(-3,-4,[['刀',1],['二刀流',3]]),squad(-3,4,[['火能力',2],['槍3つ',4]])]},
 {id:'guard',name:'🗿 ギガント護衛軍',description:'前にギガント、周囲に護衛、後方に槍と水',groups:[squad(7,0,[['ギガント',1]]),squad(3,-5,[['剣',6],['マッスル',2]]),squad(3,5,[['剣',6],['マッスル',2]]),squad(-1,0,[['ハンマー',6]]),squad(-7,0,[['槍',8],['水能力',2]],'wide')]}
];
export const teamPresetTotal=p=>p.layout?p.layout.length:p.groups.reduce((s,g)=>s+g.counts.reduce((s,n)=>s+n,0),0);
export const teamPresetSummary=p=>{const a=characterData.map(()=>0);if(p.layout)for(const u of p.layout)a[u.type]++;else for(const g of p.groups)g.counts.forEach((n,t)=>a[t]+=n);return a.map((n,t)=>n?`${characterData[t].name} ${n}`:'').filter(Boolean).join(' / ');};
const KEY='stick-fight-teams-v1';
export function userTeams(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(a)||a.length>50)throw Error();const ids=new Set();for(const p of a){if(typeof p.id!=='string'||!p.id.startsWith('user-team-')||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!Array.isArray(p.layout)||p.layout.length<1||p.layout.length>1000||p.formation!=='saved'||p.layout.some(u=>!Number.isInteger(u.type)||!characterData[u.type]||![u.x,u.z,u.yaw].every(Number.isFinite)||Math.abs(u.x)>98||Math.abs(u.z)>68))throw Error();ids.add(p.id);}return a;}catch(e){throw Error('自作チームを読み込めません。保存設定やデータを確認してください。');}}
export function saveTeam(name,stage,team){name=name.trim();if(!name||name.length>80||!teamIds.includes(team))throw Error('TEAMと1〜80文字の名前を指定してください。');const units=stage.units.filter(u=>u.team===team);if(!units.length||units.length>1000)throw Error('チームは1〜1000体にしてください。');
 const center={x:units.reduce((s,u)=>s+u.x,0)/units.length,z:units.reduce((s,u)=>s+u.z,0)/units.length},direction=team%2?-1:1;
 const layout=units.map(u=>({type:u.type,x:(u.x-center.x)*direction,z:u.z-center.z,yaw:u.yaw*direction}));
 const a=userTeams(),existing=a.find(p=>p.name===name);if(!existing&&a.length>=50)throw Error('自作チームは50種類まで保存できます。');let id=existing?.id||'user-team-'+Date.now().toString(36);if(!existing){let i=1,base=id;while(a.some(p=>p.id===id))id=base+'-'+i++;}
 const p={id,name,description:'保存した部隊配置を再現',layout,formation:'saved'};if(existing)a[a.indexOf(existing)]=p;else a.push(p);try{localStorage.setItem(KEY,JSON.stringify(a));}catch(e){throw Error('チームを保存できません。空き容量や保存設定を確認してください。');}return p;
}
export function planTeam(stage,team,preset,rules){if(!teamIds.includes(team)||!preset)throw Error('TEAMとプリセットを選んでください。');const working={...stage,units:stage.units.filter(u=>u.team!==team)},anchor=teamAnchor(team),direction=team%2?-1:1;let units=[],adjusted=false;
 if(preset.layout){const space=new PlacementSpace(new Terrain(stage.terrain),working.units);for(const rec of preset.layout){const x=anchor.x+rec.x*direction,z=anchor.z+rec.z,p=space.nearest(x,z,rec.type);if(!p)throw Error('チーム全員を配置できません。地形や他TEAMの配置を変えてください。');if(Math.hypot(p.x-x,p.z-z)>.02)adjusted=true;const u={...p,type:rec.type,team,yaw:rec.yaw*direction};units.push(u);space.insert(u);}}
 else for(const g of preset.groups){const plan=planGroup(working,expandCounts(g.counts),anchor.x+g.x*direction,anchor.z+g.z,g.formation,g.density);adjusted||=plan.adjusted;
  const part=plan.units.map(u=>({...u,team,yaw:direction*Math.PI/2}));units.push(...part);working.units.push(...part);}
 // Rules see the replaced team as empty, not as an additional army.
 assertPlacementAllowed(rules,{...stage,units:stage.units.filter(u=>u.team!==team)},team,units);return {units,adjusted};
}
