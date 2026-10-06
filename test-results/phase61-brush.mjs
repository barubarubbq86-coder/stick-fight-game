import assert from 'node:assert/strict';import fs from 'node:fs';import {environment} from './ui-adapter.js';
const rows=[];const stats=a=>({n:a.length,mean:a.length?a.reduce((s,v)=>s+v,0)/a.length:0,max:Math.max(0,...a),over50:a.filter(x=>x>50).length});
for(const build of ['base','stable'])for(const budget of ['official','stress'])for(const size of [1,5,10])for(const attempts of [50,100,300]){
 const rootDir=new URL(build==='base'?'./baseline-v13/':'../',import.meta.url).pathname;
 const env=await environment(370,640,{rootDir,measure:true}),{api,ids,send,metrics}=env;
 ids.get('challengePicker').value='flag-defense';api.chooseMode('challenge');if(budget==='stress')api.editor.rules.costLimit=100000;
 ids.get('placeType').value='10';ids.get('brushCount').value=String(size);api.selectMode('brush');api.camera.update(370/640);
 for(const a of Object.values(metrics))a.length=0;const battle=api.battle,history=api.editor.history.length;
 const point=i=>api.camera.project(-17+(i%11)*3.1,0,-14+(Math.floor(i/11)%10)*2.8,370,640);
 send('down',1,point(0));for(let i=1;i<=attempts/size;i++)send('move',1,point(i));send('up',1,point(Math.ceil(attempts/size)));
 const placed=api.editor.stage.units.length;assert(placed>0);if(budget==='official')assert(placed<=60);if(build==='stable'){assert.equal(api.battle,battle);assert.equal(metrics.constructor.length,0);assert.equal(api.battle.units.length,placed);}assert.equal(api.editor.history.length,history+1);
 const row={build,budget,size,attempts,placed,constructor:stats(metrics.constructor),refresh:stats(metrics.refresh),dom:stats(metrics.dom),stamp:stats(metrics.stamp)};rows.push(row);
 if(budget==='official'){api.beginBattle();assert(!api.editing);assert.equal(api.battle.objective.hp,5000);assert.equal(api.battle.runtime.wave,0);api.frame(performance.now()+40);assert(!api.frameError);ids.get('back').onclick();assert(api.editing);api.chooseMode('sandbox');assert(!api.battle.objective);assert(!api.battle.runtime);assert(!api.battle.deploymentZone);ids.get('challengePicker').value='flag-defense';api.chooseMode('challenge');assert.equal(api.editor.stage.units.length,placed);}
 else {ids.get('undo').onclick();assert.equal(api.editor.stage.units.length,0);}
}
fs.writeFileSync(new URL('phase61-brush-results.json',import.meta.url),JSON.stringify({method:'actual touch pointer handlers with DOM/WebGL adapter, timings are CPU only; stress budget changes test instance only',rows},null,2));console.log(rows);
