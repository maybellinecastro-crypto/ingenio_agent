import * as THREE from './assets/three.module.js';

const host = document.getElementById('robot');
const canvas = document.getElementById('robotCanvas');

try {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 3.4, 12.4);
  camera.lookAt(0, 3.25, 0);

  const white = new THREE.MeshPhysicalMaterial({ color: 0xf3f7f5, roughness: .24, metalness: .18, clearcoat: .78, clearcoatRoughness: .18 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x11191d, roughness: .3, metalness: .72 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x071014, roughness: .78, metalness: .08 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf7941d, emissive: 0x9b3900, emissiveIntensity: .65, roughness: .25, metalness: .38 });
  const orangeGlow = new THREE.MeshBasicMaterial({ color: 0xffa22f, toneMapped: false });
  const teal = new THREE.MeshStandardMaterial({ color: 0x8bcf2f, emissive: 0x254900, emissiveIntensity: .42, roughness: .32, metalness: .36 });
  const screen = new THREE.MeshPhysicalMaterial({ color: 0x071116, roughness: .1, metalness: .45, clearcoat: 1, clearcoatRoughness: .05 });

  const root = new THREE.Group();
  root.position.set(-.05, 1.06, 0);
  root.scale.setScalar(.88);
  root.rotation.y = -.04;
  scene.add(root);

  const joints = {};
  const cast = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const mesh = (geo, mat, pos, scale, parent = root) => {
    const item = cast(new THREE.Mesh(geo, mat));
    if (pos) item.position.set(...pos);
    if (scale) item.scale.set(...scale);
    parent.add(item);
    return item;
  };
  const sphere = (mat, pos, scale, parent) => mesh(new THREE.SphereGeometry(1, 40, 26), mat, pos, scale, parent);
  const capsule = (mat, radius, length, pos, scale, parent) => mesh(new THREE.CapsuleGeometry(radius, length, 10, 24), mat, pos, scale, parent);
  const cylinder = (mat, r1, r2, height, pos, parent, radial = 32) => mesh(new THREE.CylinderGeometry(r1, r2, height, radial), mat, pos, null, parent);
  const joint = (name, pos, parent = root) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); joints[name] = g; return g; };

  // Pelvis y torso: volúmenes superpuestos para una coraza suave y convincente.
  const hips = joint('hips', [0, 2.52, 0]);
  sphere(graphite, [0, 0, 0], [.72, .46, .5], hips);
  sphere(white, [0, .12, .1], [.62, .39, .48], hips);
  const waist = cylinder(graphite, .4, .5, .5, [0, .48, 0], hips);
  waist.rotation.y = Math.PI / 8;

  const torso = joint('torso', [0, 3.05, 0]);
  sphere(white, [0, .78, 0], [1.04, 1.22, .58], torso);
  sphere(graphite, [0, .7, .45], [.84, .91, .22], torso);
  sphere(white, [0, .7, .61], [.65, .7, .15], torso);
  const collar = cylinder(graphite, .36, .31, .32, [0, 1.9, 0], torso);

  // Emblema UN modelado: placa, letras y coraza comparten el mismo grupo 3D.
  const badge = joint('badge', [0, .7, .79], torso);
  badge.scale.setScalar(.62);
  const badgeShape = new THREE.Shape();
  const s = .49, r = .13;
  badgeShape.moveTo(-s + r, -s); badgeShape.lineTo(s - r, -s); badgeShape.quadraticCurveTo(s, -s, s, -s + r);
  badgeShape.lineTo(s, s - r); badgeShape.quadraticCurveTo(s, s, s - r, s); badgeShape.lineTo(-s + r, s);
  badgeShape.quadraticCurveTo(-s, s, -s, s - r); badgeShape.lineTo(-s, -s + r); badgeShape.quadraticCurveTo(-s, -s, -s + r, -s);
  const plate = mesh(new THREE.ExtrudeGeometry(badgeShape, { depth: .12, bevelEnabled: true, bevelSegments: 4, bevelSize: .05, bevelThickness: .04 }), orange, [0, 0, 0], null, badge);
  plate.rotation.x = 0; plate.position.z = -.06;
  const letterMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .22, metalness: .08, clearcoat: .6 });
  const barGeo = new THREE.BoxGeometry(.12, .48, .07);
  const addBar = (x, y, rot = 0, sy = 1) => { const b = mesh(barGeo, letterMat, [x, y, .16], [1, sy, 1], badge); b.rotation.z = rot; return b; };
  addBar(-.29, .06); addBar(-.03, .06); addBar(.11, .06); addBar(.37, .06); addBar(.24, .06, .48, 1.12);
  const uBase = mesh(new THREE.TorusGeometry(.13, .06, 10, 24, Math.PI), letterMat, [-.16, -.18, .16], null, badge); uBase.rotation.z = Math.PI;

  // Cabeza expresiva con visor real, ojos emisivos y aros laterales.
  const neck = joint('neck', [0, 1.91, 0], torso);
  cylinder(orange, .2, .23, .3, [0, .12, 0], neck);
  const head = joint('head', [0, .55, 0], neck);
  sphere(white, [0, 0, 0], [.88, .72, .69], head);
  const visor = sphere(screen, [0, -.03, .5], [.71, .49, .27], head);
  visor.castShadow = false;
  const leftEye = sphere(orangeGlow, [-.25, .06, .7], [.095, .145, .04], head);
  const rightEye = sphere(orangeGlow, [.25, .06, .7], [.095, .145, .04], head);
  const mouth = mesh(new THREE.TorusGeometry(.17, .026, 10, 36, Math.PI), orangeGlow, [0, -.2, .72], null, head);
  mouth.rotation.z = Math.PI; mouth.scale.y = .62;
  const antenna = cylinder(orange, .026, .04, .48, [.64, .55, .02], head, 12); antenna.rotation.z = -.1;
  sphere(orangeGlow, [.66, .8, .02], [.065, .065, .065], head);
  [-1, 1].forEach(side => {
    const ear = cylinder(graphite, .19, .19, .12, [side * .82, 0, 0], head); ear.rotation.z = Math.PI / 2;
    const ring = mesh(new THREE.TorusGeometry(.145, .04, 12, 30), orange, [side * .88, 0, 0], null, head); ring.rotation.y = Math.PI / 2;
  });

  function makeArm(side) {
    const shoulder = joint(side < 0 ? 'shoulderL' : 'shoulderR', [side * 1.05, 4.18, 0], root);
    sphere(graphite, [0, 0, 0], [.32, .32, .32], shoulder);
    sphere(white, [side * .04, -.1, 0], [.39, .43, .38], shoulder);
    const upper = capsule(white, .25, .83, [0, -.76, 0], [.9, 1, .9], shoulder);
    upper.rotation.z = side * -.04;
    sphere(teal, [side * .2, -.72, .2], [.075, .34, .075], shoulder);
    const elbow = joint(side < 0 ? 'elbowL' : 'elbowR', [0, -1.38, 0], shoulder);
    sphere(graphite, [0, 0, 0], [.22, .22, .22], elbow);
    sphere(orange, [0, 0, .2], [.095, .095, .055], elbow);
    capsule(white, .22, .82, [0, -.7, 0], [.9, 1, .9], elbow);
    const wrist = joint(side < 0 ? 'wristL' : 'wristR', [0, -1.35, 0], elbow);
    cylinder(orange, .15, .15, .18, [0, 0, 0], wrist);
    const hand = sphere(graphite, [0, -.27, .02], [.27, .36, .2], wrist);
    hand.rotation.z = side * .08;
    return shoulder;
  }
  makeArm(-1); makeArm(1);

  function makeLeg(side) {
    const hip = joint(side < 0 ? 'hipL' : 'hipR', [side * .43, 2.5, 0], root);
    sphere(graphite, [0, 0, 0], [.31, .31, .31], hip);
    capsule(white, .32, 1.05, [0, -.86, 0], [1, 1, .9], hip);
    sphere(teal, [side * .24, -.86, .18], [.07, .4, .07], hip);
    const knee = joint(side < 0 ? 'kneeL' : 'kneeR', [0, -1.58, 0], hip);
    sphere(graphite, [0, 0, 0], [.29, .29, .28], knee);
    sphere(orange, [0, 0, .27], [.12, .12, .065], knee);
    capsule(white, .3, 1.12, [0, -.9, 0], [1, 1, .88], knee);
    sphere(teal, [side * .21, -.9, .18], [.06, .38, .065], knee);
    const ankle = joint(side < 0 ? 'ankleL' : 'ankleR', [0, -1.68, 0], knee);
    const foot = sphere(white, [side * .03, -.15, .25], [.42, .3, .67], ankle);
    foot.rotation.x = -.08;
    sphere(rubber, [side * .03, -.31, .27], [.4, .11, .63], ankle);
    return hip;
  }
  makeLeg(-1); makeLeg(1);

  // Detalles de hombros y torso institucionales.
  [-1, 1].forEach(side => {
    const trim = mesh(new THREE.TorusGeometry(.25, .045, 10, 28, Math.PI * 1.2), teal, [side * .91, 4.29, .31], null, root);
    trim.rotation.z = side < 0 ? -.35 : Math.PI + .35;
  });
  const chestArc = mesh(new THREE.TorusGeometry(.74, .04, 10, 42, Math.PI * .92), orange, [0, 3.75, .58], null, root);
  chestArc.rotation.z = Math.PI * 1.04;

  const hemi = new THREE.HemisphereLight(0xa9fff8, 0x052129, 2.2); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 4); key.position.set(-4, 8, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rim = new THREE.PointLight(0xff8b19, 45, 12, 2); rim.position.set(3.5, 5, 2.5); scene.add(rim);
  const fill = new THREE.PointLight(0x24c8be, 35, 14, 2); fill.position.set(-4, 3, 3); scene.add(fill);

  const floor = mesh(new THREE.CircleGeometry(3.2, 64), new THREE.ShadowMaterial({ color: 0x000000, opacity: .32 }), [0, -.02, 0]);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.castShadow = false;

  let lastFrame = performance.now(), elapsed = 0;
  const pointer = new THREE.Vector2();
  const current = {};
  Object.keys(joints).forEach(k => current[k] = new THREE.Vector3());
  const ease = (obj, axis, target, dt, speed = 8) => { obj.rotation[axis] = THREE.MathUtils.damp(obj.rotation[axis], target, speed, dt); };
  const is = name => host.classList.contains(name);

  host.addEventListener('pointermove', e => {
    const b = host.getBoundingClientRect(); pointer.x = ((e.clientX - b.left) / b.width - .5) * 2; pointer.y = ((e.clientY - b.top) / b.height - .5) * 2;
  });
  host.addEventListener('pointerleave', () => pointer.set(0, 0));

  function animate(now = performance.now()) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastFrame) / 1000, .04); lastFrame = now; elapsed += dt; const t = elapsed;
    const talking = is('talking'), greeting = is('greeting'), curious = is('curious');
    const reaction = ['programas','eventos','laboratorios','admisiones'].find(k => is(`react-${k}`));
    const breath = Math.sin(t * 1.65);

    root.position.y = THREE.MathUtils.damp(root.position.y, 1.06 + breath * .035, 4, dt);
    ease(root, 'z', Math.sin(t * .7) * .012, dt, 3);
    ease(joints.torso, 'z', breath * .018 + (talking ? Math.sin(t * 2.8) * .025 : 0), dt, 5);
    ease(joints.torso, 'y', pointer.x * .035, dt, 4);
    ease(joints.head, 'y', pointer.x * .28 + (talking ? Math.sin(t * 1.9) * .055 : 0), dt, 7);
    ease(joints.head, 'x', -pointer.y * .13 + (talking ? Math.sin(t * 3.3) * .035 : 0), dt, 7);
    ease(joints.head, 'z', curious ? .16 : greeting ? -.08 : Math.sin(t * .72) * .018, dt, 7);

    let slz = .08, srz = -.08, elz = -.06, erz = .06, sly = 0, sry = 0;
    if (greeting) {
      slz = -.84; elz = -2.35 + Math.sin(t * 8) * .16; sly = -.18;
    } else if (talking) {
      slz = -.42 + Math.sin(t * 1.7) * .18; elz = -.58 + Math.sin(t * 2.1) * .2;
      srz = .58 + Math.sin(t * 1.35 + 1) * .22; erz = .62 + Math.sin(t * 1.8) * .18;
    } else if (reaction === 'programas' || reaction === 'admisiones') {
      srz = .98; erz = .75; sry = -.38;
    } else if (reaction === 'laboratorios') {
      srz = 1.25; erz = .22; sry = -.5;
    } else if (reaction === 'eventos') {
      slz = -1.65; elz = -1.2 + Math.sin(t * 7) * .25;
    } else {
      slz += Math.sin(t * .9) * .035; srz -= Math.sin(t * .9) * .035;
    }
    ease(joints.shoulderL, 'z', slz, dt); ease(joints.shoulderR, 'z', srz, dt);
    ease(joints.shoulderL, 'y', sly, dt); ease(joints.shoulderR, 'y', sry, dt);
    ease(joints.elbowL, 'z', elz, dt); ease(joints.elbowR, 'z', erz, dt);
    ease(joints.wristL, 'y', greeting ? Math.sin(t * 9) * .55 : 0, dt, 10);
    ease(joints.wristR, 'y', talking ? Math.sin(t * 2.4) * .18 : 0, dt, 7);

    ease(joints.hipL, 'z', -.035 + breath * .008, dt, 4); ease(joints.hipR, 'z', .035 - breath * .008, dt, 4);
    ease(joints.kneeL, 'x', .035, dt, 4); ease(joints.kneeR, 'x', .035, dt, 4);
    leftEye.scale.y = .19 * (Math.sin(t * .63) > .985 ? .12 : 1);
    rightEye.scale.y = leftEye.scale.y;
    orange.emissiveIntensity = .58 + Math.sin(t * 2.1) * .12;
    renderer.render(scene, camera);
  }

  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize(); animate();
  window.ingenio3D = { renderer, scene, root };
} catch (error) {
  console.error('No fue posible iniciar el robot 3D', error);
  host.classList.add('webgl-failed');
}
