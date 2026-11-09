// Maqueta 3D del espacio de Frank en ETM Day 2026.
// Ejes: X a lo largo del mesón, Y arriba, +Z hacia el público del lado de Frank. Unidades en metros.
// Medidas del manual del expositor: tramo de 1,50 x 0,60 m, mesón a 1,05 m, espina de 1,60 m sobre el mesón.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MOVIL = matchMedia('(max-width: 640px)').matches || navigator.maxTouchPoints > 1;

// ------------------------------------------------------------ medidas
const H = 1.05, LADO = 0.60, ESPINA = 0.04, ALTO_ESPINA = 1.60, TRAMO = 1.5, N = 7, ESP = 0.035;
const D = ESPINA / 2 + LADO;          // de la espina al borde
const LARGO = TRAMO * N;

// ------------------------------------------------------------ azar reproducible
let semilla = 11;
const rnd = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
const entre = (a, b) => a + (b - a) * rnd();
const elegir = (arr) => arr[Math.floor(rnd() * arr.length)];

// ------------------------------------------------------------ escena
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOVIL ? 1.75 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const HORIZONTE = new THREE.Color('#e9eef0');
scene.fog = new THREE.FogExp2(HORIZONTE, 0.0042);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 2500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.5;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.495;
controls.autoRotateSpeed = 0.6;

// Cielo con degradé y luz
{
  const geo = new THREE.SphereGeometry(1800, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#7fa9d6') }, mid: { value: new THREE.Color('#bcd3e6') }, bottom: { value: HORIZONTE } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h < 0.06 ? bottom : (h < 0.3 ? mix(bottom, mid, (h-0.06)/0.24) : mix(mid, top, clamp((h-0.3)/0.6,0.,1.)));
      gl_FragColor = vec4(c,1.0);
      #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
}
scene.add(new THREE.HemisphereLight('#d8e6f5', '#b5a283', 1.25));
const sol = new THREE.DirectionalLight('#fff3e2', 2.6);
sol.position.set(-9, 17, 13);
sol.castShadow = true;
sol.shadow.mapSize.set(MOVIL ? 2048 : 4096, MOVIL ? 2048 : 4096);
Object.assign(sol.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
sol.shadow.bias = -0.0004;
sol.shadow.normalBias = 0.02;
sol.target.position.set(0, 0, -4);
scene.add(sol, sol.target);

// ------------------------------------------------------------ texturas
const cargador = new THREE.TextureLoader();
const pendientes = [];
function tex(url) {
  const t = cargador.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  pendientes.push(new Promise((ok) => { t.onUpdate = ok; setTimeout(ok, 6000); }));
  return t;
}
function texCanvas(w, h, pintar, rep = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  pintar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  t.anisotropy = 8;
  return t;
}
function ruido(ctx, w, h, base, puntos, n, tam) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = elegir(puntos);
    ctx.globalAlpha = entre(0.15, 0.5);
    const s = entre(tam[0], tam[1]);
    ctx.fillRect(rnd() * w, rnd() * h, s, s);
  }
  ctx.globalAlpha = 1;
}
const texMaicillo = texCanvas(512, 512, (c, w, h) => ruido(c, w, h, '#c9b590', ['#b29b74', '#d8c6a3', '#a89070', '#e2d3b3'], 9000, [1, 3]), [60, 60]);
const texPasto = texCanvas(512, 512, (c, w, h) => ruido(c, w, h, '#6e8a3d', ['#5b7731', '#86a04a', '#4e6a2a', '#93a956'], 12000, [1, 4]), [120, 120]);
const texVeta = texCanvas(256, 256, (c, w, h) => {
  c.fillStyle = '#ddc39a'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    c.strokeStyle = rnd() < 0.5 ? 'rgba(160,120,70,.18)' : 'rgba(255,240,210,.18)';
    c.lineWidth = entre(1, 2.5);
    c.beginPath(); c.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.03 + y) * 2);
    c.stroke();
  }
}, [1, 1]);

// ------------------------------------------------------------ materiales (compartidos)
const cacheMat = new Map();
function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!cacheMat.has(k)) cacheMat.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts }));
  return cacheMat.get(k);
}
const MAT = {
  pino: new THREE.MeshStandardMaterial({ color: '#f0d6ae', map: texVeta, roughness: 0.75 }),
  pinoOsc: mat('#7b4f30', { roughness: 0.6 }),
  terciado: new THREE.MeshStandardMaterial({ color: '#f3e0c0', map: texVeta, roughness: 0.8 }),
  cubierta: mat('#d4d0c9', { roughness: 0.65 }),
  blanco: mat('#f2f0ec'),
  rojo: mat('#c8202f', { roughness: 0.6 }),
  alu: mat('#c9ccd0', { roughness: 0.3, metalness: 0.85 }),
  grafito: mat('#2b2b2e', { roughness: 0.35, metalness: 0.5 }),
  ink: mat('#1d1b19', { roughness: 0.55 }),
  acrilico: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.03, transmission: 0.92, thickness: 0.005, transparent: true, opacity: 0.35 }),
  maceta: mat('#b8643c', { roughness: 0.85 }),
  hoja: mat('#4d7a3a', { roughness: 0.5 }),
  tronco: mat('#5d4836', { roughness: 0.95 }),
  agua: new THREE.MeshStandardMaterial({ color: '#6f95a8', roughness: 0.08, metalness: 0.2 }),
};
function matTex(url, extra = {}) {
  return new THREE.MeshStandardMaterial({ map: tex(url), roughness: 0.6, ...extra });
}
const MT = {
  pendon: matTex('assets/pendon.png'),
  placa: matTex('assets/placa.png'),
  qr: matTex('assets/qr.png'),
  tarjeta: matTex('assets/tarjeta.png'),
  polera: matTex('assets/polera-espalda.png', { transparent: true, alphaTest: 0.3 }),
};
{
  const t = tex('assets/tablet.png');
  MT.tablet = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.2 });
}

// ------------------------------------------------------------ geometría
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function malla(geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, padre) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  (padre || scene).add(m);
  return m;
}
const caja = (w, h, d, material, x, y, z, rx, ry, rz, padre) =>
  malla(new THREE.BoxGeometry(w, h, d), material, x, y, z, rx, ry, rz, padre);
const cil = (r, h, material, x, y, z, padre, seg = 24) =>
  malla(new THREE.CylinderGeometry(r, r, h, seg), material, x, y, z, 0, 0, 0, padre);
const lamina = (w, h, material, x, y, z, rx = 0, ry = 0, padre) =>
  malla(new THREE.PlaneGeometry(w, h), material, x, y, z, rx, ry, 0, padre);
function liston(a, b, s, material, padre) {
  const d = b.clone().sub(a);
  const m = malla(new THREE.BoxGeometry(s, d.length(), s), material, 0, 0, 0, 0, 0, 0, padre);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

// Todo lo estático se "hornea" en una malla por material para dibujar rápido.
const horno = new Map();
function hornear(obj, grupo = 'base') {
  obj.updateMatrixWorld(true);
  obj.traverse((m) => {
    if (!m.isMesh) return;
    let g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const clave = grupo + m.material.uuid;
    if (!horno.has(clave)) horno.set(clave, { material: m.material, grupo, geos: [], sombra: m.castShadow });
    horno.get(clave).geos.push(g);
  });
  obj.removeFromParent();
}
function cerrarHorno() {
  const hechas = [];
  for (const { material, grupo, geos, sombra } of horno.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), material);
    m.castShadow = sombra;
    m.receiveShadow = true;
    m.userData.grupo = grupo;
    scene.add(m);
    hechas.push(m);
  }
  horno.clear();
  return hechas;
}

// ------------------------------------------------------------ suelo y parque
{
  const pasto = new THREE.Mesh(new THREE.CircleGeometry(900, 64), new THREE.MeshStandardMaterial({ map: texPasto, roughness: 0.95 }));
  pasto.rotation.x = -Math.PI / 2;
  pasto.receiveShadow = true;
  scene.add(pasto);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(60, 56), new THREE.MeshStandardMaterial({ map: texMaicillo, roughness: 0.95 }));
  texMaicillo.repeat.set(30, 28);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.01, -12);
  plaza.receiveShadow = true;
  scene.add(plaza);
  // senderos
  for (const [x, z, w, d, r] of [[0, 30, 6, 30, 0], [-45, -8, 32, 5, 0.2], [44, -14, 30, 5, -0.15]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), plaza.material);
    s.rotation.set(-Math.PI / 2, 0, r);
    s.position.set(x, 0.012, z);
    s.receiveShadow = true;
    scene.add(s);
  }
  // laguna
  const lag = new THREE.Mesh(new THREE.CircleGeometry(1, 48), MAT.agua);
  lag.scale.set(34, 16, 1);
  lag.rotation.x = -Math.PI / 2;
  lag.position.set(-62, 0.03, -46);
  scene.add(lag);
}

// Cordillera al fondo
{
  const g = new THREE.Group();
  const roca = mat('#8c95a6', { roughness: 1, flatShading: true, fog: true });
  const nieve = mat('#f4f6f8', { roughness: 0.9, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const ang = -Math.PI / 2 + entre(-0.85, 0.85);
    const dist = entre(700, 950);
    const h = entre(120, 330);
    const r = entre(160, 320);
    const x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
    const cono = malla(new THREE.ConeGeometry(r, h, 7, 1), roca, x, h / 2 - 5, z, 0, rnd() * 6, 0, g);
    cono.castShadow = false;
    const cap = malla(new THREE.ConeGeometry(r * 0.32, h * 0.32, 7, 1), nieve, x, h - h * 0.16 - 4.5, z, 0, cono.rotation.y, 0, g);
    cap.castShadow = false;
  }
  scene.add(g);
  hornear(g);
}

// Árboles (instanciados)
{
  const pos = [];
  for (let i = 0; i < 420 && pos.length < 150; i++) {
    const x = entre(-110, 110), z = entre(-120, 70);
    if (Math.abs(x) < 34 && z > -48 && z < 40) continue;           // plaza del evento
    if (Math.hypot((x + 62) / 36, (z + 46) / 18) < 1) continue;     // laguna
    if (Math.abs(x) < 5 && z > 15) continue;                        // sendero de entrada
    pos.push([x, z]);
  }
  // una fila de árboles que da sombra al borde de la plaza
  for (let x = -28; x <= 28; x += 7) pos.push([x + entre(-1, 1), -44 + entre(-1, 1)]);
  for (let z = -40; z <= 10; z += 7) pos.push([-30 + entre(-1, 1), z], [30 + entre(-1, 1), z]);
  const n = pos.length;
  const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 8), MAT.tronco, n);
  const copaGeo = new THREE.IcosahedronGeometry(1, 2);
  const p = copaGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i));
    v.multiplyScalar(1 + 0.12 * Math.sin(v.x * 5) * Math.cos(v.z * 4 + v.y * 3));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  copaGeo.computeVertexNormals();
  const copa = new THREE.InstancedMesh(copaGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  pos.forEach(([x, z], i) => {
    const h = entre(3, 6), s = entre(2, 3.4);
    m4.compose(V(x, h / 2, z), q, V(1, h, 1));
    tronco.setMatrixAt(i, m4);
    m4.compose(V(x, h + s * 0.55, z), q.setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), V(s, s * entre(0.75, 0.95), s));
    copa.setMatrixAt(i, m4);
    copa.setColorAt(i, col.set(elegir(['#4f7036', '#5d7e3c', '#46652f', '#6b8a43', '#557a3b'])));
  });
  for (const m of [tronco, copa]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
}

// ------------------------------------------------------------ isla de mesones
const COLORES_VECINOS = ['#2f5d8a', '#3c7d5a', '#e3c34a', '#6b4c9a', '#e8e4dc', '#1f8a8a', '#d9d2c5', '#c45b7a', '#3d3f8f'];
const ZONAS = ['#7a5cc6', '#ee6fd5', '#e8662a', '#9ad15a', '#4cc2e0', '#f5d327'];

function notebook(g, x, z, rotY) {
  const nb = new THREE.Group();
  caja(0.31, 0.014, 0.22, MAT.alu, 0, 0.007, 0, 0, 0, 0, nb);
  caja(0.31, 0.21, 0.006, MAT.alu, 0, 0.11, -0.13, -0.26, 0, 0, nb);
  nb.position.set(x, H, z);
  nb.rotation.y = rotY;
  g.add(nb);
}

function isla(cx, cz, rotY, { frank = false, zona = ZONAS[0] } = {}) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.rotation.y = rotY;
  scene.add(g);
  const x0 = -LARGO / 2;
  // cubierta y cantos
  caja(LARGO, ESP, 2 * D, MAT.cubierta, 0, H - ESP / 2, 0, 0, 0, 0, g);
  for (const s of [-1, 1]) caja(LARGO + 0.04, 0.09, 0.03, MAT.pinoOsc, 0, H - 0.045, s * (D + 0.015), 0, 0, 0, g);
  for (const s of [-1, 1]) caja(0.03, 0.09, 2 * D + 0.06, MAT.pinoOsc, s * (LARGO / 2 + 0.015), H - 0.045, 0, 0, 0, 0, g);
  caja(LARGO, 0.12, 0.08, MAT.pino, 0, H - ESP - 0.06, 0, 0, 0, 0, g);
  for (let i = 0; i <= N; i++) {
    const x = x0 + i * TRAMO;
    for (const s of [-1, 1]) liston(V(x, 0, s * 0.52), V(x, H - ESP - 0.04, -s * 0.52), 0.07, MAT.pino, g);
  }
  // faldones inclinados
  for (const s of [-1, 1]) {
    const arriba = V(0, H - 0.12, s * (D - 0.06)), abajo = V(0, 0.1, s * (D - 0.26));
    const d = arriba.clone().sub(abajo);
    const f = caja(LARGO - 0.1, d.length(), 0.018, MAT.terciado, 0, 0, 0, 0, 0, 0, g);
    f.position.copy(arriba).add(abajo).multiplyScalar(0.5);
    f.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  }
  // espina
  const yTop = H + ALTO_ESPINA;
  for (let i = 0; i <= N; i++) caja(0.05, ALTO_ESPINA, ESPINA, MAT.pino, x0 + i * TRAMO, H + ALTO_ESPINA / 2, 0, 0, 0, 0, g);
  caja(LARGO, 0.06, ESPINA + 0.004, MAT.pino, 0, yTop - 0.03, 0, 0, 0, 0, g);
  caja(LARGO, 0.06, ESPINA + 0.004, MAT.pino, 0, H + 0.03, 0, 0, 0, 0, g);
  caja(0.04, ALTO_ESPINA + 0.25, 0.6, MAT.blanco, LARGO / 2 + 0.12, H + (ALTO_ESPINA + 0.25) / 2 - 0.25, 0, 0, 0, 0, g);
  // bandera de zona en la punta
  cil(0.03, 4.4, MAT.alu, -LARGO / 2 - 0.5, 2.2, 0, g, 10);
  caja(0.6, 1.6, 0.01, mat(zona, { roughness: 0.8 }), -LARGO / 2 - 0.5 + 0.32, 3.5, 0, 0, 0, 0, g);

  // placas de nombre y cosas de los vecinos
  for (const s of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const xc = x0 + (i + 0.5) * TRAMO;
      const yc = yTop - 0.1 - 0.35;
      if (frank && s === 1 && i === 3) continue;
      caja(0.5, 0.7, 0.006, MAT.rojo, xc, yc, s * 0.024, 0, 0, 0, g);
      caja(entre(0.2, 0.36), 0.06, 0.002, MAT.blanco, xc - 0.05, yc - 0.05, s * 0.028, 0, 0, 0, g);
      const color = mat(elegir(COLORES_VECINOS), { roughness: 0.6 });
      const atras = frank && s === -1;
      const t = rnd();
      if (t < 0.5 && !atras) {
        caja(0.36, 0.05, 0.09, MAT.alu, xc - s * 0.45, H + 0.025, s * 0.16, 0, 0, 0, g);
        caja(0.33, 0.8, 0.004, color, xc - s * 0.45, H + 0.45, s * 0.16, 0, 0, 0, g);
      }
      if (t > 0.3) caja(0.25, entre(0.08, 0.2), 0.18, color, xc + s * 0.4, H + 0.05, s * 0.3, 0, 0, 0, g);
      notebook(g, xc, s * 0.36, s === 1 ? 0 : Math.PI);
      caja(0.21, 0.02, 0.15, MAT.blanco, xc + s * 0.12, H + 0.01, s * 0.48, 0, 0, 0, g);
    }
  }
  return g;
}

const islas = [
  isla(0, 0, 0, { frank: true, zona: ZONAS[4] }),
  isla(0, -9, 0, { zona: ZONAS[1] }),
  isla(17, -5, Math.PI / 2, { zona: ZONAS[3] }),
  isla(-17, -5, Math.PI / 2, { zona: ZONAS[0] }),
  isla(0, -19, 0, { zona: ZONAS[5] }),
];

// ------------------------------------------------------------ escenario y carpas
{
  const g = new THREE.Group();
  g.position.set(0, 0, -36);
  scene.add(g);
  caja(16, 1.2, 8, mat('#2b2a2e', { roughness: 0.8 }), 0, 0.6, 0, 0, 0, 0, g);
  for (const x of [-8, 8]) for (const z of [-3.8, 3.8]) caja(0.35, 7.5, 0.35, MAT.alu, x, 4.95, z, 0, 0, 0, g);
  for (const z of [-3.8, 3.8]) caja(16.4, 0.4, 0.4, MAT.alu, 0, 8.7, z, 0, 0, 0, g);
  for (const x of [-8, 8]) caja(0.4, 0.4, 8, MAT.alu, x, 8.7, 0, 0, 0, 0, g);
  const pantalla = caja(10, 4.2, 0.2, new THREE.MeshStandardMaterial({ color: '#141414', emissive: '#5a2b8f', emissiveIntensity: 0.6 }), 0, 4.6, -3.6, 0, 0, 0, g);
  pantalla.castShadow = false;
  for (const x of [-6.8, 6.8]) caja(1.1, 2.2, 1, MAT.ink, x, 2.3, 3, 0, 0, 0, g);
  hornear(g);
  // carpas blancas
  const lona = mat('#f4f3ef', { roughness: 0.8, side: THREE.DoubleSide });
  for (const [x, z] of [[24, -24], [24, -30], [-24, -26], [-24, -32], [26, 6], [-26, 4]]) {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    for (const [px, pz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) cil(0.04, 2.4, MAT.alu, px, 1.2, pz, c, 8);
    const techo = malla(new THREE.ConeGeometry(2.3, 1.2, 4, 1, true), lona, 0, 3.0, 0, 0, Math.PI / 4, 0, c);
    techo.scale.set(1, 1, 1);
    caja(3, 0.9, 0.6, MAT.blanco, 0, 0.45, 1.2, 0, 0, 0, c);
    scene.add(c);
    hornear(c);
  }
}

// ------------------------------------------------------------ espacio de Frank (en la isla del medio, lado +Z)
const frank = new THREE.Group();
scene.add(frank);
{
  const Z = H;
  // placa de ETM con el nombre inscrito (aproximación)
  lamina(0.5, 0.7, MT.placa, 0, H + ALTO_ESPINA - 0.45, 0.025, 0, 0, frank);
  // pendón de mesa 33 x 80 cm
  caja(0.36, 0.055, 0.09, MAT.alu, -0.5, Z + 0.0275, 0.16, 0, 0, 0, frank);
  lamina(0.33, 0.8, MT.pendon, -0.5, Z + 0.055 + 0.4, 0.165, 0, 0, frank);
  caja(0.33, 0.8, 0.003, MAT.blanco, -0.5, Z + 0.055 + 0.4, 0.162, 0, 0, 0, frank);
  // tablet en atril
  const inc = -THREE.MathUtils.degToRad(22);
  caja(0.14, 0.008, 0.12, MAT.alu, -0.04, Z + 0.004, 0.39, 0, 0, 0, frank);
  liston(V(-0.04, Z + 0.008, 0.36), V(-0.04, Z + 0.1, 0.39), 0.02, MAT.alu, frank);
  const tab = new THREE.Group();
  tab.position.set(-0.04, Z + 0.13, 0.42);
  tab.rotation.x = inc;
  frank.add(tab);
  caja(0.2475, 0.1785, 0.0065, MAT.grafito, 0, 0, 0, 0, 0, 0, tab);
  lamina(0.236, 0.167, MT.tablet, 0, 0, 0.0036, 0, 0, tab).castShadow = false;
  // audífonos sobre el mesón
  const aud = new THREE.Group();
  aud.position.set(0.22, Z, 0.4);
  frank.add(aud);
  for (const s of [-1, 1]) {
    cil(0.042, 0.03, MAT.ink, s * 0.075, 0.015, 0, aud, 32);
    cil(0.036, 0.006, MAT.grafito, s * 0.075, 0.033, 0, aud, 32);
  }
  malla(new THREE.TorusGeometry(0.075, 0.009, 10, 40, Math.PI), MAT.ink, 0, 0.03, 0, -Math.PI / 2 + 0.25, 0, 0, aud);
  // display acrílico A5 con QR
  const qr = new THREE.Group();
  qr.position.set(0.46, Z + 0.005 + 0.112, 0.3);
  qr.rotation.x = -THREE.MathUtils.degToRad(10);
  frank.add(qr);
  lamina(0.148, 0.21, MT.qr, 0, 0, -0.001, 0, 0, qr);
  caja(0.16, 0.225, 0.005, MAT.acrilico, 0, 0, 0.002, 0, 0, 0, qr).castShadow = false;
  caja(0.16, 0.005, 0.08, MAT.acrilico, 0.46, Z + 0.0025, 0.28, 0, 0, 0, frank).castShadow = false;
  // tarjetas
  caja(0.1, 0.025, 0.045, MAT.pino, 0.6, Z + 0.0125, 0.5, 0, 0, 0, frank);
  for (let k = 0; k < 3; k++) lamina(0.09, 0.05, MT.tarjeta, 0.6, Z + 0.04, 0.5 - k * 0.004, -0.26, 0, frank);
  // planta
  cil(0.055, 0.1, MAT.maceta, 0.6, Z + 0.05, 0.14, frank);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const h = malla(new THREE.SphereGeometry(0.035, 12, 8), MAT.hoja, 0.6 + 0.03 * Math.cos(a), Z + 0.13 + rnd() * 0.05, 0.14 + 0.03 * Math.sin(a), entre(-0.4, 0.4), a, entre(-0.4, 0.4), frank);
    h.scale.set(0.5, 1.6, 1);
  }
}

// ------------------------------------------------------------ personas
const PIELES = ['#f1c7a5', '#e0ac85', '#c98e64', '#a86b45', '#8a5636', '#f5d5bb'];
const PELOS = ['#1f1611', '#3b2618', '#5a3a22', '#2a2220', '#8c6239', '#c9a26b', '#6b6b6b'];
const ROPA = ['#2f4a6b', '#e7e1d6', '#3d3d3d', '#7a8f6a', '#b5523b', '#d9c7a4', '#4a5d8c', '#8f8f93', '#ffffff', '#1f3b2c', '#9b6a8a', '#c4a23a', '#5b7da0'];
const PANTS = ['#2a3446', '#1e1e20', '#4b4f57', '#c2b49a', '#3c4f6b', '#6b5a48'];
const caminantes = [];
const quietos = [];

function persona({ alto = entre(1.58, 1.86), polera = elegir(ROPA), pantalon = elegir(PANTS), piel = elegir(PIELES), pelo = elegir(PELOS),
  pelolargo = rnd() < 0.45, credencial = true, mochila = rnd() < 0.25, espalda = null, audifonos = false, celular = false } = {}) {
  const k = alto / 1.75;
  const p = new THREE.Group();
  const mPiel = mat(piel, { roughness: 0.8 }), mRopa = mat(polera, { roughness: 0.9 }), mPant = mat(pantalon, { roughness: 0.9 }), mPelo = mat(pelo, { roughness: 0.9 });
  const piernas = [];
  for (const s of [-1, 1]) {
    const cadera = new THREE.Group();
    cadera.position.set(s * 0.09 * k, 0.9 * k, 0);
    p.add(cadera);
    malla(new THREE.CapsuleGeometry(0.068 * k, 0.72 * k, 4, 10), mPant, 0, -0.43 * k, 0, 0, 0, 0, cadera);
    const zap = malla(new THREE.BoxGeometry(0.1 * k, 0.07 * k, 0.24 * k), mat('#26221f'), 0, -0.86 * k, 0.04 * k, 0, 0, 0, cadera);
    zap.castShadow = true;
    piernas.push(cadera);
  }
  const torso = malla(new THREE.CapsuleGeometry(0.17 * k, 0.36 * k, 4, 14), mRopa, 0, 1.2 * k, 0, 0, 0, 0, p);
  torso.scale.z = 0.62;
  malla(new THREE.CylinderGeometry(0.05 * k, 0.055 * k, 0.1 * k, 10), mPiel, 0, 1.53 * k, 0, 0, 0, 0, p);
  const cabeza = new THREE.Group();
  cabeza.position.set(0, 1.66 * k, 0);
  p.add(cabeza);
  malla(new THREE.SphereGeometry(0.11 * k, 20, 14), mPiel, 0, 0, 0, 0, 0, 0, cabeza).scale.set(0.9, 1.05, 1);
  const cap = malla(new THREE.SphereGeometry(0.118 * k, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mPelo, 0, 0.012 * k, -0.012 * k, -0.25, 0, 0, cabeza);
  cap.scale.set(0.93, 1.05, 1.05);
  if (pelolargo) malla(new THREE.CapsuleGeometry(0.085 * k, 0.14 * k, 4, 10), mPelo, 0, -0.08 * k, -0.06 * k, 0, 0, 0, cabeza).scale.set(1.2, 1, 0.7);
  if (audifonos) {
    malla(new THREE.TorusGeometry(0.125 * k, 0.012, 8, 30, Math.PI), MAT.ink, 0, 0.0, 0, 0, 0, 0, cabeza);
    for (const s of [-1, 1]) malla(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), MAT.ink, s * 0.115 * k, 0, 0, 0, 0, Math.PI / 2, cabeza);
  }
  const brazos = [];
  for (const s of [-1, 1]) {
    const hombro = new THREE.Group();
    hombro.position.set(s * 0.215 * k, 1.43 * k, 0);
    p.add(hombro);
    malla(new THREE.CapsuleGeometry(0.058 * k, 0.12 * k, 4, 8), mRopa, 0, -0.07 * k, 0, 0, 0, 0, hombro);
    malla(new THREE.CapsuleGeometry(0.045 * k, 0.5 * k, 4, 8), mPiel, 0, -0.32 * k, 0, 0, 0, 0, hombro);
    brazos.push(hombro);
  }
  if (credencial) {
    caja(0.07 * k, 0.1 * k, 0.004, MAT.blanco, 0.0, 1.18 * k, 0.11 * k, 0, 0, 0, p);
    caja(0.07 * k, 0.025 * k, 0.005, mat('#4cc2e0'), 0.0, 1.215 * k, 0.112 * k, 0, 0, 0, p);
  }
  if (mochila) caja(0.26 * k, 0.36 * k, 0.13 * k, mat(elegir(['#2a2a2a', '#3f5a7a', '#7a3b2e', '#556b2f'])), 0, 1.22 * k, -0.17 * k, 0, 0, 0, p);
  if (espalda) lamina(0.26 * k, 0.16 * k, espalda, 0, 1.3 * k, -0.112 * k, 0, Math.PI, p).castShadow = false;
  if (celular) {
    brazos[1].rotation.set(-1.15, 0, -0.15);
    caja(0.075, 0.15, 0.009, MAT.grafito, 0, -0.56 * k, 0.03, -0.4, 0, 0, brazos[1]);
  }
  p.userData = { piernas, brazos, cabeza, k, fase: rnd() * 10 };
  return p;
}

function poner(p, x, z, mira) {
  p.position.set(x, 0, z);
  p.rotation.y = Math.atan2(mira[0] - x, mira[1] - z);
  scene.add(p);
  return p;
}

// En el espacio de Frank
const polera = MT.polera;
quietos.push(
  poner(persona({ alto: 1.72, polera: '#5b7da0', audifonos: true, mochila: false }), -0.12, 0.9, [-0.04, 0.3]),
  poner(persona({ alto: 1.68, polera: '#de5a24', pantalon: '#1e1e20', espalda: polera, credencial: true }), 0.78, 1.22, [-0.1, 0.9]),
  poner(persona({ alto: 1.64, polera: '#e7e1d6', celular: true, pelolargo: true }), -0.6, 1.2, [-0.5, 0.2]),
  poner(persona({ alto: 1.79, polera: '#ffffff', pantalon: '#1e1e20', espalda: polera }), 2.15, 1.25, [1.6, 1.6]),
);
quietos[1].userData.habla = true;
quietos[3].userData.habla = true;
quietos.push(poner(persona({ alto: 1.7 }), 1.6, 1.6, [2.15, 1.25]));
const cerca = quietos.slice();

// Visitantes y expositores en las otras islas y tramos vecinos
function mundo(islaG, lx, lz) {
  return V(lx, 0, lz).applyMatrix4(islaG.matrixWorld);
}
islas.forEach((g) => g.updateMatrixWorld(true));
for (const [ii, g] of islas.entries()) {
  for (const s of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      if (ii === 0 && s === 1 && i === 3) continue;
      if (rnd() < 0.45) continue;
      const lx = -LARGO / 2 + (i + 0.5) * TRAMO + entre(-0.4, 0.4);
      const a = mundo(g, lx, s * entre(0.85, 1.1));
      const mira = mundo(g, lx, s * 0.3);
      const p = poner(persona(), a.x, a.z, [mira.x, mira.z]);
      if (rnd() < 0.5) {
        const b = mundo(g, lx + entre(0.5, 0.8), s * entre(0.9, 1.2));
        const q = poner(persona(), b.x, b.z, [a.x, a.z]);
        q.userData.habla = true;
        p.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) * 0.4 + p.rotation.y * 0.6;
        quietos.push(q);
      }
      quietos.push(p);
    }
  }
}
// grupos conversando en la plaza
for (const [cx, cz] of [[6, 4.5], [-7, 3.8], [9, -14], [-9, -14.5], [3, -27], [-4, -26], [13, 6], [-12, -24]]) {
  const n = 2 + Math.floor(rnd() * 3);
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + rnd();
    const p = poner(persona(), cx + Math.cos(a) * 0.55, cz + Math.sin(a) * 0.55, [cx, cz]);
    p.userData.habla = true;
    quietos.push(p);
  }
}
// público frente al escenario
for (let j = 0; j < 46; j++) {
  const x = entre(-9, 9), z = entre(-29, -24);
  quietos.push(poner(persona({ mochila: rnd() < 0.3 }), x, z, [x * 0.3, -36]));
}

// Rutas de los que caminan
const rutas = [
  [[-8, 3.6], [8, 3.6], [8, -4.5], [-8, -4.5]],
  [[-12, 4.6], [12, 4.6], [12, -14], [-12, -14]],
  [[0, 22], [0, 5.4], [-12, 5.4], [-12, -22], [12, -22], [12, 5.4], [0, 5.4]],
  [[-8, -13.6], [8, -13.6], [8, -23.5], [-8, -23.5]],
];
for (let j = 0; j < (MOVIL ? 26 : 40); j++) {
  const ruta = rutas[j % rutas.length].map(([x, z]) => V(x + entre(-0.6, 0.6), 0, z + entre(-0.6, 0.6)));
  const segs = ruta.map((a, i) => a.distanceTo(ruta[(i + 1) % ruta.length]));
  const total = segs.reduce((a, b) => a + b, 0);
  const p = persona();
  scene.add(p);
  p.userData.ruta = { puntos: ruta, segs, total, s: rnd() * total, vel: entre(0.9, 1.35) * (rnd() < 0.5 ? 1 : -1) };
  caminantes.push(p);
}

// Lo que no se mueve se hornea; las personas cercanas al stand quedan vivas
islas.forEach((g) => hornear(g));
const vivos = [];
for (const p of quietos) {
  if (p.position.distanceTo(V(0, 0, 0.9)) < 4.5) vivos.push(p); else hornear(p, 'personas');
}
const personasHorneadas = cerrarHorno().filter((m) => m.userData.grupo === 'personas');

// ------------------------------------------------------------ cotas
const cotas = new THREE.Group();
cotas.visible = false;
scene.add(cotas);
const NARANJA = new THREE.LineBasicMaterial({ color: '#de5a24', depthTest: false, transparent: true });
function linea(pts) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), NARANJA);
  l.renderOrder = 10;
  cotas.add(l);
}
const yc = H + 0.004;
linea([V(-0.75, yc, D), V(-0.75, yc, ESPINA / 2), V(0.75, yc, ESPINA / 2), V(0.75, yc, D), V(-0.75, yc, D)]);
linea([V(-0.75, H, D + 0.12), V(0.75, H, D + 0.12)]);
linea([V(0.9, H, ESPINA / 2), V(0.9, H, D)]);
linea([V(-0.95, 0, D + 0.05), V(-0.95, H, D + 0.05)]);
linea([V(0.75, H, 0.06), V(0.75, H + ALTO_ESPINA, 0.06)]);
for (let x = -0.75; x <= 0.76; x += 1.5) linea([V(x, 0.0, D + 0.12), V(x, H + 0.05, D + 0.12)]);
const COTAS = [
  { p: V(0, H, D + 0.12), t: '1,50 m' },
  { p: V(0.9, H, D / 2 + 0.01), t: '0,60 m' },
  { p: V(-0.95, H / 2, D + 0.05), t: '1,05 m' },
  { p: V(0.75, H + ALTO_ESPINA / 2, 0.06), t: '1,60 m' },
];

// ------------------------------------------------------------ fichas
const FICHAS = [
  { p: V(-0.5, H + 0.98, 0.17), t: 'Pendón de mesa', m: '33 x 80 cm', d: 'Autosoportante, con la pregunta de las poleras y un QR. El manual no permite el pendón tradicional en los mesones, así que va uno de mesa.' },
  { p: V(-0.04, H + 0.27, 0.45), t: 'Demo en el tablet', m: 'Tablet de 11 pulgadas en atril', d: 'El visitante conversa con Rodrigo, un gerente de compras que negocia la renovación. Conviene brillo alto: es al aire libre y sin sombra.' },
  { p: V(-0.04, 1.86, 0.88), t: 'Audífonos con micrófono', m: 'Uno en uso y uno de repuesto', d: 'El manual prohíbe micrófonos y música en el espacio, así que la conversación va por audífonos y no molesta a los vecinos.' },
  { p: V(0.46, H + 0.26, 0.31), t: 'Display con QR', m: 'Acrílico A5', d: 'Lleva a tryfrank.app para probar Frank desde el teléfono. Sirve también cuando hay fila en el tablet.' },
  { p: V(0, H + ALTO_ESPINA - 0.08, 0.04), t: 'Placa de ETM', m: '50 x 70 cm aprox.', d: 'La instala la organización con el nombre inscrito en la postulación. No se puede tapar, modificar ni quitar. El diseño real lo define ETM.' },
  { p: V(0.78, 1.95, 1.22), t: 'Equipo de Frank', m: 'Polera naranja y blanca', d: 'El stand no puede quedar sin supervisión en ningún momento, o se cobra la garantía. Hay tres credenciales para turnarse.' },
  { p: V(0.62, H + 0.1, 0.5), t: 'Tarjetas y planta', m: 'Material impreso sustentable', d: 'El evento pide materiales que no dañen el medio ambiente. Nada de globos ni stickers.' },
  { p: V(0.3, H - 0.16, 0.12), t: 'Enchufe', m: '220 V, máximo 1 kW', d: 'Incluido en el tramo. Si se usa zapatilla o alargador, tiene que tener certificación SEC.' },
];

const capa = document.createElement('div');
document.body.appendChild(capa);
const etiquetas = FICHAS.map((f, i) => {
  const el = document.createElement('div');
  el.className = 'etiqueta';
  el.innerHTML = `<span class="num">${i + 1}</span><span class="txt">${f.t}</span>`;
  el.addEventListener('click', (e) => { e.stopPropagation(); abrirFicha(i); });
  capa.appendChild(el);
  return el;
});
const cotasEl = COTAS.map((c) => {
  const el = document.createElement('div');
  el.className = 'cota oculto';
  el.textContent = c.t;
  capa.appendChild(el);
  return el;
});

const ficha = document.getElementById('ficha');
let fichaAbierta = -1;
function abrirFicha(i) {
  const f = FICHAS[i];
  fichaAbierta = i;
  ficha.querySelector('h2').textContent = f.t;
  ficha.querySelector('.medida').textContent = f.m;
  ficha.querySelector('p').textContent = f.d;
  ficha.classList.add('visible');
  etiquetas.forEach((e, j) => e.classList.toggle('sel', j === i));
  const dir = camera.position.clone().sub(controls.target).normalize();
  irA(f.p.clone().add(dir.multiplyScalar(MOVIL ? 1.6 : 1.2)).setY(Math.max(f.p.y + 0.25, 1.2)), f.p.clone());
}
document.getElementById('cerrar-ficha').onclick = () => {
  ficha.classList.remove('visible');
  etiquetas.forEach((e) => e.classList.remove('sel'));
  fichaAbierta = -1;
};

// ------------------------------------------------------------ vistas
const VISTAS = {
  evento: [V(-26, 17, 30), V(0, 1, -9)],
  isla: [V(-6.2, 3.1, 8.2), V(0, 1.2, 0)],
  tres: [V(-1.45, 1.95, 2.35), V(0.05, 1.3, 0.25)],
  frontal: [V(0.1, 2.35, 2.7), V(0, 1.3, 0.2)],
  demo: [V(0.42, 1.5, 0.98), V(-0.02, 1.14, 0.4)],
};
let viaje = null;
function irA(pos, mira, dur = 1.6) {
  viaje = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: mira, t: 0, dur };
}
const botones = [...document.querySelectorAll('[data-vista]')];
function vista(nombre, dur) {
  const [p, t] = VISTAS[nombre];
  const pm = p.clone();
  if (MOVIL && nombre !== 'evento') pm.sub(t).multiplyScalar(1.35).add(t);
  irA(pm, t.clone(), dur);
  botones.forEach((b) => b.classList.toggle('activo', b.dataset.vista === nombre));
}
botones.forEach((b) => (b.onclick = () => vista(b.dataset.vista)));
controls.addEventListener('start', () => { viaje = null; botones.forEach((b) => b.classList.remove('activo')); });

const tMed = document.getElementById('t-medidas');
tMed.onclick = () => {
  cotas.visible = !cotas.visible;
  tMed.classList.toggle('on', cotas.visible);
  cotasEl.forEach((e) => e.classList.toggle('oculto', !cotas.visible));
  if (cotas.visible) { vista('frontal'); personas(false); } else personas(true);
};
const tEt = document.getElementById('t-etiquetas');
let verEtiquetas = true;
tEt.onclick = () => { verEtiquetas = !verEtiquetas; tEt.classList.toggle('on', verEtiquetas); };
const tPer = document.getElementById('t-personas');
let verPersonas = true;
function personas(v) {
  verPersonas = v;
  tPer.classList.toggle('on', v);
  for (const p of [...caminantes, ...vivos]) p.visible = v;
  for (const m of personasHorneadas) m.visible = v;
}
tPer.onclick = () => personas(!verPersonas);
const tGir = document.getElementById('t-girar');
tGir.onclick = () => { controls.autoRotate = !controls.autoRotate; tGir.classList.toggle('on', controls.autoRotate); };
const intro = document.getElementById('intro');
document.getElementById('plegar').onclick = (e) => {
  intro.classList.toggle('plegado');
  e.currentTarget.textContent = intro.classList.contains('plegado') ? '+' : '−';
};
if (MOVIL) { intro.classList.add('plegado'); document.getElementById('plegar').textContent = '+'; }

// ------------------------------------------------------------ animación
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reloj = new THREE.Clock();
const tmp = new THREE.Vector3();

function animarCaminante(p, dt, t) {
  const r = p.userData.ruta;
  r.s = (r.s + r.vel * dt + r.total) % r.total;
  let s = r.s, i = 0;
  while (s > r.segs[i]) { s -= r.segs[i]; i++; }
  const a = r.puntos[i], b = r.puntos[(i + 1) % r.puntos.length];
  p.position.lerpVectors(a, b, s / r.segs[i]);
  const dir = tmp.subVectors(b, a).multiplyScalar(Math.sign(r.vel));
  const objetivo = Math.atan2(dir.x, dir.z);
  let d = objetivo - p.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  p.rotation.y += d * Math.min(1, dt * 6);
  const u = p.userData, w = t * 6.2 * Math.abs(r.vel) + u.fase;
  u.piernas[0].rotation.x = Math.sin(w) * 0.5;
  u.piernas[1].rotation.x = -Math.sin(w) * 0.5;
  u.brazos[0].rotation.x = -Math.sin(w) * 0.4;
  u.brazos[1].rotation.x = Math.sin(w) * 0.4;
  p.position.y = Math.abs(Math.cos(w)) * 0.025;
}
function animarQuieto(p, t) {
  const u = p.userData, w = t + u.fase;
  u.cabeza.rotation.y = Math.sin(w * 0.5) * 0.25;
  u.cabeza.rotation.x = Math.sin(w * 0.7) * 0.05;
  if (u.habla) {
    u.brazos[0].rotation.x = -0.35 - Math.max(0, Math.sin(w * 1.6)) * 0.45;
    u.brazos[0].rotation.z = -0.15;
  }
}

function proyectar(v, el, maxDist) {
  tmp.copy(v).project(camera);
  const d = camera.position.distanceTo(v);
  const dentro = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05 && d < maxDist;
  el.style.visibility = dentro ? 'visible' : 'hidden';
  if (dentro) el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -50%)`;
}

function cuadro() {
  const dt = Math.min(reloj.getDelta(), 0.05), t = reloj.elapsedTime;
  if (viaje) {
    viaje.t += dt / viaje.dur;
    const k = suave(Math.min(1, viaje.t));
    camera.position.lerpVectors(viaje.p0, viaje.p1, k);
    controls.target.lerpVectors(viaje.t0, viaje.t1, k);
    if (viaje.t >= 1) viaje = null;
  }
  controls.update();
  for (const p of caminantes) animarCaminante(p, dt, t);
  for (const p of vivos) animarQuieto(p, t);
  FICHAS.forEach((f, i) => {
    if (!verEtiquetas) { etiquetas[i].style.visibility = 'hidden'; return; }
    proyectar(f.p, etiquetas[i], 14);
  });
  if (cotas.visible) COTAS.forEach((c, i) => proyectar(c.p, cotasEl[i], 12));
  renderer.render(scene, camera);
  requestAnimationFrame(cuadro);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Arranque: vista del evento y viaje al stand
camera.position.copy(VISTAS.evento[0]);
controls.target.copy(VISTAS.evento[1]);
Promise.all(pendientes).then(() => {
  document.getElementById('carga').classList.add('fuera');
  setTimeout(() => vista('tres', 3.2), 500);
});
cuadro();
