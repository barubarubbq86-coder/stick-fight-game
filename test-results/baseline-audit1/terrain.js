/** Shared terrain queries: rendering, AI and future player movement use this module. */
export const terrainData = {
 smallHill: {name:'小さな丘',radius:6,height:2.3,blocking:false,color:'#819d69'},
 largeHill: {name:'大きな丘',radius:10,height:5,blocking:false,color:'#74905d'},
 rock: {name:'岩',radius:2,height:3,blocking:true,color:'#87909b'},
 wall: {name:'壁',width:10,depth:1.4,height:3.2,blocking:true,color:'#b9b1a4'}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class Terrain {
 constructor(objects=[]) {
  this.objects=objects;this.obstacles=objects.filter(o=>terrainData[o.type]?.blocking);
  this.shapes=new WeakMap();this.hills=objects.filter(o=>terrainData[o.type]&&!terrainData[o.type].blocking);
  this.cell=1.5;this.cols=66;this.rows=46;this.grids=new Map();this.flows=new Map();
 }
 heightAt(x,z) {
  let height=0;
  for(const o of this.hills){const d=terrainData[o.type],s=o.scale||1,r=d.radius*s;
   const q=Math.hypot(x-o.x,z-o.z)/r;
   if(q<1)height=Math.max(height,d.height*s*(.5+.5*Math.cos(Math.PI*q)));
  }return height;
 }
 canOccupy(x,z,radius=0) {
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<-49+radius||x>49-radius||z<-34+radius||z>34-radius)return false;
  for(const o of this.obstacles){const d=terrainData[o.type],s=o.scale||1,dx=x-o.x,dz=z-o.z;
   if(o.type==='rock'){if(dx*dx+dz*dz<(d.radius*s+radius)**2)return false;}
   else {let shape=this.shapes.get(o);if(!shape||shape.yaw!==(o.yaw||0)){shape={yaw:o.yaw||0,c:Math.cos(o.yaw||0),sn:Math.sin(o.yaw||0)};this.shapes.set(o,shape);}const c=shape.c,sn=shape.sn,lx=c*dx-sn*dz,lz=sn*dx+c*dz;
    const qx=Math.max(0,Math.abs(lx)-d.width*s/2),qz=Math.max(0,Math.abs(lz)-d.depth*s/2);
    if(qx*qx+qz*qz<radius*radius || (!radius&&qx===0&&qz===0))return false;
   }
  }return true;
 }
 /** Swept movement with axis sliding; no tunnelling from knockback or separation. */
 move(x,z,nx,nz,radius=.4) {
  nx=clamp(nx,-49+radius,49-radius);nz=clamp(nz,-34+radius,34-radius);
  const steps=Math.max(1,Math.ceil(Math.hypot(nx-x,nz-z)/.3)),dx=(nx-x)/steps,dz=(nz-z)/steps;
  for(let i=0;i<steps;i++){
   if(this.canOccupy(x+dx,z+dz,radius)){x+=dx;z+=dz;}
   else if(this.canOccupy(x+dx,z,radius)){x+=dx;}
   else if(this.canOccupy(x,z+dz,radius)){z+=dz;}
  }return {x,z};
 }
 lineClear(x,z,tx,tz,radius=.4){
  const steps=Math.ceil(Math.hypot(tx-x,tz-z)/.65);
  for(let i=1;i<=steps;i++)if(!this.canOccupy(x+(tx-x)*i/steps,z+(tz-z)*i/steps,radius))return false;
  return true;
 }
 index(x,z){return clamp(Math.floor((z+34)/this.cell),0,this.rows-1)*this.cols+clamp(Math.floor((x+49)/this.cell),0,this.cols-1);}
 center(index){return {x:-49+(index%this.cols+.5)*this.cell,z:-34+(Math.floor(index/this.cols)+.5)*this.cell};}
 grid(radius){
  const key=Math.ceil(radius*4)/4;
  if(this.grids.has(key))return this.grids.get(key);
  const cells=new Uint8Array(this.cols*this.rows);
  for(let i=0;i<cells.length;i++){const p=this.center(i);cells[i]=this.canOccupy(p.x,p.z,key+.18)?1:0;}
  // Label connected walkable regions once per body size, shared by all AI queries.
  const components=new Int16Array(cells.length),queue=new Int32Array(cells.length);let component=0;
  for(let start=0;start<cells.length;start++){if(!cells[start]||components[start])continue;component++;let head=0,tail=1;queue[0]=start;components[start]=component;
   while(head<tail){const i=queue[head++],x=i%this.cols,z=Math.floor(i/this.cols);
    for(const n of [x>0?i-1:-1,x+1<this.cols?i+1:-1,z>0?i-this.cols:-1,z+1<this.rows?i+this.cols:-1])
     if(n>=0&&cells[n]&&!components[n]){components[n]=component;queue[tail++]=n;}
   }
  }
  const grid={cells,components,radius:key};this.grids.set(key,grid);return grid;
 }
 nearestOpen(index,cells){
  if(cells[index])return index;
  const ix=index%this.cols,iz=Math.floor(index/this.cols);
  for(let r=1;r<Math.max(this.cols,this.rows);r++){
   let best=-1,dist=Infinity;
   for(let z=Math.max(0,iz-r);z<=Math.min(this.rows-1,iz+r);z++)for(let x=Math.max(0,ix-r);x<=Math.min(this.cols-1,ix+r);x++){
    if(Math.abs(x-ix)!==r&&Math.abs(z-iz)!==r)continue;
    const i=z*this.cols+x,d=(x-ix)**2+(z-iz)**2;if(cells[i]&&d<dist){best=i;dist=d;}
   }if(best>=0)return best;
  }return -1;
 }
 flow(tx,tz,radius){
  const grid=this.grid(radius),target=this.index(tx,tz);
  // Units pursuing nearby targets share one field. Direct steering resumes near the target.
  const col=Math.floor(target%this.cols/3)*3+1,row=Math.floor(Math.floor(target/this.cols)/3)*3+1;
  let goal=this.nearestOpen(clamp(row,0,this.rows-1)*this.cols+clamp(col,0,this.cols-1),grid.cells);
  // A coarse shared goal must stay on the target's side of an obstacle.
  if(goal>=0){const p=this.center(goal);if(!this.lineClear(p.x,p.z,tx,tz,radius))goal=this.anchorAt(tx,tz,grid,radius);}
  const key=`${grid.radius}:${goal}`;
  if(this.flows.has(key)){const f=this.flows.get(key);this.flows.delete(key);this.flows.set(key,f);return f;}
  const dist=new Int16Array(grid.cells.length);dist.fill(-1);
  if(goal>=0){const queue=new Int32Array(dist.length);let head=0,tail=1;queue[0]=goal;dist[goal]=0;
   while(head<tail){const i=queue[head++],x=i%this.cols,z=Math.floor(i/this.cols);
    const ns=[x>0?i-1:-1,x+1<this.cols?i+1:-1,z>0?i-this.cols:-1,z+1<this.rows?i+this.cols:-1];
    for(const n of ns)if(n>=0&&grid.cells[n]&&dist[n]<0){dist[n]=dist[i]+1;queue[tail++]=n;}
   }
  }
  const field={dist,grid,goal};this.flows.set(key,field);
  if(this.flows.size>64)this.flows.delete(this.flows.keys().next().value);
  return field;
 }
 anchorAt(x,z,grid,radius){
  const i=this.index(x,z),p=this.center(i);
  if(grid.components[i]&&this.lineClear(x,z,p.x,p.z,radius))return i;
  const cx=i%this.cols,cz=Math.floor(i/this.cols);
  for(let r=1;r<=2;r++)for(let oz=-r;oz<=r;oz++)for(let ox=-r;ox<=r;ox++){
   if(Math.abs(ox)!==r&&Math.abs(oz)!==r)continue;const nx=cx+ox,nz=cz+oz;if(nx<0||nx>=this.cols||nz<0||nz>=this.rows)continue;
   const n=nz*this.cols+nx;if(!grid.components[n])continue;const q=this.center(n);if(this.lineClear(x,z,q.x,q.z,radius))return n;
  }return -1;
 }
 componentAt(x,z,grid,radius){const i=this.anchorAt(x,z,grid,radius);return i<0?0:grid.components[i];}
 reachable(x,z,tx,tz,radius=.4){
  if(!this.obstacles.length)return true;
  const grid=this.grid(radius);let cache=this.sourceAnchor;if(!cache||cache.x!==x||cache.z!==z||cache.grid!==grid||cache.radius!==radius)this.sourceAnchor=cache={x,z,grid,radius,a:this.componentAt(x,z,grid,radius)};const a=cache.a,b=this.componentAt(tx,tz,grid,radius);
  if(a&&a===b)return true;
  // Keep direct routes through narrow gaps that the coarse grid cannot represent.
  return this.lineClear(x,z,tx,tz,radius);
 }
 direction(x,z,tx,tz,radius=.4){
  const dx=tx-x,dz=tz-z,len=Math.hypot(dx,dz);
  if(len<.05)return {x:0,z:0};
  if(!this.obstacles.length||this.lineClear(x,z,tx,tz,radius))return {x:dx/len,z:dz/len};
  const f=this.flow(tx,tz,radius),i=this.index(x,z),ix=i%this.cols,iz=Math.floor(i/this.cols);
  let best=-1,score=Infinity;
  for(let oz=-1;oz<=1;oz++)for(let ox=-1;ox<=1;ox++){
   if(!ox&&!oz)continue;const cx=ix+ox,cz=iz+oz;if(cx<0||cx>=this.cols||cz<0||cz>=this.rows)continue;
   const n=cz*this.cols+cx;if(f.dist[n]<0)continue;
   // Diagonals cannot cut blocked corners.
   if(ox&&oz&&(!f.grid.cells[iz*this.cols+cx]||!f.grid.cells[cz*this.cols+ix]))continue;
   const p=this.center(n);if(!this.lineClear(x,z,p.x,p.z,radius))continue;
   const s=f.dist[n]+Math.hypot(p.x-tx,p.z-tz)*.002;
   if(s<score){score=s;best=n;}
  }
  if(best<0)return {x:0,z:0};
  const p=this.center(best),vx=p.x-x,vz=p.z-z,l=Math.hypot(vx,vz)||1;
  return {x:vx/l,z:vz/l};
 }
}
