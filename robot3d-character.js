import * as THREE from './assets/three.module.js';

const host = document.getElementById('robot');
const canvas = document.getElementById('robotCanvas');

const image = new Image();
image.src = 'assets/nuno-robot-orange-cutout.png';
image.onload = () => buildRobot(image);
image.onerror = () => host.classList.add('webgl-failed');

function buildRobot(source) {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, .1, 50);
    camera.position.set(0, 3.35, 13.4);
    camera.lookAt(0, 3.25, 0);

    const root = new THREE.Group();
    root.position.set(-.08, 3.35, 0);
    scene.add(root);

    const W = 4.35, H = 6.53;
    const sx = x => (x / 1024 - .5) * W;
    const sy = y => (.5 - y / 1536) * H;
    const headMask = [[214,0],[788,0],[820,385],[706,492],[280,474],[186,315]];
    const leftUpperMask = [[245,320],[482,330],[475,505],[350,665],[242,620],[220,455]];
    const leftForeMask = [[125,382],[315,390],[350,590],[282,710],[142,660],[108,500]];
    const leftHandMask = [[52,170],[304,174],[322,438],[218,518],[82,433]];
    const rightUpperMask = [[620,320],[814,340],[832,625],[710,706],[632,570]];
    const rightForeMask = [[676,565],[886,570],[920,850],[824,940],[694,804]];
    const rightHandMask = [[750,790],[936,790],[950,1035],[760,1035]];
    const masks = { head: headMask, leftUpper: leftUpperMask, leftFore: leftForeMask, leftHand: leftHandMask, rightUpper: rightUpperMask, rightFore: rightForeMask, rightHand: rightHandMask };

    function drawPart(include, exclusions = []) {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1536;
      const ctx = c.getContext('2d');
      const path = poly => { ctx.beginPath(); poly.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); };
      if (include) {
        ctx.save(); path(include); ctx.clip(); ctx.drawImage(source, 0, 0, 1024, 1536); ctx.restore();
      } else {
        ctx.drawImage(source, 0, 0, 1024, 1536);
        ctx.globalCompositeOperation = 'destination-out'; exclusions.forEach(poly => { path(poly); ctx.fill(); });
      }
      const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return texture;
    }

    const limbMasks = [headMask,leftUpperMask,leftForeMask,leftHandMask,rightUpperMask,rightForeMask,rightHandMask];
    const coreTexture = drawPart(null, limbMasks);
    const textures = { core: coreTexture };
    Object.entries(masks).forEach(([name,mask]) => textures[name] = drawPart(mask));
    const parts = {};

    function addLayer(name, texture, pivot, z, parentName = null) {
      const parent = parentName ? parts[parentName] : root;
      const parentPivot = parentName ? parts[parentName].userData.pivot : [0,0];
      const worldPivot = [sx(pivot[0]), sy(pivot[1])];
      const group = new THREE.Group(); group.position.set(worldPivot[0]-parentPivot[0], worldPivot[1]-parentPivot[1], z); parent.add(group);
      group.userData.pivot = worldPivot;
      const geom = new THREE.PlaneGeometry(W, H, 40, 60);
      const back = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ alphaMap: texture, color: 0x778184, transparent: true, opacity:.72, alphaTest: .025, side: THREE.DoubleSide, depthWrite: false }));
      back.position.set(-sx(pivot[0]), -sy(pivot[1]), -.012); back.scale.set(.998, .998, 1);
      const front = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .025, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      front.position.set(-sx(pivot[0]), -sy(pivot[1]), 0); group.add(front);
      parts[name] = group; return group;
    }

    addLayer('core', textures.core, [512,768], 0);
    addLayer('leftUpper', textures.leftUpper, [390,430], .025);
    addLayer('leftFore', textures.leftFore, [285,585], .012, 'leftUpper');
    addLayer('leftHand', textures.leftHand, [195,440], .012, 'leftFore');
    addLayer('rightUpper', textures.rightUpper, [690,430], .03);
    addLayer('rightFore', textures.rightFore, [765,650], .012, 'rightUpper');
    addLayer('rightHand', textures.rightHand, [835,870], .012, 'rightFore');
    addLayer('head', textures.head, [510,380], .055);

    // Placa pectoral 3D: integrada en la misma jerarquía del torso, no es una superposición HTML.
    const badge = new THREE.Group(); badge.position.set(.04, .65, .025); badge.scale.setScalar(.36); root.add(badge);
    const orange = new THREE.MeshStandardMaterial({ color: 0xf7941d, emissive: 0x672300, emissiveIntensity: .42, roughness: .28, metalness: .3 });
    const bar = new THREE.BoxGeometry(.095,.42,.055);
    const addBar = (x,y,r=0,h=1) => { const m=new THREE.Mesh(bar,orange); m.position.set(x,y,.03); m.scale.y=h; m.rotation.z=r; badge.add(m); };
    addBar(-.25,.03); addBar(-.04,.03); addBar(.08,.03); addBar(.29,.03); addBar(.185,.03,.46,1.08);
    const base = new THREE.Mesh(new THREE.TorusGeometry(.105,.048,8,20,Math.PI),orange); base.position.set(-.145,-.165,.03); base.rotation.z=Math.PI; badge.add(base);

    scene.add(new THREE.HemisphereLight(0xd8fffb, 0x082127, 1.8));
    const rim = new THREE.PointLight(0xff8b19, 20, 12, 2); rim.position.set(3,4,4); scene.add(rim);

    const pointer = new THREE.Vector2(); let last = performance.now(), elapsed = 0;
    const ease = (obj, axis, value, dt, speed=7) => obj.rotation[axis] = THREE.MathUtils.damp(obj.rotation[axis], value, speed, dt);
    const has = c => host.classList.contains(c);
    host.addEventListener('pointermove', e => { const b=host.getBoundingClientRect(); pointer.set(((e.clientX-b.left)/b.width-.5)*2,((e.clientY-b.top)/b.height-.5)*2); });
    host.addEventListener('pointerleave', () => pointer.set(0,0));

    function animate(now=performance.now()) {
      requestAnimationFrame(animate);
      const dt=Math.min((now-last)/1000,.04); last=now; elapsed+=dt; const t=elapsed;
      const greeting=has('greeting'), talking=has('talking'), curious=has('curious');
      const reaction=['programas','eventos','laboratorios','admisiones'].find(k=>has(`react-${k}`));
      root.position.x=-.08+Math.sin(t*.58)*.028;
      root.position.y=3.35+Math.sin(t*1.45)*.035;
      root.scale.y=1+Math.sin(t*1.45)*.0035;
      ease(root,'z',Math.sin(t*.6)*.017,dt,3);
      ease(parts.core,'y',pointer.x*.025,dt,4);
      ease(parts.head,'y',pointer.x*.16+(talking?Math.sin(t*1.8)*.035:0),dt);
      ease(parts.head,'x',-pointer.y*.08+(talking?Math.sin(t*3.1)*.025:0),dt);
      ease(parts.head,'z',curious?.09:talking?Math.sin(t*2.4)*.025:Math.sin(t*.7)*.012,dt);
      let lu=0,lf=0,lh=0,ru=0,rf=0,rh=0,ly=0,ry=0;
      if(greeting){lu=-.035;lf=Math.sin(t*3.1)*.055;lh=Math.sin(t*7.5)*.3;ly=-.025;}
      else if(talking){lu=Math.sin(t*1.6)*.035;lf=Math.sin(t*2.1)*.085;lh=Math.sin(t*2.8)*.1;ru=Math.sin(t*1.45)*.05;rf=Math.sin(t*1.9)*.1;rh=Math.sin(t*2.4)*.07;}
      else if(reaction==='programas'||reaction==='admisiones'){ru=-.08;rf=.12;rh=-.08;ry=-.05;}
      else if(reaction==='laboratorios'){ru=-.12;rf=.2;rh=-.12;ry=-.07;}
      else if(reaction==='eventos'){lu=-.025;lf=.035;lh=Math.sin(t*7)*.18;ly=-.025;}
      else {lf=Math.sin(t*.75)*.008;rf=-Math.sin(t*.75)*.009;lh=Math.sin(t*.9)*.01;}
      ease(parts.leftUpper,'z',lu,dt); ease(parts.leftUpper,'y',ly,dt);
      ease(parts.leftFore,'z',lf,dt); ease(parts.leftHand,'z',lh,dt,10);
      ease(parts.rightUpper,'z',ru,dt); ease(parts.rightUpper,'y',ry,dt);
      ease(parts.rightFore,'z',rf,dt); ease(parts.rightHand,'z',rh,dt,10);
      badge.position.z=.025+Math.sin(t*1.45)*.001;
      renderer.render(scene,camera);
    }
    function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    new ResizeObserver(resize).observe(host); resize(); animate();
    window.ingenio3D={renderer,scene,root,parts};
  } catch(error) {
    console.error('No fue posible iniciar INGENIO 3D',error); host.classList.add('webgl-failed');
  }
}
