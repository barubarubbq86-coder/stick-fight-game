import {characterData} from './data.js';
import {validateCounts,formationData,densityData} from './placement.js';
const counts=entries=>{const a=characterData.map(()=>0);for(const [name,n] of entries){const t=characterData.findIndex(c=>c.name===name);if(t<0)throw Error('未知のキャラ');a[t]=n;}return a;};
const army=(id,name,entries)=>({id,name,counts:counts(entries),formation:'square',density:'normal'});
export const armyPresets=[
 army('chick','🐤 ひよこ軍',[['ノーマル',40],['槍',10]]),
 army('chicken','🐔 にわとり軍',[['剣',30],['ハンマー',15],['槍2つ',5]]),
 army('gorilla','🦍 ゴリラ軍',[['ハンマー',10],['二ハンマー流',10],['マッスル',10],['ノーマル',20]]),
 army('muscle','💪 マッスル軍',[['マッスル',10],['ノーマル',30]]),
 army('spear','🔱 槍軍',[['槍',10],['槍2つ',10],['槍3つ',10],['槍4つ',5],['槍5つ',5],['ノーマル',10]]),
 army('sword','⚔️ 剣士軍',[['剣',25],['二刀流',15],['ハンマー＆剣',10]]),
 army('fire','🔥 火炎軍',[['火能力',15],['剣',15],['ノーマル',20]]),
 army('water','💧 水軍',[['水能力',15],['槍',15],['ノーマル',20]]),
 army('mixed','🎲 混成軍',[['ノーマル',20],['剣',10],['ハンマー',10],['槍',10]]),
 army('demon','😈 デーモン軍',[['火能力',15],['刀',5],['マッスル',10],['ノーマル',20]]),
 army('gigant','🗿 ギガント軍',[['ギガント',1],['マッスル',4],['ノーマル',20],['槍',5]]),
 army('god','✨ 神軍',[['神',1],['刀',3],['全槍',3],['マッスル',10]])
];
export const armySummary=a=>a.counts.map((n,t)=>n?`${characterData[t].name} ${n}`:'').filter(Boolean).join(' / ');
const KEY='stick-fight-armies-v1';
export function userArmies(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(a)||a.length>50)throw Error();const ids=new Set();for(const p of a){if(typeof p.id!=='string'||!p.id.startsWith('user-')||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!formationData[p.formation]||!densityData[p.density])throw Error();ids.add(p.id);validateCounts(p.counts);}return a;}catch(e){throw Error('自作軍団を読み込めません。保存設定やデータを確認してください。');}}
export function saveArmy(name,values){name=name.trim();if(!name||name.length>80)throw Error('軍団名は1〜80文字で入力してください。');validateCounts(values.counts);if(!formationData[values.formation]||!densityData[values.density])throw Error('陣形・密度を選んでください。');const a=userArmies(),existing=a.find(p=>p.name===name);if(!existing&&a.length>=50)throw Error('自作軍団は50種類まで保存できます。');let id=existing?.id||'user-'+Date.now().toString(36);if(!existing){let serial=1;const base=id;while(a.some(p=>p.id===id))id=base+'-'+serial++;}const p={id,name,counts:[...values.counts],formation:values.formation,density:values.density};if(existing)a[a.indexOf(existing)]=p;else a.push(p);try{localStorage.setItem(KEY,JSON.stringify(a));}catch(e){throw Error('軍団を保存できません。空き容量や保存設定を確認してください。');}return p;}
const wall=(x,z,yaw=0,scale=1)=>({type:'wall',x,z,yaw,scale});const rock=(x,z,scale=1)=>({type:'rock',x,z,yaw:0,scale});const hill=(x,z,large=false)=>({type:large?'largeHill':'smallHill',x,z,yaw:0,scale:1});
export const mapPresets=[
 {id:'plain',name:'🌱 大平原',description:'障害物なし。大軍の正面衝突に。',terrain:[]},
 {id:'canyon',name:'🏞️ 峡谷',description:'2本の壁にはさまれた細い通路。端から回り込めます。',terrain:[...[-30,-20,-10,0,10,20,30].flatMap(x=>[wall(x,-8),wall(x,8)])]},
 {id:'arena',name:'🏟️ 円形闘技場',description:'円形の壁と4つの入口。中央を巡る戦いに。',terrain:Array.from({length:12},(_,i)=>i).filter(i=>i%3!==0).map(i=>{const a=i/12*Math.PI*2;return wall(Math.cos(a)*18,Math.sin(a)*18,-a-Math.PI/2);})},
 {id:'castle',name:'🏰 城壁防衛戦',description:'中央に門のある城壁。左右に軍を置いて攻防。',terrain:[...[-20,-10,10,20].map(z=>wall(5,z,Math.PI/2)),wall(15,-25),wall(15,25),rock(3,-5,.7),rock(3,5,.7)]},
 {id:'hills',name:'⛰️ 丘陵',description:'丘と岩が進路を分ける、起伏のある戦場。',terrain:[hill(-22,-13,true),hill(-20,14),hill(0,0,true),hill(23,-14),hill(22,14,true),rock(-8,7),rock(9,-7),rock(0,18)]},
 {id:'rocks',name:'🪨 岩だらけの戦場',description:'岩の間を抜ける小さな戦線が生まれます。',terrain:[...[-27,-9,9,27].flatMap((x,i)=>[-20,-7,7,20].map((z,j)=>rock(x+(j%2?3:0),z+(i%2?2:0),.9+(i+j)%3*.25)))]}
];
