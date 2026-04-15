/* ═══════════════════════════════════════════════════════
   three-bg.js  —  Full 3D animated background
   Floating particles · DNA helix · Torus rings · Icosahedra
   Mouse parallax · Scroll reactive
═══════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('canvas3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 28);

  /* ── MOUSE / SCROLL ── */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollY = 0;
  document.addEventListener('mousemove', e => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

  /* ── COLOURS ── */
  const C = {
    red:  new THREE.Color(0xff0033),
    red2: new THREE.Color(0xff4455),
    gold: new THREE.Color(0xffcc00),
    cyan: new THREE.Color(0x00eeff),
    blue: new THREE.Color(0x3b82f6),
    dim:  new THREE.Color(0x220011),
  };

  /* ═══ 1. PARTICLE FIELD ════════════════════════════ */
  const PART_COUNT = 1800;
  const positions = new Float32Array(PART_COUNT * 3);
  const colors    = new Float32Array(PART_COUNT * 3);
  const pSizes    = new Float32Array(PART_COUNT);
  const palette   = [C.red, C.gold, C.cyan, C.blue, C.red2];

  for (let i = 0; i < PART_COUNT; i++) {
    const r = 18 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);
    const col = palette[Math.floor(Math.random() * palette.length)];
    colors[i*3]   = col.r; colors[i*3+1] = col.g; colors[i*3+2] = col.b;
    pSizes[i] = 0.5 + Math.random() * 2.5;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  pGeo.setAttribute('size',     new THREE.BufferAttribute(pSizes, 1));

  const pMat = new THREE.PointsMaterial({
    size: 0.18, vertexColors: true, transparent: true,
    opacity: 0.75, sizeAttenuation: true, depthWrite: false,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* ═══ 2. FLOATING TORUS RINGS ═══════════════════════ */
  const rings = [];
  const ringData = [
    { r: 8,  tube: 0.06, col: C.red,  x: -10, y:  3, z: -5,  rx: 0.4, ry: 0.2, speed: 0.004 },
    { r: 6,  tube: 0.05, col: C.cyan, x:  12, y: -2, z: -8,  rx: 0.8, ry: 0.5, speed: 0.006 },
    { r: 10, tube: 0.04, col: C.gold, x:  0,  y:  8, z:-12,  rx: 1.2, ry: 0.3, speed: 0.003 },
    { r: 5,  tube: 0.07, col: C.blue, x: -14, y: -6, z: -4,  rx: 0.2, ry: 0.9, speed: 0.007 },
    { r: 7,  tube: 0.045,col: C.red2, x:  8,  y:  6, z:-10,  rx: 0.6, ry: 0.7, speed: 0.005 },
  ];
  ringData.forEach(d => {
    const g = new THREE.TorusGeometry(d.r, d.tube, 16, 100);
    const m = new THREE.MeshBasicMaterial({ color: d.col, transparent: true, opacity: 0.45, wireframe: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(d.x, d.y, d.z);
    mesh.rotation.set(d.rx, d.ry, 0);
    mesh.userData = { speed: d.speed };
    scene.add(mesh);
    rings.push(mesh);
  });

  /* ═══ 3. WIREFRAME ICOSAHEDRA ════════════════════════ */
  const icos = [];
  const icoData = [
    { s: 2.2, x: -12, y: -4, z: 0,  col: C.red,  sp: 0.008 },
    { s: 1.5, x:  14, y:  5, z: -3, col: C.cyan, sp: 0.011 },
    { s: 1.8, x:   2, y:-10, z: 2,  col: C.gold, sp: 0.007 },
    { s: 1.2, x: -6,  y:  9, z:-2,  col: C.blue, sp: 0.013 },
    { s: 2.5, x:  10, y: -8, z: -6, col: C.red2, sp: 0.006 },
  ];
  icoData.forEach(d => {
    const g = new THREE.IcosahedronGeometry(d.s, 1);
    const m = new THREE.MeshBasicMaterial({ color: d.col, wireframe: true, transparent: true, opacity: 0.3 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(d.x, d.y, d.z);
    mesh.userData = { sp: d.sp, ox: d.x, oy: d.y };
    scene.add(mesh);
    icos.push(mesh);
  });

  /* ═══ 4. DNA HELIX ═══════════════════════════════════ */
  const dnaGroup = new THREE.Group();
  const HELIX_POINTS = 200;
  const strandA = [], strandB = [];

  for (let i = 0; i < HELIX_POINTS; i++) {
    const t = (i / HELIX_POINTS) * Math.PI * 8;
    const y = (i / HELIX_POINTS) * 40 - 20;
    const r = 2.2;
    strandA.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
    strandB.push(new THREE.Vector3(Math.cos(t + Math.PI) * r, y, Math.sin(t + Math.PI) * r));
  }

  const makeStrand = (pts, col) => {
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5 });
    return new THREE.Line(geo, mat);
  };
  dnaGroup.add(makeStrand(strandA, C.red));
  dnaGroup.add(makeStrand(strandB, C.cyan));

  // Rungs
  for (let i = 0; i < HELIX_POINTS; i += 8) {
    const rg = new THREE.BufferGeometry().setFromPoints([strandA[i], strandB[i]]);
    const rm = new THREE.LineBasicMaterial({ color: C.gold, transparent: true, opacity: 0.25 });
    dnaGroup.add(new THREE.Line(rg, rm));
  }

  dnaGroup.position.set(18, 0, -8);
  dnaGroup.rotation.z = 0.15;
  scene.add(dnaGroup);

  /* ═══ 5. GRID PLANE ══════════════════════════════════ */
  const gridHelper = new THREE.GridHelper(80, 40, 0x220011, 0x110008);
  gridHelper.position.y = -18;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.35;
  scene.add(gridHelper);

  /* ═══ 6. CENTRAL GLOW SPHERE ════════════════════════ */
  const sphereGeo = new THREE.SphereGeometry(3.5, 32, 32);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: C.red, wireframe: true, transparent: true, opacity: 0.06,
  });
  const centerSphere = new THREE.Mesh(sphereGeo, sphereMat);
  centerSphere.position.set(0, 0, -2);
  scene.add(centerSphere);

  /* ═══ 7. FLOATING OCTAHEDRA ══════════════════════════ */
  const octs = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.OctahedronGeometry(0.3 + Math.random() * 0.5);
    const cols = [C.red, C.gold, C.cyan, C.blue];
    const m = new THREE.MeshBasicMaterial({
      color: cols[i % cols.length], wireframe: true,
      transparent: true, opacity: 0.4,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(
      (Math.random() - 0.5) * 35,
      (Math.random() - 0.5) * 25,
      (Math.random() - 0.5) * 10 - 3
    );
    mesh.userData = {
      rx: (Math.random() - 0.5) * 0.02,
      ry: (Math.random() - 0.5) * 0.02,
      floatSpeed: 0.5 + Math.random() * 0.5,
      floatAmp:   0.3 + Math.random() * 0.5,
      origY: mesh.position.y,
    };
    scene.add(mesh);
    octs.push(mesh);
  }

  /* ═══ RESIZE ═════════════════════════════════════════ */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ═══ ANIMATE ════════════════════════════════════════ */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse follow
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    // Camera parallax from mouse + scroll
    camera.position.x += (mouse.x * 3 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 2 - scrollY * 0.008 - camera.position.y) * 0.04;
    camera.lookAt(0, -scrollY * 0.008, 0);

    // Particle field slow rotation
    particles.rotation.y = t * 0.025;
    particles.rotation.x = t * 0.012;

    // Rings rotate individually
    rings.forEach((r, i) => {
      r.rotation.x += r.userData.speed;
      r.rotation.y += r.userData.speed * 0.7;
      r.rotation.z += r.userData.speed * 0.4;
    });

    // Icosahedra spin + float
    icos.forEach((ico, i) => {
      ico.rotation.x += ico.userData.sp;
      ico.rotation.y += ico.userData.sp * 1.3;
      ico.position.y = ico.userData.oy + Math.sin(t * 0.6 + i) * 1.2;
      ico.position.x = ico.userData.ox + Math.cos(t * 0.4 + i) * 0.5;
    });

    // DNA helix rotate
    dnaGroup.rotation.y = t * 0.12;
    dnaGroup.position.y = Math.sin(t * 0.3) * 2;

    // Center sphere
    centerSphere.rotation.x = t * 0.1;
    centerSphere.rotation.y = t * 0.15;

    // Octahedra float
    octs.forEach((o, i) => {
      o.rotation.x += o.userData.rx;
      o.rotation.y += o.userData.ry;
      o.position.y = o.userData.origY + Math.sin(t * o.userData.floatSpeed + i) * o.userData.floatAmp;
    });

    // Grid ripple
    gridHelper.position.y = -18 + Math.sin(t * 0.3) * 0.5;

    renderer.render(scene, camera);
  }
  animate();
})();
