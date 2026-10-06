/** Camera targeting is separate from Character controllers and projection math.
 * A future third-person rig can use the same live transform and camera object.
 */
export class CameraRig{
 constructor(camera){this.camera=camera;this.mode='free';this.subject=null;this.freePose=null;this.message='自由カメラ';}
 follow(subject){if(!subject||subject.hp<=0)return false;if(this.mode==='free')this.freePose={target:[...this.camera.target],yaw:this.camera.yaw,pitch:this.camera.pitch,distance:this.camera.distance};
  this.mode='follow';this.subject=subject;this.camera.distance=Math.max(18,Math.min(32,18+subject.data.size*3));this.camera.pitch=.6;this.message='追従中';this.update(0,true);return true;
 }
 release({restore=true,message='自由カメラ'}={}){if(restore&&this.freePose){Object.assign(this.camera,this.freePose);this.camera.target=[...this.freePose.target];}this.mode='free';this.subject=null;this.freePose=null;this.message=message;}
 update(dt,snap=false){if(this.mode!=='follow')return;
  const u=this.subject;if(!u||u.hp<=0){this.release({message:'追従対象が倒れたため自由カメラへ戻りました。'});return;}
  const position=[u.x,u.y+u.data.size,u.z],a=snap?1:1-Math.exp(-10*Math.max(0,dt));for(let i=0;i<3;i++)this.camera.target[i]+=(position[i]-this.camera.target[i])*a;
 }
}
