import * as THREE from './assets/three.module.js';
import { GLTFLoader } from './assets/GLTFLoader.js';

const host = document.getElementById('robot');
const canvas = document.getElementById('robotCanvas');

try {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 100);
  camera.position.set(0, 3.45, 13.6);
  camera.lookAt(0, 3.35, 0);

  scene.add(new THREE.HemisphereLight(0xe8fffd, 0x06242c, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 4.2); key.position.set(-4, 8, 7); key.castShadow = true; key.shadow.mapSize.set(1024,1024); scene.add(key);
  const orange = new THREE.PointLight(0xff8b18, 34, 13, 2); orange.position.set(3, 4.5, 3); scene.add(orange);
  const teal = new THREE.PointLight(0x2ac5bb, 23, 12, 2); teal.position.set(-4, 3, 2); scene.add(teal);

  const rig = {};
  const base = {};
  let model = null, ready = false;
  const pointer = new THREE.Vector2();
  const nodeNames = ['INGENIO_RIG','Rig_Hips','Rig_Torso','Rig_Neck','Rig_Head','Rig_Shoulder_L','Rig_Elbow_L','Rig_Wrist_L','Rig_Shoulder_R','Rig_Elbow_R','Rig_Wrist_R','Rig_Hip_L','Rig_Knee_L','Rig_Ankle_L','Rig_Hip_R','Rig_Knee_R','Rig_Ankle_R'];

  new GLTFLoader().load('./assets/ingenio.glb?v=3', gltf => {
    model = gltf.scene;
    scene.add(model);
    model.traverse(obj => {
      if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 6.45 / size.y;
    model.scale.setScalar(scale);
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y -= box.min.y;
    model.position.z -= center.z;
    nodeNames.forEach(name => {
      const node = model.getObjectByName(name);
      if (node) { rig[name] = node; base[name] = node.rotation.clone(); }
    });
    ready = true;
    host.classList.add('model-ready');
  }, undefined, error => {
    console.error('No fue posible cargar el modelo 3D de INGENIO', error);
    host.classList.add('webgl-failed');
  });

  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.1,64), new THREE.ShadowMaterial({ color:0x000000, opacity:.28 }));
  floor.rotation.x = -Math.PI/2; floor.position.y = -.02; floor.receiveShadow = true; scene.add(floor);

  host.addEventListener('pointermove', e => { const b=host.getBoundingClientRect(); pointer.set(((e.clientX-b.left)/b.width-.5)*2, ((e.clientY-b.top)/b.height-.5)*2); });
  host.addEventListener('pointerleave', () => pointer.set(0,0));

  const has = name => host.classList.contains(name);
  const dampRot = (name, x, y, z, dt, speed=7) => {
    const obj=rig[name], origin=base[name]; if(!obj||!origin) return;
    obj.rotation.x=THREE.MathUtils.damp(obj.rotation.x,origin.x+x,speed,dt);
    obj.rotation.y=THREE.MathUtils.damp(obj.rotation.y,origin.y+y,speed,dt);
    obj.rotation.z=THREE.MathUtils.damp(obj.rotation.z,origin.z+z,speed,dt);
  };

  let last=performance.now(), elapsed=0;
  function animate(now=performance.now()) {
    requestAnimationFrame(animate);
    const dt=Math.min((now-last)/1000,.04); last=now; elapsed+=dt; const t=elapsed;
    if(ready) {
      const greeting=has('greeting'), talking=has('talking'), curious=has('curious');
      const reaction=['programas','eventos','laboratorios','admisiones'].find(k=>has(`react-${k}`));
      const breath=Math.sin(t*1.55), sway=Math.sin(t*.72);
      dampRot('Rig_Hips',0,0,sway*.018,dt,3);
      dampRot('Rig_Torso',breath*.008,sway*.012,-sway*.025,dt,4);
      dampRot('Rig_Neck',0,pointer.x*.055,0,dt,6);
      dampRot('Rig_Head',-pointer.y*.075+(talking?Math.sin(t*3)*.025:0),pointer.x*.16+(talking?Math.sin(t*1.8)*.04:0),curious?.11:sway*.02,dt,7);

      let slx=0,sly=0,slz=0,elx=0,ely=0,elz=0,wlx=0,wly=0,wlz=0;
      let srx=0,sry=0,srz=0,erx=0,ery=0,erz=0,wrx=0,wry=0,wrz=0;
      if(greeting){slz=-.045;ely=Math.sin(t*2.6)*.045;wlz=Math.sin(t*7.2)*.16;wly=Math.sin(t*5.4)*.045;}
      else if(talking){slz=Math.sin(t*1.4)*.045;ely=Math.sin(t*1.9)*.085;wlz=Math.sin(t*2.8)*.1;srz=Math.sin(t*1.25)*.06;erz=Math.sin(t*1.75)*.13;wry=Math.sin(t*2.2)*.1;}
      else if(reaction==='programas'||reaction==='admisiones'){srz=-.22;erz=.34;ery=-.18;wry=-.16;}
      else if(reaction==='laboratorios'){srz=-.3;erz=.42;ery=-.22;wrz=-.12;}
      else if(reaction==='eventos'){slz=-.045;ely=.06;wlz=Math.sin(t*7)*.28;}
      else {elz=Math.sin(t*.8)*.012;erz=-Math.sin(t*.8)*.012;}
      dampRot('Rig_Shoulder_L',slx,sly,slz,dt); dampRot('Rig_Elbow_L',elx,ely,elz,dt); dampRot('Rig_Wrist_L',wlx,wly,wlz,dt,10);
      dampRot('Rig_Shoulder_R',srx,sry,srz,dt); dampRot('Rig_Elbow_R',erx,ery,erz,dt); dampRot('Rig_Wrist_R',wrx,wry,wrz,dt,10);
      dampRot('Rig_Hip_L',0,0,-sway*.012,dt,3); dampRot('Rig_Hip_R',0,0,sway*.012,dt,3);
      dampRot('Rig_Knee_L',breath*.006,0,0,dt,3); dampRot('Rig_Knee_R',-breath*.006,0,0,dt,3);
    }
    renderer.render(scene,camera);
  }

  function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(host); resize(); animate();
  window.ingenio3D={scene,renderer,rig};
} catch(error) {
  console.error('No fue posible iniciar INGENIO 3D',error); host.classList.add('webgl-failed');
}
