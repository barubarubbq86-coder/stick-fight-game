/** Editor-only IDs: independent of combat units, terrain and saved stage schema. */
export class UnitSelection{
 constructor(){this.ids=new Set();}
 clear(){this.ids.clear();}
 prune(units){const valid=new Set(units.map(u=>u.id));for(const id of this.ids)if(!valid.has(id))this.ids.delete(id);}
 set(ids,add=false){if(!add)this.clear();for(const id of ids)this.ids.add(id);}
 tap(id,add=false){if(id===null){if(!add)this.clear();return;}if(add&&this.ids.has(id))this.ids.delete(id);else this.set([id],add);}
 team(units,team,add=false){this.set(units.filter(u=>u.team===team).map(u=>u.id),add);}
 rectangle(units,project,a,b,add=false){const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(a.y,b.y),maxY=Math.max(a.y,b.y);const ids=[];for(const u of units){const p=project(u);if(p&&p[0]>=minX&&p[0]<=maxX&&p[1]>=minY&&p[1]<=maxY)ids.push(u.id);}this.set(ids,add);return ids.length;}
 center(units){let x=0,z=0,n=0;for(const u of units)if(this.ids.has(u.id)){x+=u.x;z+=u.z;n++;}return n?{x:x/n,z:z/n,count:n}:null;}
}
