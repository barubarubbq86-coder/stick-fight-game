import {characterData} from './data.js';
import {Terrain} from './terrain.js';
export const formationData={square:'四角形',row:'横一列',column:'縦列',circle:'円形',scatter:'ランダム散開',v:'V字',wide:'横長',deep:'縦長'};
export const densityData={close:{name:'密集',gap:.12},normal:{name:'標準',gap:.4},wide:{name:'広め',gap:.85}};
export const MAX_GROUP=300;
export function validateCounts(counts){if(!Array.isArray(counts)||counts.length!==characterData.length||counts.some(n=>!Number.isInteger(n)||n<0||n>MAX_GROUP))throw Error('軍団の人数が不正です。');const total=counts.reduce((s,n)=>s+n,0);if(total<1||total>MAX_GROUP)throw Error(`軍団は1〜${MAX_GROUP}体にしてください。`);return total;}
export const expandCounts=counts=>{validateCounts(counts);return counts.flatMap((n,type)=>Array(n).fill(type));};
const hash=i=>{let n=Math.imul(i+1,1597334677);n^=n>>>16;return (n>>>0)/4294967296;};
export function formationOffsets(types,formation='square',density='normal'){
 if(!types.length||types.length>MAX_GROUP||types.some(t=>!Number.isInteger(t)||!characterData[t])||!formationData[formation]||!densityData[density])throw Error('配置設定が不正です。');
 const n=types.length,step=Math.max(...types.map(t=>characterData[t].radius))*2+densityData[density].gap;
 const cols=formation==='wide'?Math.ceil(Math.sqrt(n*2.5)):formation==='deep'?Math.ceil(Math.sqrt(n/2.5)):Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
 return types.map((type,i)=>{let x=0,z=0;
  if(formation==='row')x=(i-(n-1)/2)*step;
  else if(formation==='column')z=(i-(n-1)/2)*step;
  else if(formation==='circle'&&n>1){const r=step/(2*Math.sin(Math.PI/n)),a=i/n*Math.PI*2;x=Math.cos(a)*r;z=Math.sin(a)*r;}
  else if(formation==='v'){const k=Math.ceil(i/2);x=(i%2?1:-1)*k*step;z=k*step-(Math.ceil((n-1)/2)/2)*step;}
  else {x=(i%cols-(Math.min(cols,n-Math.floor(i/cols)*cols)-1)/2)*step;z=(Math.floor(i/cols)-(rows-1)/2)*step;if(formation==='scatter'){x+=(hash(i*2)-.5)*step*.7;z+=(hash(i*2+1)-.5)*step*.7;}}
  return {type,x,z};
 });
}
// One occupancy index per operation; no scans over the entire army for every candidate.
export class PlacementSpace{
 constructor(terrain,units=[]){this.terrain=terrain;this.cells=new Map();this.cell=3;this.maxRadius=Math.max(...characterData.map(c=>c.radius));for(const u of units)this.insert(u);}
 insert(u){const key=`${Math.floor(u.x/this.cell)},${Math.floor(u.z/this.cell)}`;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(u);}
 free(x,z,type){const r=characterData[type].radius;if(!this.terrain.canOccupy(x,z,r))return false;const reach=r+this.maxRadius+.08;
  for(let i=Math.floor((x-reach)/this.cell);i<=Math.floor((x+reach)/this.cell);i++)for(let j=Math.floor((z-reach)/this.cell);j<=Math.floor((z+reach)/this.cell);j++)for(const u of this.cells.get(`${i},${j}`)||[]){if(Math.hypot(u.x-x,u.z-z)<r+characterData[u.type].radius+.08-1e-7)return false;}return true;
 }
 nearest(x,z,type){const r=characterData[type].radius;x=Math.max(-49+r,Math.min(49-r,x));z=Math.max(-34+r,Math.min(34-r,z));if(this.free(x,z,type))return {x,z};
  const step=Math.max(.5,r*1.1);for(let ring=1;ring<=Math.ceil(24/step);ring++){const radius=ring*step,n=Math.min(96,Math.max(12,Math.ceil(2*Math.PI*radius/step)));for(let k=0;k<n;k++){const a=k/n*Math.PI*2,nx=x+Math.cos(a)*radius,nz=z+Math.sin(a)*radius;if(this.free(nx,nz,type))return {x:nx,z:nz};}}return null;
 }
}
export function planGroup(stage,types,x,z,formation='square',density='normal'){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>=49||Math.abs(z)>=34)throw Error('戦場の地面を選んでください。');
 const offsets=formationOffsets(types,formation,density),space=new PlacementSpace(new Terrain(stage.terrain),stage.units),maxR=Math.max(...types.map(t=>characterData[t].radius));
 const xs=offsets.map(o=>o.x),zs=offsets.map(o=>o.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 let cx=x,cz=z;if(maxX-minX<=98-2*maxR)cx=Math.max(-49+maxR-minX,Math.min(49-maxR-maxX,x));if(maxZ-minZ<=68-2*maxR)cz=Math.max(-34+maxR-minZ,Math.min(34-maxR-maxZ,z));
 let adjusted=Math.hypot(cx-x,cz-z)>.01;const units=[];
 for(const o of offsets){const p=space.nearest(cx+o.x,cz+o.z,o.type);if(!p)throw Error(`${types.length}体を置く空きが足りません。別の場所・陣形・人数を選んでください。`);if(Math.hypot(p.x-(x+o.x),p.z-(z+o.z))>.02)adjusted=true;const u={type:o.type,...p};units.push(u);space.insert(u);}
 return {units,adjusted};
}
