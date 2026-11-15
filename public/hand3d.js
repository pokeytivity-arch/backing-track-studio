/* 3D hands for scale practice. A rigged hand model (MIT, from the WebXR input profiles) is drawn with three.js in a transparent canvas laid over
   the keyboard. hands.js still decides everything about the playing (hand positions, which finger plays, thumb under, crossing over, pause);
   this file only turns those fingertip targets into a real hand: every finger bends at its three joints to reach its key, the thumb swings
   under the palm, the wrist turns, and the hands cast soft shadows on the keys.
   Screen space = the hands overlay in CSS px (x right, y down). World: X = screen x, Z = screen y, Y = height above the white keys (px). */
import * as THREE from './vendor/three/three.module.min.js';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';

const FINGERS = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
const KEY_MM = 23.5;                     /* a white key is 23.5 mm wide */
let renderer, scene, cam, canvas, wrap, plane, key, ready = false, failed = false, G = { W: 600, H: 200, kw: 20, KH: 120, HP: 36 };
const hands = {};                        /* rh / lh: { root, arm, bones, rest, chains, anchor, mat } */
let skinCol = '#c8916f';

function mkRenderer() {
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;display:block';
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  cam = new THREE.OrthographicCamera(0, 100, 0, -100, 1, 6000); cam.up.set(0, 0, -1); cam.position.set(0, 3000, 0); cam.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x554a44, 2.2));
  key = new THREE.DirectionalLight(0xffffff, 1.3); key.castShadow = true; key.shadow.mapSize.set(1024, 512); key.shadow.radius = 6; key.shadow.bias = -0.0008;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xffe2d0, 0.6); fill.position.set(1, 0.6, 1); scene.add(fill);
  plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.38 })); plane.rotation.x = -Math.PI / 2; plane.receiveShadow = true; plane.material.depthWrite = false; plane.renderOrder = -1; scene.add(plane);
}

const TONEM = [[1.1, 1.13, 1.16], [1, 1, 1], [.84, .74, .64], [.6, .47, .38], [.4, .3, .24]];
let SKIN = null, tone = 1;
function skinMaterial() {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(1, 1, 1), roughness: 0.62, metalness: 0, transparent: true, alphaTest: 0.02, depthWrite: true, side: THREE.DoubleSide });
}
/* wrap the licensed photo onto the model: every bone maps its stretch of the model, seen from above, onto the same stretch of the photographed hand
   (finger joints split along each photographed finger in the model's own proportions); each vertex blends the maps of the bones that move it */
function photoUV(root, bones, rest, sk, n, fwd, lat, mat, side) {
  const q2 = v => [v.dot(lat), v.dot(fwd)], ph = p => [p[0], -p[1]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const seg = (P, Q, P2, Q2) => { const k = cdiv([Q2[0] - P2[0], Q2[1] - P2[1]], [Q[0] - P[0], Q[1] - P[1]]); const t = [P2[0] - cmul(k, P)[0], P2[1] - cmul(k, P)[1]]; return v => { const r = cmul(k, v); return [r[0] + t[0], r[1] + t[1]]; }; };
  /* palm: least-squares similarity from the knuckles and the thumb's base */
  const FN = ['index', 'middle', 'ring', 'pinky'], FM = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
  const src = FM.map(f => q2(rest[f + '-phalanx-proximal'].p)).concat([q2(rest['thumb-phalanx-proximal'].p)]);
  const dst = FN.map(f => ph(sk.F[f][0])).concat([ph(sk.TH[0])]);
  const mean = a => a.reduce((s, p) => [s[0] + p[0] / a.length, s[1] + p[1] / a.length], [0, 0]); const ms = mean(src), md = mean(dst);
  let num = [0, 0], den = 0; src.forEach((p, i) => { const a = [p[0] - ms[0], p[1] - ms[1]], b = [dst[i][0] - md[0], dst[i][1] - md[1]]; num = [num[0] + a[0] * b[0] + a[1] * b[1], num[1] + a[0] * b[1] - a[1] * b[0]]; den += a[0] * a[0] + a[1] * a[1]; });
  const kp = [num[0] / den, num[1] / den], palm = v => { const r = cmul(kp, [v[0] - ms[0], v[1] - ms[1]]); return [r[0] + md[0], r[1] + md[1]]; };
  const map = {}; Object.keys(bones).forEach(b => map[b] = palm);
  const chain = (names, B, T) => { const J = names.map(nm => rest[nm].p), L = [J[1].distanceTo(J[0]), J[2].distanceTo(J[1]), J[3].distanceTo(J[2])], tot = L[0] + L[1] + L[2];
    const at = f => [B[0] + (T[0] - B[0]) * f, B[1] + (T[1] - B[1]) * f]; const pp = [B, at(L[0] / tot), at((L[0] + L[1]) / tot), T];
    for (let i = 0; i < 3; i++) map[names[i]] = seg(q2(J[i]), q2(J[i + 1]), pp[i], pp[i + 1]); map[names[3]] = map[names[2]]; };
  FM.forEach((f, i) => chain([f + '-phalanx-proximal', f + '-phalanx-intermediate', f + '-phalanx-distal', f + '-tip'], ph(sk.F[FN[i]][0]), ph(sk.F[FN[i]][1])));
  { const J = ['thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'].map(nm => rest[nm].p), L0 = J[1].distanceTo(J[0]), L1 = J[2].distanceTo(J[1]);
    const B = ph(sk.TH[0]), T = ph(sk.TH[1]), M = [B[0] + (T[0] - B[0]) * L0 / (L0 + L1), B[1] + (T[1] - B[1]) * L0 / (L0 + L1)];
    map['thumb-phalanx-proximal'] = seg(q2(J[0]), q2(J[1]), B, M); map['thumb-phalanx-distal'] = map['thumb-tip'] = seg(q2(J[1]), q2(J[2]), M, T); }
  map['thumb-metacarpal'] = seg(q2(rest['thumb-metacarpal'].p), q2(rest['thumb-phalanx-proximal'].p), palm(q2(rest['thumb-metacarpal'].p)), ph(sk.TH[0]));
  root.traverse(o => { if (!o.isSkinnedMesh) return; const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, N = pos.count, uv = new Float32Array(N * 2), v = new THREE.Vector3();
    for (let i = 0; i < N; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); const p = q2(v); let x = 0, y = 0, ws = 0;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (!w) continue; const bn = o.skeleton.bones[si.getComponent(i, k)].name, f = map[bn] || palm, r = f(p); x += r[0] * w; y += r[1] * w; ws += w; }
      x /= ws || 1; y /= ws || 1; uv[i * 2] = x / sk.w; uv[i * 2 + 1] = 1 + y / sk.h; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); });
  const tx = new THREE.TextureLoader().load('hands3d/' + side + '_skin.webp?v=3', () => window.dispatchEvent(new Event('ps3d-tex'))); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  mat.map = tx; mat.needsUpdate = true;
  /* shadows follow the photo's outline, not the bare model */
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tx, alphaTest: 0.5 });
  root.traverse(o => { if (o.isMesh) o.customDepthMaterial = dm; });
}

/* bones in the model are all children of the armature; put them in a proper chain so a bent joint carries the joints beyond it */
function rig(gl, side) {
  const root = gl.scene, bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  root.updateMatrixWorld(true);
  const wrist = bones['wrist'];
  FINGERS.forEach(f => {
    const names = f === 'thumb' ? ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip']
      : [f + '-metacarpal', f + '-phalanx-proximal', f + '-phalanx-intermediate', f + '-phalanx-distal', f + '-tip'];
    let parent = wrist; names.forEach(n => { parent.attach(bones[n]); parent = bones[n]; });
  });
  root.updateMatrixWorld(true);
  /* rest pose in the gltf root's space */
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), rest = {};
  Object.values(bones).forEach(b => { const m = new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); m.decompose(p, q, s); rest[b.name] = { p, q }; });
  const mat = skinMaterial();
  root.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.geometry) o.geometry.computeVertexNormals(); } });
  /* hand frame in model space: n = back of the hand, fwd = towards the fingertips, lat = from thumb side to little finger */
  const P = n => rest[n].p;
  const mcp = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'].map(f => P(f + '-phalanx-proximal'));
  const tipC = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'].map(f => P(f + '-tip')).reduce((a, b) => a.clone().add(b)).multiplyScalar(.25);
  const mcpC = mcp.reduce((a, b) => a.clone().add(b)).multiplyScalar(.25);
  const fwd = tipC.clone().sub(mcpC).normalize();
  let lat = P('pinky-finger-phalanx-proximal').clone().sub(P('index-finger-phalanx-proximal')); lat.sub(fwd.clone().multiplyScalar(lat.dot(fwd))).normalize();
  let n = new THREE.Vector3().crossVectors(fwd, lat).normalize();
  /* the back of the hand is the side away from the thumb's bend; check against the palm side using the thumb tip, which sits below the palm */
  const thumbSide = P('thumb-tip').clone().sub(mcpC); if (thumbSide.dot(n) > 0) n.negate();
  if (SKIN && SKIN[side]) photoUV(root, bones, rest, SKIN[side], n, fwd, lat, mat, side);
  const anchor = P('middle-finger-phalanx-proximal').clone().add(P('ring-finger-phalanx-proximal')).multiplyScalar(.5);
  return { root, bones, rest, mat, n, fwd, lat, anchor };
}

/* solve one finger in its own plane: yaw at the knuckle, then MCP / PIP / DIP flexion (DIP follows PIP) so the tip lands on the target */
function solve2(L1, L2, L3, d, v, prev) {
  const f = (a1, a2) => { const a3 = a2 * .7, A1 = a1, A2 = a1 + a2, A3 = A2 + a3;
    return [L1 * Math.cos(A1) + L2 * Math.cos(A2) + L3 * Math.cos(A3), -(L1 * Math.sin(A1) + L2 * Math.sin(A2) + L3 * Math.sin(A3))]; };
  const err = (a1, a2) => { const [x, y] = f(a1, a2); return (x - d) ** 2 + (y - v) ** 2 + .002 * (a1 * a1 + a2 * a2) * (L1 * L1); };
  let best = prev ? prev.slice() : [.3, .6], be = err(best[0], best[1]);
  for (let a1 = -.35; a1 <= 1.3; a1 += .15) for (let a2 = 0; a2 <= 1.7; a2 += .15) { const e = err(a1, a2); if (e < be) { be = e; best = [a1, a2]; } }
  let st = .08; for (let it = 0; it < 14; it++) { let imp = false;
    for (const [da, db] of [[st, 0], [-st, 0], [0, st], [0, -st]]) { const a = best[0] + da, b = Math.max(0, Math.min(1.8, best[1] + db)); const e = err(a, b); if (e < be) { be = e; best = [a, b]; imp = true; } }
    if (!imp) st *= .5; }
  return best;
}

const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3();
function setChainWorld(h, names, quats) {
  /* quats: desired rotations of each bone in the gltf root's space; convert to local, parent first */
  let parentQ = h.rest['wrist'].q.clone();
  names.forEach((nm, i) => { const b = h.bones[nm]; const q = quats[i]; b.quaternion.copy(parentQ.clone().invert().multiply(q)); parentQ = q; });
}

function poseHand(h, d, s) {
  const { rest, n, fwd, lat } = h, dir = d.side === 'rh' ? 1 : -1;
  /* place the whole hand: model (n, fwd, lat) -> world (up, screen-up rotated by the wrist turn, screen right for the right hand) */
  const th = d.th || 0, up = new THREE.Vector3(0, 1, 0), fw = new THREE.Vector3(Math.sin(th), 0, -Math.cos(th)), rt = new THREE.Vector3().crossVectors(fw, up).normalize();
  const latW = d.side === 'rh' ? rt.clone() : rt.clone().negate();
  const Mm = new THREE.Matrix4().makeBasis(lat, fwd, n), Mw = new THREE.Matrix4().makeBasis(latW, fw, up);
  const R = new THREE.Matrix4().multiplyMatrices(Mw, Mm.clone().transpose()); const Rq = new THREE.Quaternion().setFromRotationMatrix(R);
  h.root.quaternion.copy(Rq); h.root.scale.setScalar(s);
  const a = h.anchor.clone().applyQuaternion(Rq).multiplyScalar(s);
  h.root.position.set(d.ax - a.x, d.ay - a.y, d.az - a.z);
  h.root.updateMatrixWorld(true);
  const toLocal = p => h.root.worldToLocal(p.clone());

  /* fingers 2-5 */
  ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'].forEach((f, k) => {
    const i = k + 1, names = [f + '-phalanx-proximal', f + '-phalanx-intermediate', f + '-phalanx-distal'];
    const P0 = rest[names[0]].p, P1 = rest[names[1]].p, P2 = rest[names[2]].p, P3 = rest[f + '-tip'].p;
    const L1 = P1.distanceTo(P0), L2 = P2.distanceTo(P1), L3 = P3.distanceTo(P2);
    const T = toLocal(new THREE.Vector3(d.tips[i][0], d.tips[i][2], d.tips[i][1]));
    const rel = T.clone().sub(P0), v = rel.dot(n), hz = rel.clone().sub(n.clone().multiplyScalar(v));
    const f0 = P3.clone().sub(P0); f0.sub(n.clone().multiplyScalar(f0.dot(n))); f0.normalize();
    let yaw = Math.atan2(new THREE.Vector3().crossVectors(f0, hz).dot(n), f0.dot(hz)); yaw = Math.max(-.4, Math.min(.4, yaw));
    const dist = hz.length() * Math.cos(Math.abs(yaw) > .39 ? 0 : 0);
    h.sol[i] = solve2(L1, L2, L3, dist, v, h.sol[i]);
    const [a1, a2] = h.sol[i], a3 = a2 * .7;
    const qy = tmpQ.clone().setFromAxisAngle(n, yaw), axis = new THREE.Vector3().crossVectors(n, f0).normalize().negate();
    /* positive flexion bends the finger towards the palm (away from the back of the hand) */
    const fl = ang => qy.clone().multiply(new THREE.Quaternion().setFromAxisAngle(axis, ang));
    const rest0 = f0.clone(); void rest0;
    const quats = [fl(a1).multiply(rest[names[0]].q), fl(a1 + a2).multiply(rest[names[1]].q), fl(a1 + a2 + a3).multiply(rest[names[2]].q)];
    setChainWorld(h, [f + '-metacarpal'].concat(names), [rest[f + '-metacarpal'].q.clone()].concat(quats));
  });

  /* thumb: cyclic coordinate descent over its three joints, in the root's space */
  { const names = ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal'];
    const T = toLocal(new THREE.Vector3(d.tips[0][0], d.tips[0][2], d.tips[0][1]));
    const Q = names.map(nm => rest[nm].q.clone()), P = names.map(nm => rest[nm].p.clone()), tipR = rest['thumb-tip'].p.clone();
    /* forward kinematics from the rest offsets */
    const offs = [P[1].clone().sub(P[0]), P[2].clone().sub(P[1]), tipR.clone().sub(P[2])].map((o, j) => o.applyQuaternion(rest[names[j]].q.clone().invert()));
    const fk = () => { const pts = [P[0].clone()]; for (let j = 0; j < 3; j++) pts.push(pts[j].clone().add(offs[j].clone().applyQuaternion(Q[j]))); return pts; };
    if (h.tq) for (let j = 0; j < 3; j++) Q[j].copy(h.tq[j]);
    const lim = [1.4, 1.5, 1.4];
    for (let it = 0; it < 10; it++) for (let j = 2; j >= 0; j--) {
      const pts = fk(), e = pts[3].clone().sub(pts[j]).normalize(), t = T.clone().sub(pts[j]).normalize();
      const r = new THREE.Quaternion().setFromUnitVectors(e, t); const ang = 2 * Math.acos(Math.min(1, Math.abs(r.w)));
      if (ang > .25) r.slerp(new THREE.Quaternion(), 1 - .25 / ang);
      for (let k = j; k < 3; k++) Q[k].premultiply(r);
      /* keep each joint within reach of its rest angle */
      for (let k = 0; k < 3; k++) { const dq = Q[k].clone().multiply(rest[names[k]].q.clone().invert()); const a2 = 2 * Math.acos(Math.min(1, Math.abs(dq.w))); if (a2 > lim[k]) { dq.slerp(new THREE.Quaternion(), 1 - lim[k] / a2); Q[k].copy(dq.multiply(rest[names[k]].q)); } }
    }
    h.tq = Q.map(q => q.clone());
    setChainWorld(h, names, Q);
    h.root.updateMatrixWorld(true); const tw = new THREE.Vector3(); h.bones['thumb-tip'].getWorldPosition(tw); const mw = new THREE.Vector3(); h.bones['thumb-metacarpal'].getWorldPosition(mw); const fk3=fk()[3]; h.dbg = { target: d.tips[0], tip: tw.toArray().map(v => +v.toFixed(1)), base: mw.toArray().map(v => +v.toFixed(1)), fkLocal: fk3.toArray(), Tl: T.toArray() };
  }

  /* forearm: from the wrist back off the bottom of the screen */
  { const w = rest['wrist'].p.clone(); h.root.localToWorld(w);
    const back = fw.clone().negate(), len = s * .32, r0 = s * .029;
    h.arm.position.copy(w.clone().add(back.clone().multiplyScalar(len / 2 - s * .01)).add(new THREE.Vector3(0, -s * .004, 0)));
    h.arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), back); h.arm.scale.set(r0, len, r0 * .85); }
}

function addArm(mat) {
  const g = new THREE.CylinderGeometry(1.05, 1.0, 1, 40, 1, true); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.visible = false; m.userData.off = true; scene.add(m); return m;
}

let loading = null;
export function init(wrapEl) {
  if (!SKIN && !loading) { loading = fetch('hands3d/skin.json?v=1').then(r => r.json()).then(j => { SKIN = j; loading = null; return init(wrapEl); }); return loading; }
  if (loading) { if (canvas && wrapEl && canvas.parentNode !== wrapEl) wrapEl.appendChild(canvas); return loading; }
  wrap = wrapEl;
  loading = new Promise((res, rej) => {
    try { mkRenderer(); } catch (e) { failed = true; rej(e); return; }
    wrap.appendChild(canvas);
    const ld = new GLTFLoader(); let n = 0;
    [['rh', 'hands3d/right.glb?v=1'], ['lh', 'hands3d/left.glb?v=1']].forEach(([side, url]) => ld.load(url, gl => {
      const h = rig(gl, side); h.side = side; h.sol = []; scene.add(h.root); h.armMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(SKIN[side].arm), roughness: .65 }); h.arm = addArm(h.armMat); hands[side] = h;
      if (++n === 2) { ready = true; res(); }
    }, undefined, e => { failed = true; rej(e); }));
  });
  return loading;
}
export const isReady = () => ready, isFailed = () => failed;

export function resize(g) {
  G = g; if (!renderer) return;
  const H = Math.round(g.HP + g.KH + g.kw * 7); canvas.style.width = g.W + 'px'; canvas.style.height = H + 'px'; renderer.setSize(g.W, H, false);
  cam.left = 0; cam.right = g.W; cam.top = 0; cam.bottom = -H; cam.updateProjectionMatrix();
  plane.scale.set(g.W * 1.2, H * 1.2, 1); plane.position.set(g.W / 2, 0, H / 2);
  key.position.set(g.W * .35, g.kw * 30, -g.kw * 6); key.target.position.set(g.W / 2, 0, H / 2);
  const sc = key.shadow.camera; sc.left = -g.W * .7; sc.right = g.W * .7; sc.top = H; sc.bottom = -H; sc.near = 1; sc.far = g.kw * 80; sc.updateProjectionMatrix();
}

export function setSkin(i) { tone = i; const m = TONEM[i] || TONEM[1]; Object.values(hands).forEach(h => { h.mat.color.setRGB(m[0], m[1], m[2]); h.armMat.color.set(SKIN[h.side].arm).multiply(new THREE.Color(m[0], m[1], m[2])); }); }
export function show(b) { if (canvas) canvas.style.display = b ? 'block' : 'none'; }

/* d: { side, on, ax, ay, az (knuckle anchor), th (wrist turn), tips: [[x, y, height] x5] } in screen px */
export function pose(d) {
  const h = hands[d.side]; if (!h) return;
  h.root.visible = !!d.on; h.arm.visible = false; if (!d.on) return;
  h.lastD = { f: d.f, az: Math.round(d.az), az3: d.az3, ax: d.ax, tips: d.tips.map(t => t.map(v => Math.round(v))) }; poseHand(h, d, G.kw / (KEY_MM / 1000));
}
export function dbg() { return { rh: hands.rh && hands.rh.dbg, d: hands.rh && hands.rh.lastD, frames: nR }; }
let nR = 0;
export function render() { nR++; if (ready && canvas.style.display !== 'none') renderer.render(scene, cam); }
export function _plain() { Object.values(hands).forEach(h => { h.mat.map = null; h.mat.color.set('#d09070'); h.mat.needsUpdate = true; }); }
