import {characterData} from './data.js';
import {Terrain,terrainData} from './terrain.js';
const copy=s=>JSON.parse(JSON.stringify(s));
export class FieldEditor{
 constructor(stage={units:[],terrain:[]}){this.stage=copy(stage);this.history=[];this.nextId=1;this.reindex();}
 reindex(){this.nextId=1;for(const list of [this.stage.units,this.stage.terrain])for(const o of list)this.nextId=Math.max(this.nextId,(o.id||0)+1);}
 checkpoint(){this.history.push(copy(this.stage));if(this.history.length>30)this.history.shift();}
 undo(){if(!this.history.length)return false;this.stage=this.history.pop();this.reindex();return true;}
 replace(stage){this.checkpoint();this.stage=copy(stage);this.reindex();}
 placeUnit(team,type,x,z){const terrain=new Terrain(this.stage.terrain);if(!characterData[type]||!terrain.canOccupy(x,z,characterData[type].radius))throw Error('岩・壁のない戦場内へ置いてください。');this.checkpoint();let unit={id:this.nextId++,team,type,x,z,yaw:team?-Math.PI/2:Math.PI/2};this.stage.units.push(unit);return unit.id;}
 placeTerrain(type,x,z,yaw=0,scale=1){if(!terrainData[type]||Math.abs(x)>44||Math.abs(z)>29)throw Error('地形は戦場の端から少し内側へ置いてください。');let o={id:this.nextId,type,x,z,yaw,scale};const terrain=new Terrain([...this.stage.terrain,o]);if(this.stage.units.some(u=>!terrain.canOccupy(u.x,u.z,characterData[u.type].radius)))throw Error('キャラと重なる岩・壁は置けません。先にキャラを移動してください。');this.checkpoint();this.nextId++;this.stage.terrain.push(o);return o.id;}
 move(kind,id,x,z){let list=kind==='unit'?this.stage.units:this.stage.terrain,o=list.find(o=>o.id===id);if(!o)return;let next=copy(this.stage),target=(kind==='unit'?next.units:next.terrain).find(o=>o.id===id);target.x=x;target.z=z;let terrain=new Terrain(next.terrain);if(Math.abs(x)>48||Math.abs(z)>33||next.units.some(u=>!terrain.canOccupy(u.x,u.z,characterData[u.type].radius)))throw Error('戦場内の、キャラと障害物が重ならない場所を選んでください。');this.checkpoint();this.stage=next;}
 remove(kind,id){this.checkpoint();let key=kind==='unit'?'units':'terrain';this.stage[key]=this.stage[key].filter(o=>o.id!==id);}
 rotate(kind,id){let o=(kind==='unit'?this.stage.units:this.stage.terrain).find(o=>o.id===id);if(!o)return;let next=copy(this.stage),target=(kind==='unit'?next.units:next.terrain).find(o=>o.id===id);target.yaw+=Math.PI/4;const terrain=new Terrain(next.terrain);if(next.units.some(u=>!terrain.canOccupy(u.x,u.z,characterData[u.type].radius)))throw Error('回転するとキャラと重なります。');this.checkpoint();this.stage=next;}
 clear(which){this.checkpoint();if(which==='all')this.stage={units:[],terrain:[]};else if(which==='terrain')this.stage.terrain=[];else this.stage.units=this.stage.units.filter(u=>u.team!==Number(which));}
 snapshot(){return copy(this.stage);}
 counts(){return [0,1].map(t=>characterData.map((c,k)=>this.stage.units.filter(u=>u.team===t&&u.type===k).length));}
 presets(){try{const data=JSON.parse(localStorage.getItem('stick-fight-presets-v1')||'[]');if(!Array.isArray(data))throw Error();return data;}catch(e){throw Error('保存データを読み込めません。端末の保存設定を確認してください。');}}
 save(name){name=name.trim();if(!name)throw Error('プリセット名を入力してください。');if(name.length>80)throw Error('名前は80文字以内にしてください。');let a=this.presets();if(a.some(p=>p.name===name))throw Error('同じ名前があります。別の名前で保存してください。');a.push({name,version:1,stage:this.snapshot()});try{localStorage.setItem('stick-fight-presets-v1',JSON.stringify(a));}catch(e){throw Error('保存できませんでした。端末の空き容量・ブラウザ設定を確認してください。');}}
 load(name){let p=this.presets().find(p=>p.name===name);if(!p||p.version!==1||!p.stage||!Array.isArray(p.stage.units)||!Array.isArray(p.stage.terrain))throw Error('プリセットを読み込めません。');for(let o of p.stage.terrain)if(!terrainData[o.type]||![o.x,o.z,o.yaw,o.scale].every(Number.isFinite)||o.scale<.25||o.scale>3)throw Error('地形データが不正です。');let terrain=new Terrain(p.stage.terrain);for(let u of p.stage.units)if(!characterData[u.type]||![0,1].includes(u.team)||![u.x,u.z,u.yaw].every(Number.isFinite)||!terrain.canOccupy(u.x,u.z,characterData[u.type].radius))throw Error('キャラクターデータが不正です。');this.replace(p.stage);}
}
