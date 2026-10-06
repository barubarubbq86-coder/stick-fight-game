import {SandboxMode,assertPlacementAllowed} from './rules.js';
import {planTeam} from './team-presets.js';
import {planGroup,PlacementSpace} from './placement.js';
import {mapPresets} from './presets.js';
import {teamIds,normalizeMultipliers} from './teams.js';
import {characterData} from './data.js';
import {Terrain,terrainData} from './terrain.js';
const copy=s=>JSON.parse(JSON.stringify(s));
export class FieldEditor{
 constructor(stage={units:[],terrain:[]},mode=new SandboxMode()){this.mode=mode;this.rules=mode.rules;this.stage=copy(stage);this.stage.multipliers=normalizeMultipliers(stage.multipliers);this.history=[];this.nextId=1;this.rules.validateStage(this.stage);this.reindex();}
 reindex(){this.nextId=1;for(const list of [this.stage.units,this.stage.terrain])for(const o of list)this.nextId=Math.max(this.nextId,(o.id||0)+1);}
 checkpoint(){this.history.push(copy(this.stage));if(this.history.length>30)this.history.shift();}
 undo(){if(!this.history.length)return false;this.stage=this.history.pop();this.reindex();return true;}
 replace(stage){this.rules.validateStage(stage);this.checkpoint();this.stage=copy(stage);this.reindex();}
 placeUnit(team,type,x,z){const terrain=new Terrain(this.stage.terrain);if(!teamIds.includes(team)||!Number.isInteger(type)||!characterData[type]||!terrain.canOccupy(x,z,characterData[type].radius))throw Error('岩・壁のない戦場内へ置いてください。');assertPlacementAllowed(this.rules,this.stage,team,[{type,x,z}]);this.checkpoint();let unit={id:this.nextId++,team,type,x,z,yaw:team?-Math.PI/2:Math.PI/2};this.stage.units.push(unit);return unit.id;}
 placeGroup(team,types,x,z,formation='square',density='normal'){
  if(!teamIds.includes(team))throw Error('TEAMを選んでください。');const plan=planGroup(this.stage,types,x,z,formation,density);assertPlacementAllowed(this.rules,this.stage,team,plan.units);this.checkpoint();
  const units=plan.units.map(u=>({...u,id:this.nextId++,team,yaw:team%2?-Math.PI/2:Math.PI/2}));this.stage.units.push(...units);return {...plan,units};
 }
 applyTeamPreset(team,preset){const plan=planTeam(this.stage,team,preset,this.rules);this.checkpoint();const units=plan.units.map(u=>({...u,id:this.nextId++}));this.stage.units=this.stage.units.filter(u=>u.team!==team);this.stage.units.push(...units);return {...plan,units};}
 applyMap(id){this.rules.assertTerrainEditing();const preset=mapPresets.find(p=>p.id===id);if(!preset)throw Error('マップを選んでください。');const next=copy(this.stage);next.terrain=copy(preset.terrain);let nextId=this.nextId;
  for(const o of next.terrain)o.id=nextId++;const space=new PlacementSpace(new Terrain(next.terrain));let moved=0;
  for(const u of next.units){const pos=space.nearest(u.x,u.z,u.type);if(!pos)throw Error('このマップに全員を置けません。人数を減らしてください。');if(Math.hypot(pos.x-u.x,pos.z-u.z)>.01)moved++;Object.assign(u,pos);space.insert(u);}
  next.mapId=id;this.checkpoint();this.stage=next;this.reindex();return {name:preset.name,moved};
 }
 clearUnits(){this.checkpoint();this.stage.units=this.stage.units.filter(u=>!this.rules.canEditTeam(u.team));this.reindex();}
 placeTerrain(type,x,z,yaw=0,scale=1){this.rules.assertTerrainEditing();if(!terrainData[type]||Math.abs(x)>44||Math.abs(z)>29)throw Error('地形は戦場の端から少し内側へ置いてください。');let o={id:this.nextId,type,x,z,yaw,scale};const terrain=new Terrain([...this.stage.terrain,o]);if(this.stage.units.some(u=>!terrain.canOccupy(u.x,u.z,characterData[u.type].radius)))throw Error('キャラと重なる岩・壁は置けません。先にキャラを移動してください。');this.checkpoint();this.nextId++;this.stage.terrain.push(o);this.stage.mapId=null;return o.id;}
 move(kind,id,x,z){let list=kind==='unit'?this.stage.units:this.stage.terrain,o=list.find(o=>o.id===id);if(!o)return;if(kind==='terrain')this.rules.assertTerrainEditing();else this.rules.assertEditableTeam(o.team);let next=copy(this.stage),target=(kind==='unit'?next.units:next.terrain).find(o=>o.id===id);target.x=x;target.z=z;let terrain=new Terrain(next.terrain);if(Math.abs(x)>48||Math.abs(z)>33||next.units.some(u=>!terrain.canOccupy(u.x,u.z,characterData[u.type].radius)))throw Error('戦場内の、キャラと障害物が重ならない場所を選んでください。');this.rules.validateStage(next);this.checkpoint();this.stage=next;if(kind==='terrain')this.stage.mapId=null;}
 /** Rigid group transform: validate the whole destination, then one undo entry. */
 prepareGroup(ids){const chosen=new Set(ids),units=this.stage.units.filter(u=>chosen.has(u.id));if(!units.length)throw Error('先に兵士を選択してください。');for(const u of units)this.rules.assertEditableTeam(u.team);
  const center={x:units.reduce((a,u)=>a+u.x,0)/units.length,z:units.reduce((a,u)=>a+u.z,0)/units.length};const rest=this.stage.units.filter(u=>!chosen.has(u.id));
  return {units,center,rest,space:new PlacementSpace(new Terrain(this.stage.terrain),rest),stage:this.stage};
 }
 planTransform(group,x,z,angle=0){if(group.stage!==this.stage)throw Error('配置が変わりました。選択し直してください。');if(![x,z,angle].every(Number.isFinite))throw Error('戦場の地面を選んでください。');const c=Math.cos(angle),s=Math.sin(angle);
  const units=group.units.map(u=>{const dx=u.x-group.center.x,dz=u.z-group.center.z;return {...u,x:x+dx*c+dz*s,z:z-dx*s+dz*c,yaw:u.yaw+angle};});
  if(units.some(u=>!group.space.free(u.x,u.z,u.type)))throw Error('ここには移動できません。壁・兵士・戦場の端を避けてください。陣形は変わりません。');
  for(const team of teamIds){const teamUnits=units.filter(u=>u.team===team);if(teamUnits.length)assertPlacementAllowed(this.rules,{...this.stage,units:group.rest},team,teamUnits);}
  return {units,center:{x,z},changed:Math.abs(x-group.center.x)+Math.abs(z-group.center.z)+Math.abs(angle)>1e-7};
 }
 commitTransform(plan){if(!plan.changed)return false;const byId=new Map(plan.units.map(u=>[u.id,u]));const next={...this.stage,units:this.stage.units.map(u=>byId.get(u.id)||u)};for(const u of plan.units)this.rules.assertEditableTeam(u.team);this.rules.validateStage(next);this.checkpoint();this.stage=next;return true;}
 transformUnits(ids,x,z,angle=0){const plan=this.planTransform(this.prepareGroup(ids),x,z,angle);this.commitTransform(plan);return plan;}
 removeUnits(ids){const chosen=new Set(ids);for(const u of this.stage.units)if(chosen.has(u.id))this.rules.assertEditableTeam(u.team);if(!this.stage.units.some(u=>chosen.has(u.id)))return;this.checkpoint();this.stage.units=this.stage.units.filter(u=>!chosen.has(u.id));}
 remove(kind,id){const o=(kind==='unit'?this.stage.units:this.stage.terrain).find(o=>o.id===id);if(!o)return;if(kind==='terrain')this.rules.assertTerrainEditing();else this.rules.assertEditableTeam(o.team);this.checkpoint();let key=kind==='unit'?'units':'terrain';this.stage[key]=this.stage[key].filter(o=>o.id!==id);if(kind==='terrain')this.stage.mapId=null;}
 rotate(kind,id){let o=(kind==='unit'?this.stage.units:this.stage.terrain).find(o=>o.id===id);if(!o)return;if(kind==='terrain')this.rules.assertTerrainEditing();else this.rules.assertEditableTeam(o.team);let next=copy(this.stage),target=(kind==='unit'?next.units:next.terrain).find(o=>o.id===id);target.yaw+=Math.PI/4;const terrain=new Terrain(next.terrain);if(next.units.some(u=>!terrain.canOccupy(u.x,u.z,characterData[u.type].radius)))throw Error('回転するとキャラと重なります。');this.rules.validateStage(next);this.checkpoint();this.stage=next;if(kind==='terrain')this.stage.mapId=null;}
 clear(which){if(this.mode.id==='challenge'){if(which==='terrain'||which==='all')this.rules.assertTerrainEditing();else this.rules.assertEditableTeam(Number(which));}this.checkpoint();if(which==='all')this.stage={units:[],terrain:[],multipliers:normalizeMultipliers(this.stage.multipliers)};else if(which==='terrain'){this.stage.terrain=[];this.stage.mapId=null;}else this.stage.units=this.stage.units.filter(u=>u.team!==Number(which));}
 snapshot(){return copy(this.stage);}
 counts(){return teamIds.map(t=>characterData.map((c,k)=>this.stage.units.filter(u=>u.team===t&&u.type===k).length));}
 presets(){try{const data=JSON.parse(localStorage.getItem(this.mode.storageKey||'stick-fight-presets-v1')||'[]');if(!Array.isArray(data))throw Error();return data;}catch(e){throw Error('保存データを読み込めません。端末の保存設定を確認してください。');}}
 save(name){name=name.trim();if(!name)throw Error('プリセット名を入力してください。');if(name.length>80)throw Error('名前は80文字以内にしてください。');let a=this.presets();if(a.some(p=>p.name===name))throw Error('同じ名前があります。別の名前で保存してください。');a.push({name,version:1,stage:this.snapshot()});try{localStorage.setItem(this.mode.storageKey||'stick-fight-presets-v1',JSON.stringify(a));}catch(e){throw Error('保存できませんでした。端末の空き容量・ブラウザ設定を確認してください。');}}
 load(name){let p=this.presets().find(p=>p.name===name);if(!p||p.version!==1||!p.stage||!Array.isArray(p.stage.units)||!Array.isArray(p.stage.terrain))throw Error('プリセットを読み込めません。');for(let o of p.stage.terrain)if(!terrainData[o.type]||![o.x,o.z,o.yaw,o.scale].every(Number.isFinite)||o.scale<.25||o.scale>3)throw Error('地形データが不正です。');let terrain=new Terrain(p.stage.terrain);for(let u of p.stage.units)if(!characterData[u.type]||!teamIds.includes(u.team)||![u.x,u.z,u.yaw].every(Number.isFinite)||!terrain.canOccupy(u.x,u.z,characterData[u.type].radius))throw Error('キャラクターデータが不正です。');normalizeMultipliers(p.stage.multipliers);this.replace({...p.stage,multipliers:normalizeMultipliers(p.stage.multipliers)});}
}
