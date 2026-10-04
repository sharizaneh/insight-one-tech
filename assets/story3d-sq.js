/* Insight One Tech — scroll-driven 3D story (generic manufacturing line).
   A. A six-station production line runs: robots work, stack lights glow, parts queue in front of the constraint.
   B. Every station streams data upward.
   C. Stations rise into columns whose height is their load (% of available hours).
   D. Camera lifts to a planning view; a capacity plane appears and the overloaded station pulses.
   Rendering: soft shadows, room-environment reflections, HDR bloom (when the post-processing scripts load).
   All values are illustrative. */
(function () {
  var story = document.querySelector('.iot .story3');
  var cv = document.getElementById('gl');
  if (!story || !cv || !story.classList.contains('gl-on')) return;
  if (!window.THREE) { story.classList.remove('gl-on'); return; }

  var T = THREE, renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { story.classList.remove('gl-on'); return; }
  var mobile = Math.min(innerWidth, innerHeight) < 700;
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); story.classList.remove('gl-on'); story.style.height = ''; }, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  function C(hex) { return new T.Color(hex).convertSRGBToLinear(); }
  var BG = C(0x07090b);
  var scene = new T.Scene();
  scene.background = BG;
  scene.fog = new T.Fog(BG, 18, 42);
  var cam = new T.PerspectiveCamera(34, 1, 0.1, 120);

  // Environment reflections (studio room) for believable metal
  if (T.RoomEnvironment) {
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture;
  }

  scene.add(new T.HemisphereLight(C(0x9fdcff), C(0x0a0c0e), 0.35));
  var key = new T.DirectionalLight(C(0xffffff), 2.2);
  key.position.set(7, 13, 9); key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  var sc = key.shadow.camera; sc.left = -13; sc.right = 13; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 40;
  key.shadow.radius = 4; key.shadow.bias = -0.0005;
  scene.add(key);
  var fill = new T.DirectionalLight(C(0x6fb6ff), 0.5); fill.position.set(-9, 5, 6); scene.add(fill);
  var rim = new T.PointLight(C(0x3bb7d6), 6, 30); rim.position.set(-7, 5, -6); scene.add(rim);

  var grid = new T.GridHelper(60, 60, C(0x1e5363), C(0x10242b));
  grid.material.transparent = true; grid.material.opacity = 0.45; grid.position.y = 0.002; scene.add(grid);
  var slab = new T.Mesh(new T.PlaneGeometry(60, 60), new T.MeshStandardMaterial({ color: C(0x0b0e11), metalness: 0.3, roughness: 0.62, envMapIntensity: 0.4 }));
  slab.rotation.x = -Math.PI / 2; slab.receiveShadow = true; scene.add(slab);

  // ---------- Line ----------
  var names = ['RECEIVING', 'MACHINING', 'ASSEMBLY', 'INSPECTION', 'FINISHING', 'PACKING'];
  var load = [64, 72, 112, 86, 52, 38];   // % of available hours (illustrative)
  var N = 6, SPACING = 2.3, UNIT = 0.05, MH = 1.25, BOT = 2;
  function sx(i) { return (i - (N - 1) / 2) * SPACING; }

  var graphite = C(0x2b343a), cyan = C(0x168fb0), orange = C(0xe8601a);
  var bodyGeo = new T.BoxGeometry(1.45, 1, 1.5); bodyGeo.translate(0, 0.5, 0);
  var plinthGeo = new T.BoxGeometry(1.6, 0.12, 1.65);
  var stripGeo = new T.BoxGeometry(1.2, 0.04, 0.05);
  var poleGeo = new T.CylinderGeometry(0.025, 0.025, 0.5, 8);
  var lampGeo = new T.CylinderGeometry(0.07, 0.07, 0.11, 16);

  // Control-panel screen texture (abstract bars, no readable numbers)
  var scr = document.createElement('canvas'); scr.width = 128; scr.height = 80;
  var g2 = scr.getContext('2d'); g2.fillStyle = '#04141a'; g2.fillRect(0, 0, 128, 80);
  g2.fillStyle = '#5cc8e3'; [28, 44, 36, 58, 50, 66].forEach(function (h, k) { g2.fillRect(12 + k * 18, 70 - h, 11, h); });
  g2.strokeStyle = '#9fe3f2'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(8, 30); g2.lineTo(40, 22); g2.lineTo(70, 27); g2.lineTo(120, 12); g2.stroke();
  var scrTex = new T.CanvasTexture(scr); scrTex.encoding = T.sRGBEncoding;
  var scrGeo = new T.PlaneGeometry(0.46, 0.29);

  var labelsEl = document.getElementById('labels');
  var st = [];
  var lampCols = [C(0x2bd67b), C(0xffb020), C(0xff3b30)];
  for (var i = 0; i < N; i++) {
    var x = sx(i);
    var mat = new T.MeshStandardMaterial({ color: graphite.clone(), metalness: 0.6, roughness: 0.32, emissive: new T.Color(0), envMapIntensity: 1 });
    var body = new T.Mesh(bodyGeo, mat); body.position.set(x, 0.12, 0); body.castShadow = body.receiveShadow = true; scene.add(body);
    var plinth = new T.Mesh(plinthGeo, new T.MeshStandardMaterial({ color: C(0x14191d), metalness: 0.5, roughness: 0.5, transparent: true }));
    plinth.position.set(x, 0.06, 0); plinth.receiveShadow = true; scene.add(plinth);
    var strip = new T.Mesh(stripGeo, new T.MeshBasicMaterial({ color: C(0x5cc8e3), transparent: true }));
    scene.add(strip);
    var screen = new T.Mesh(scrGeo, new T.MeshBasicMaterial({ map: scrTex, transparent: true }));
    screen.position.set(x + 0.35, 0.12 + MH * 0.5, 0.756); scene.add(screen);
    // Stack light: green / amber / red
    var tower = new T.Group(); tower.position.set(x - 0.55, 0.12 + MH, -0.55); scene.add(tower);
    var pole = new T.Mesh(poleGeo, new T.MeshStandardMaterial({ color: C(0x9aa4aa), metalness: 0.9, roughness: 0.3 })); pole.position.y = 0.25; tower.add(pole);
    var lamps = [];
    for (var l = 0; l < 3; l++) {
      var lm = new T.MeshStandardMaterial({ color: lampCols[l].clone().multiplyScalar(0.15), emissive: lampCols[l], emissiveIntensity: 0.05, roughness: 0.3, transparent: true });
      var lamp = new T.Mesh(lampGeo, lm); lamp.position.y = 0.52 + l * 0.12; tower.add(lamp); lamps.push(lm);
    }
    var lab = document.createElement('span');
    lab.innerHTML = '<b>' + load[i] + '%</b>' + names[i];
    if (load[i] > 100) lab.className = 'over';
    labelsEl.appendChild(lab);
    st.push({ body: body, mat: mat, plinth: plinth, strip: strip, screen: screen, tower: tower, lamps: lamps,
      h: load[i] * UNIT, over: load[i] > 100, warm: load[i] >= 85 && load[i] <= 100, lab: lab, x: x });
  }

  // Robot arms beside two stations
  var armMat = new T.MeshStandardMaterial({ color: C(0x8e989e), metalness: 0.75, roughness: 0.38, envMapIntensity: 0.8 });
  var jointMat = new T.MeshStandardMaterial({ color: C(0x2a3136), metalness: 0.7, roughness: 0.3 });
  var ringMat = new T.MeshStandardMaterial({ color: C(0x3bb7d6), emissive: C(0x3bb7d6), emissiveIntensity: 1.4 });
  var cargoMat = new T.MeshStandardMaterial({ color: C(0xc9d3d8), metalness: 0.85, roughness: 0.22 });
  function makeArm(x) {
    // Mounted in front of the conveyor, centred in the gap between two stations
    var root = new T.Group(); root.position.set(x + SPACING / 2, 0, 1.18); scene.add(root);
    var ring = new T.Mesh(new T.TorusGeometry(0.27, 0.018, 8, 40), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; root.add(ring);
    var base = new T.Mesh(new T.CylinderGeometry(0.2, 0.26, 0.22, 24), jointMat); base.position.y = 0.11; root.add(base);
    var yaw = new T.Group(); yaw.position.y = 0.22; root.add(yaw);
    var sh = new T.Group(); yaw.add(sh);
    var l1 = new T.Mesh(new T.BoxGeometry(0.14, 0.75, 0.14), armMat); l1.position.y = 0.375; sh.add(l1);
    var el = new T.Group(); el.position.y = 0.75; sh.add(el);
    var j = new T.Mesh(new T.SphereGeometry(0.1, 16, 12), jointMat); el.add(j);
    var l2 = new T.Mesh(new T.BoxGeometry(0.11, 0.6, 0.11), armMat); l2.position.y = 0.3; el.add(l2);
    var wr = new T.Mesh(new T.SphereGeometry(0.075, 14, 10), jointMat); wr.position.y = 0.6; el.add(wr);
    var tool = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, 0.1, 14), jointMat); tool.position.y = 0.68; el.add(tool);
    var cargo = new T.Mesh(new T.BoxGeometry(0.26, 0.2, 0.26), cargoMat); cargo.position.y = 0.83; el.add(cargo);
    [base, l1, l2, j, wr, tool, cargo].forEach(function (m) { m.castShadow = true; });
    return { root: root, yaw: yaw, sh: sh, el: el, cargo: cargo };
  }
  var arms = [makeArm(sx(1)), makeArm(sx(2))];

  // Conveyor + parts (parts queue in front of the constraint)
  var X0 = sx(0) - 1.8, X1 = sx(N - 1) + 1.8, CY = 0.5;
  var beltMat = new T.MeshStandardMaterial({ color: C(0x161b1f), metalness: 0.3, roughness: 0.7, transparent: true });
  var belt = new T.Mesh(new T.BoxGeometry(X1 - X0, 0.1, 0.62), beltMat);
  belt.position.set((X0 + X1) / 2, CY - 0.08, 0); belt.receiveShadow = true; scene.add(belt);
  var railMat = new T.MeshStandardMaterial({ color: C(0x8a949a), metalness: 0.9, roughness: 0.25, transparent: true });
  [-0.34, 0.34].forEach(function (z) { var r = new T.Mesh(new T.BoxGeometry(X1 - X0, 0.05, 0.04), railMat); r.position.set((X0 + X1) / 2, CY - 0.02, z); scene.add(r); });
  var P = 34, partMat = new T.MeshStandardMaterial({ color: C(0xc9d3d8), metalness: 0.85, roughness: 0.22, transparent: true });
  var parts = new T.InstancedMesh(new T.BoxGeometry(0.32, 0.24, 0.32), partMat, P); parts.castShadow = true; scene.add(parts);
  var px = new Float32Array(P);
  for (var k = 0; k < P; k++) px[k] = X0 + (X1 - X0) * (k / P);
  var dummy = new T.Object3D(), bx = sx(BOT);
  function speedAt(x) { return (x > bx - 2.6 && x < bx + 0.6) ? 0.28 : 1.5; }

  // Data streams rising from every station
  var D = mobile ? 300 : 520, dGeo = new T.BufferGeometry(), dPos = new Float32Array(D * 3), dSt = new Uint8Array(D), dSpd = new Float32Array(D);
  for (var q = 0; q < D; q++) {
    dSt[q] = q % N; dSpd[q] = 0.8 + Math.random() * 1.6;
    dPos[q * 3] = sx(dSt[q]) + (Math.random() - 0.5) * 1.1; dPos[q * 3 + 1] = MH + Math.random() * 5; dPos[q * 3 + 2] = (Math.random() - 0.5) * 1.1;
  }
  dGeo.setAttribute('position', new T.BufferAttribute(dPos, 3));
  var dMat = new T.PointsMaterial({ color: C(0x9fe8ff).multiplyScalar(3), size: 0.055, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
  scene.add(new T.Points(dGeo, dMat));

  // Capacity plane at 100% + pulse ring under the constraint
  var capY = 100 * UNIT, capW = SPACING * N + 1;
  var capMat = new T.MeshBasicMaterial({ color: C(0x3bb7d6), transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
  var cap = new T.Mesh(new T.PlaneGeometry(capW, 3), capMat); cap.rotation.x = -Math.PI / 2; cap.position.y = capY; scene.add(cap);
  var capEdge = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(capW, 3)), new T.LineBasicMaterial({ color: C(0x7fd3e8).multiplyScalar(2), transparent: true, opacity: 0 }));
  capEdge.rotation.x = -Math.PI / 2; capEdge.position.y = capY; scene.add(capEdge);
  var ringMat = new T.MeshBasicMaterial({ color: orange.clone().multiplyScalar(2.5), transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
  var ring = new T.Mesh(new T.RingGeometry(0.9, 1.0, 64), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.set(bx, 0.02, 0); scene.add(ring);

  // ---------- Post-processing (HDR bloom) ----------
  var composer = null, bloom = null;
  if (T.EffectComposer && T.UnrealBloomPass && T.ShaderPass && T.GammaCorrectionShader && T.ACESFilmicToneMappingShader) {
    var rt = new T.WebGLRenderTarget(2, 2, { type: T.HalfFloatType, format: T.RGBAFormat });
    composer = new T.EffectComposer(renderer, rt);
    composer.addPass(new T.RenderPass(scene, cam));
    bloom = new T.UnrealBloomPass(new T.Vector2(2, 2), 0.6, 0.55, 0.9);
    composer.addPass(bloom);
    var tone = new T.ShaderPass(T.ACESFilmicToneMappingShader); tone.uniforms.exposure.value = 1.0; composer.addPass(tone);
    composer.addPass(new T.ShaderPass(T.GammaCorrectionShader));
  } else {
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
  }

  // ---------- Helpers ----------
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function sm(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }
  var K = [
    [0.00, [8.5, 4.2, 11.5], [0, 0.9, 0]],
    [0.32, [3.5, 6.8, 11], [0, 2.2, 0]],
    [0.64, [11, 8.2, 15.5], [0, 2.4, 0]],
    [1.00, [2, 12.5, 21], [0, 2.4, 0]]
  ];
  var cp = new T.Vector3(), cl = new T.Vector3(), tmp = new T.Vector3();
  function camAt(p) {
    var j = 0; while (j < K.length - 2 && p > K[j + 1][0]) j++;
    var a = K[j], b = K[j + 1], t = sm(a[0], b[0], p);
    cp.set(mix(a[1][0], b[1][0], t), mix(a[1][1], b[1][1], t), mix(a[1][2], b[1][2], t));
    cl.set(mix(a[2][0], b[2][0], t), mix(a[2][1], b[2][1], t), mix(a[2][2], b[2][2], t));
  }

  var W = 0, H = 0, aspect = 1;
  function resize() {
    var w = cv.clientWidth, h = cv.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h; aspect = w / Math.max(h, 1);
    renderer.setSize(w, h, false); cam.aspect = aspect; cam.updateProjectionMatrix();
    if (composer) { var pr = renderer.getPixelRatio(); composer.setSize(w, h); bloom.setSize(w * pr, h * pr); }
  }

  var target = 0, prog = 0, mx = 0, my = 0, tmx = 0, tmy = 0, visible = true;
  function readScroll() {
    var r = story.getBoundingClientRect(), span = r.height - window.innerHeight;
    target = clamp(-r.top / Math.max(span, 1), 0, 1);
  }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll);
  addEventListener('pointermove', function (e) { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(story);
  readScroll();

  var beats = [].slice.call(story.querySelectorAll('.beat'));
  var win = [[-1, 0.17], [0.21, 0.43], [0.47, 0.70], [0.76, 2]];
  var progBars = [].slice.call(story.querySelectorAll('.prog i'));
  var cue = story.querySelector('.cue');
  var clock = new T.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    resize();
    var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    prog += (target - prog) * Math.min(1, dt * 6);
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    var p = prog;
    var data = sm(0.2, 0.3, p) * (1 - sm(0.5, 0.62, p));
    var morph = sm(0.45, 0.72, p);
    var plan = sm(0.7, 0.95, p);
    var lineVis = 1 - sm(0.45, 0.62, p);

    // Stations -> columns
    for (var i = 0; i < N; i++) {
      var s = st[i], mi = sm(0, 1, morph * 1.5 - i * 0.09);
      var h = mix(MH, s.h, mi);
      s.body.scale.set(mix(1, 0.72, mi), h, mix(1, 0.72, mi));
      s.body.position.y = mix(0.12, 0, mi) + Math.sin(Math.PI * mi) * 0.25;
      var c = s.over ? orange : cyan;
      s.mat.color.copy(graphite).lerp(c, mi);
      s.mat.emissive.copy(c).multiplyScalar(mi * (s.over ? 0.55 + 0.35 * Math.sin(t * 4) * plan : 0.22));
      s.mat.metalness = mix(0.6, 0.15, mi); s.mat.roughness = mix(0.32, 0.5, mi);
      var top = s.body.position.y + h;
      s.strip.position.set(s.x, top * 0.78 + 0.05, 0.76);
      s.strip.material.color.setRGB(0.36, 0.78, 0.89).multiplyScalar(1.5 + Math.sin(t * 3 + i));
      s.strip.material.opacity = 1 - mi;
      s.screen.material.opacity = 1 - sm(0, 0.4, mi); s.screen.visible = mi < 0.4;
      s.plinth.material.opacity = 1 - mi;
      // Stack light: green running, amber busy, red blinking at the constraint
      var on = s.over ? 2 : (s.warm ? 1 : 0), blink = s.over ? (Math.sin(t * 6) > 0 ? 1 : 0.15) : 1;
      for (var l = 0; l < 3; l++) { s.lamps[l].emissiveIntensity = (l === on ? 3.2 * blink : 0.05); s.lamps[l].opacity = 1 - mi; }
      s.tower.visible = mi < 0.98; s.tower.position.y = top;
      var lo = sm(0.66, 0.8, p);
      if (lo > 0.01) {
        tmp.set(s.x, s.h + 0.45, 0).project(cam);
        s.lab.style.transform = 'translate(' + ((tmp.x * 0.5 + 0.5) * W) + 'px,' + ((-tmp.y * 0.5 + 0.5) * H) + 'px) translate(-50%,-100%)';
      }
      s.lab.style.opacity = lo.toFixed(3);
    }

    // Robot arms working, then folding away
    for (var a = 0; a < arms.length; a++) {
      // Pick-and-place over the belt: dip, grip, lift, swing, place. Folds away before the stations rise.
      var A = arms[a], u = ((t * 1.6) / (2 * Math.PI) + a * 0.37) % 1;
      var dip = 0.5 - 0.5 * Math.cos(4 * Math.PI * u); dip = dip * dip * (3 - 2 * dip);
      var armVis = 1 - sm(0.3, 0.42, p), fold = 1 - armVis;
      A.yaw.rotation.y = -Math.PI / 2 + 0.3 * Math.sin(2 * Math.PI * u) * armVis;
      A.sh.rotation.z = mix(mix(0.25, 0.55, dip), 0.0, fold);
      A.el.rotation.z = mix(mix(1.15, 1.2, dip), 0.25, fold);
      A.cargo.visible = (u > 0.27 && u < 0.73) && armVis > 0.5;
      var sc2 = Math.max(0.001, armVis); A.root.scale.set(sc2, sc2, sc2);
    }

    // Conveyor flow with a queue in front of the constraint
    beltMat.opacity = railMat.opacity = partMat.opacity = lineVis;
    parts.visible = belt.visible = lineVis > 0.01;
    if (lineVis > 0.01) {
      var order = []; for (var k = 0; k < P; k++) order.push(k);
      order.sort(function (a, b) { return px[b] - px[a]; });
      for (var o = 0; o < P; o++) {
        var id = order[o], nx = px[id] + speedAt(px[id]) * dt;
        if (o > 0) { var ahead = px[order[o - 1]]; if (ahead > px[id]) nx = Math.min(nx, ahead - 0.4); }
        px[id] = nx > X1 ? X0 : nx;
        dummy.position.set(px[id], CY + 0.12, 0); dummy.updateMatrix();
        parts.setMatrixAt(id, dummy.matrix);
      }
      parts.instanceMatrix.needsUpdate = true;
    }

    // Data streams
    dMat.opacity = data;
    if (data > 0.01) {
      for (var j = 0; j < D; j++) {
        dPos[j * 3 + 1] += dSpd[j] * dt;
        if (dPos[j * 3 + 1] > MH + 5.5) { dPos[j * 3 + 1] = MH; dPos[j * 3] = sx(dSt[j]) + (Math.random() - 0.5) * 1.1; }
      }
      dGeo.attributes.position.needsUpdate = true;
    }

    capMat.opacity = plan * 0.08; capEdge.material.opacity = plan * 0.8;
    var rp = (t * 0.7) % 1; ring.scale.setScalar(0.8 + rp * 1.6); ringMat.opacity = plan * (1 - rp) * 0.9;

    // Camera: page-load dolly, scroll path, pointer parallax, narrow-screen fit
    camAt(p);
    var intro = 1 + 0.35 * (1 - sm(0, 2.4, t));
    var fitK = (aspect < 1.25 ? Math.pow(1.25 / aspect, 0.75) : 1) * intro;
    scene.fog.near = 18 * fitK; scene.fog.far = 42 * fitK;
    key.intensity = mix(2.2, 1.3, morph);
    cp.sub(cl).multiplyScalar(fitK).add(cl);
    cp.x += mx * 1.2; cp.y += -my * 0.6;
    cam.position.copy(cp); cam.lookAt(cl);
    if (aspect >= 1.25) cam.setViewOffset(W, H, -W * 0.23, 0, W, H); else cam.setViewOffset(W, H, 0, H * 0.26, W, H);

    for (var b = 0; b < beats.length; b++) {
      var w = win[b], op = sm(w[0], w[0] + 0.05, p) * (1 - sm(w[1] - 0.05, w[1], p));
      beats[b].style.opacity = op.toFixed(3);
      beats[b].style.translate = '0 ' + ((1 - op) * (p < w[0] + 0.05 ? 30 : -30)).toFixed(1) + 'px';
      beats[b].style.visibility = op < 0.01 ? 'hidden' : 'visible';
    }
    for (var qq = 0; qq < progBars.length; qq++) progBars[qq].style.setProperty('--f', clamp((p - qq * 0.25) / 0.25, 0, 1).toFixed(3));
    if (cue) cue.style.opacity = (1 - sm(0.02, 0.08, p)).toFixed(2);

    if (composer) composer.render(); else renderer.render(scene, cam);
  }
  frame();
})();
