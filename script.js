(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ---------- Floating hearts background (CSS particles) ----------
  const heartsRoot = $("#hearts");
  const sparklesRoot = $("#sparkles");

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // Canvas roundRect polyfill for older browsers
  if (typeof CanvasRenderingContext2D !== "undefined") {
    const proto = CanvasRenderingContext2D.prototype;
    if (!proto.roundRect) {
      proto.roundRect = function roundRect(x, y, w, h, r) {
        const rr = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
        const tl = rr?.tl ?? 0;
        const tr = rr?.tr ?? 0;
        const br = rr?.br ?? 0;
        const bl = rr?.bl ?? 0;
        this.beginPath();
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        return this;
      };
    }
  }

  // ---------- Game: Memory Match ----------
  const mmGrid = $("#mmGrid");
  const mmRestart = $("#mmRestart");
  const mmMovesEl = $("#mmMoves");
  const mmMatchesEl = $("#mmMatches");

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function setupMemoryMatch() {
    if (!mmGrid) return;
    const emojis = ["💘", "💝", "💞", "😍", "😘", "🌹", "🍫", "🍓", "✨", "🥰", "🎀", "🐻"];
    const pick = shuffle([...emojis]).slice(0, 8);
    const deck = shuffle([...pick, ...pick].map((v, idx) => ({ v, id: idx })));

    let flipped = [];
    let locked = false;
    let moves = 0;
    let matches = 0;

    function setHUD() {
      if (mmMovesEl) mmMovesEl.textContent = String(moves);
      if (mmMatchesEl) mmMatchesEl.textContent = String(matches);
    }

    mmGrid.innerHTML = "";
    setHUD();

    deck.forEach((c) => {
      const card = document.createElement("div");
      card.className = "mmCard";
      card.dataset.value = c.v;
      card.dataset.id = String(c.id);

      const front = document.createElement("div");
      front.className = "mmFace mmFront";
      front.textContent = "❤";

      const back = document.createElement("div");
      back.className = "mmFace mmBack";
      back.textContent = c.v;

      card.appendChild(front);
      card.appendChild(back);
      mmGrid.appendChild(card);
    });

    function flip(card) {
      if (!card || locked) return;
      if (card.classList.contains("is-flipped") || card.classList.contains("is-matched")) return;
      card.classList.add("is-flipped");
      flipped.push(card);

      if (flipped.length === 2) {
        locked = true;
        moves += 1;
        setHUD();

        const [a, b] = flipped;
        const ok = a.dataset.value === b.dataset.value;

        window.setTimeout(() => {
          if (ok) {
            a.classList.add("is-matched");
            b.classList.add("is-matched");
            matches += 1;
            setHUD();
          } else {
            a.classList.remove("is-flipped");
            b.classList.remove("is-flipped");
          }

          flipped = [];
          locked = false;

          if (matches === 8) {
            // Celebrate with existing confetti
            burstConfetti();
          }
        }, ok ? 360 : 560);
      }
    }

    mmGrid.onclick = (e) => {
      const t = e.target;
      const card = t instanceof HTMLElement ? t.closest(".mmCard") : null;
      if (card instanceof HTMLElement) flip(card);
    };
  }

  if (mmRestart) {
    mmRestart.addEventListener("click", () => setupMemoryMatch());
  }
  setupMemoryMatch();

  // ---------- Game: Heart Catch ----------
  const catchCanvas = $("#catchCanvas");
  const catchOverlay = $("#catchOverlay");
  const catchStart = $("#catchStart");
  const hcScoreEl = $("#hcScore");
  const hcLivesEl = $("#hcLives");
  const catchMsg = $("#catchMsg");

  function setCatchOverlay(visible) {
    if (!catchOverlay) return;
    catchOverlay.classList.toggle("is-hidden", !visible);
  }

  function setCatchMsg(text) {
    if (!catchMsg) return;
    catchMsg.textContent = text;
  }

  function setupHeartCatch() {
    if (!catchCanvas) return null;
    const ctx = catchCanvas.getContext("2d");
    if (!ctx) return null;

    const W = catchCanvas.width;
    const H = catchCanvas.height;

    let running = false;
    let raf = null;
    let last = null;
    let score = 0;
    let lives = 3;

    const basket = {
      x: W / 2,
      y: H - 96,
      w: 140,
      h: 22,
      vx: 0,
    };

    const drops = [];
    let spawnT = 0;

    function hud() {
      if (hcScoreEl) hcScoreEl.textContent = String(score);
      if (hcLivesEl) hcLivesEl.textContent = String(lives);
    }

    function reset() {
      running = false;
      last = null;
      score = 0;
      lives = 3;
      basket.x = W / 2;
      basket.vx = 0;
      drops.splice(0, drops.length);
      spawnT = 0;
      hud();
      draw(0);
      setCatchOverlay(true);
    }

    function start() {
      if (running) return;
      running = true;
      setCatchOverlay(false);
      setCatchMsg("Catch 💗, avoid 💔. Drag left/right!");
      raf = requestAnimationFrame(loop);
    }

    function stop(msg) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      setCatchOverlay(true);
      if (msg) setCatchMsg(msg);
    }

    function spawn() {
      const bad = Math.random() < 0.18;
      drops.push({
        x: rand(30, W - 30),
        y: -20,
        vy: rand(260, 440),
        r: bad ? 16 : 15,
        kind: bad ? "bad" : "good",
      });
    }

    function rectHit(px, py, r) {
      const left = basket.x - basket.w / 2;
      const right = basket.x + basket.w / 2;
      const top = basket.y;
      const bottom = basket.y + basket.h;
      const nx = clamp(px, left, right);
      const ny = clamp(py, top, bottom);
      const dx = px - nx;
      const dy = py - ny;
      return dx * dx + dy * dy <= r * r;
    }

    function step(dt) {
      // gently follow vx for smoother touch
      basket.x += basket.vx * dt;
      basket.x = clamp(basket.x, basket.w / 2 + 10, W - basket.w / 2 - 10);

      spawnT += dt;
      const rate = Math.max(0.45, 1.05 - score * 0.03);
      if (spawnT > rate) {
        spawnT = 0;
        spawn();
      }

      for (let i = drops.length - 1; i >= 0; i -= 1) {
        const d = drops[i];
        d.y += d.vy * dt;

        if (rectHit(d.x, d.y, d.r)) {
          if (d.kind === "good") {
            score += 1;
          } else {
            lives -= 1;
          }
          hud();
          drops.splice(i, 1);
          continue;
        }

        if (d.y > H - 64) {
          // Missing a good heart hurts a bit
          if (d.kind === "good") lives -= 1;
          hud();
          drops.splice(i, 1);
        }
      }

      if (lives <= 0) {
        stop("Game over 😭 Tap Start to try again.");
      }
    }

    function draw(t) {
      // background
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "rgba(255, 192, 203, 0.55)");
      sky.addColorStop(1, "rgba(255, 255, 255, 0.90)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // floating hearts
      ctx.globalAlpha = 0.18;
      ctx.font = "28px Quicksand";
      for (let i = 0; i < 9; i += 1) {
        const x = (i * 130 + t * 0.05) % (W + 160) - 60;
        const y = 80 + (i % 3) * 90 + 12 * Math.sin((t / 420) + i);
        ctx.fillText("💗", W - x, y);
      }
      ctx.globalAlpha = 1;

      // ground
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillRect(0, H - 64, W, 64);

      // basket
      ctx.save();
      ctx.translate(basket.x, basket.y);
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.strokeStyle = "rgba(255, 0, 0, 0.20)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-basket.w / 2, 0, basket.w, basket.h, 14);
      ctx.fill();
      ctx.stroke();
      ctx.font = "24px Quicksand";
      ctx.fillStyle = "rgba(255, 0, 0, 0.70)";
      ctx.fillText("🧺", -10, 17);
      ctx.restore();

      // drops
      drops.forEach((d) => {
        ctx.font = "30px Quicksand";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.kind === "good" ? "💗" : "💔", d.x, d.y);
      });
    }

    function loop(ts) {
      if (!running) return;
      if (!last) last = ts;
      const dt = clamp((ts - last) / 1000, 0, 0.034);
      last = ts;
      step(dt);
      draw(ts);
      if (running) raf = requestAnimationFrame(loop);
    }

    // Controls: drag inside canvas
    let dragActive = false;
    let dragX = 0;

    function pointerDown(e) {
      dragActive = true;
      dragX = e.clientX;
    }

    function pointerMove(e) {
      if (!dragActive) return;
      const dx = e.clientX - dragX;
      dragX = e.clientX;
      basket.x = clamp(basket.x + dx * (window.devicePixelRatio ? 1 : 1), basket.w / 2 + 10, W - basket.w / 2 - 10);
      // small inertia
      basket.vx = clamp(dx * 16, -900, 900);
    }

    function pointerUp() {
      dragActive = false;
      basket.vx = 0;
    }

    catchCanvas.addEventListener("pointerdown", pointerDown);
    catchCanvas.addEventListener("pointermove", pointerMove);
    catchCanvas.addEventListener("pointerup", pointerUp);
    catchCanvas.addEventListener("pointercancel", pointerUp);
    catchCanvas.addEventListener("pointerleave", pointerUp);

    reset();
    return { reset, start };
  }

  const heartCatch = setupHeartCatch();
  if (catchStart) {
    catchStart.addEventListener("click", () => {
      heartCatch?.reset();
      heartCatch?.start();
    });
  }

  // ---------- Arcade: Cupid Flap ----------
  const gameCanvas = $("#gameCanvas");
  const gameOverlay = $("#gameOverlay");
  const gameStart = $("#gameStart");
  const gameHow = $("#gameHow");
  const gameScoreEl = $("#gameScore");
  const gameBestEl = $("#gameBest");
  const gameMsg = $("#gameMsg");

  function setGameMsg(text) {
    if (!gameMsg) return;
    gameMsg.textContent = text;
  }

  function setOverlayVisible(visible) {
    if (!gameOverlay) return;
    gameOverlay.classList.toggle("is-hidden", !visible);
  }

  function getBest() {
    const v = Number.parseInt(localStorage.getItem("cupidFlapBest") || "0", 10);
    return Number.isFinite(v) ? v : 0;
  }

  function setBest(v) {
    localStorage.setItem("cupidFlapBest", String(v));
  }

  function updateScores(score) {
    if (gameScoreEl) gameScoreEl.textContent = String(score);
    const best = getBest();
    if (gameBestEl) gameBestEl.textContent = String(best);
  }

  if (gameBestEl) gameBestEl.textContent = String(getBest());

  function setupGame() {
    if (!gameCanvas) return null;
    const ctx = gameCanvas.getContext("2d");
    if (!ctx) return null;

    let running = false;
    let raf = null;
    let last = null;
    let score = 0;

    const W = gameCanvas.width;
    const H = gameCanvas.height;

    const world = {
      gravity: 1600,
      flap: -520,
      speed: 310,
      gap: 170,
      pipeWidth: 92,
    };

    const player = {
      x: 210,
      y: H * 0.5,
      r: 18,
      vy: 0,
      rot: 0,
    };

    const pipes = [];

    function reset() {
      running = false;
      last = null;
      score = 0;
      player.y = H * 0.5;
      player.vy = 0;
      player.rot = 0;
      pipes.splice(0, pipes.length);
      spawnPipe(W + 140);
      spawnPipe(W + 440);
      spawnPipe(W + 740);
      updateScores(score);
    }

    function spawnPipe(x) {
      const margin = 76;
      const center = rand(margin + world.gap / 2, H - margin - world.gap / 2);
      pipes.push({
        x,
        center,
        scored: false,
      });
    }

    function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
      const nx = clamp(cx, rx, rx + rw);
      const ny = clamp(cy, ry, ry + rh);
      const dx = cx - nx;
      const dy = cy - ny;
      return dx * dx + dy * dy <= cr * cr;
    }

    function flap() {
      if (!running) {
        start();
        return;
      }
      player.vy = world.flap;
    }

    function start() {
      if (running) return;
      running = true;
      setOverlayVisible(false);
      setGameMsg("Go go go! Flap for love points 💗");
      raf = requestAnimationFrame(loop);
    }

    function gameOver() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;

      const best = getBest();
      if (score > best) {
        setBest(score);
      }
      updateScores(score);
      setOverlayVisible(true);
      setGameMsg(score >= 10 ? "Legend! Play again for an even cuter high score." : "Close one! Try again 😌");
    }

    function drawBackground(t) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "rgba(255, 192, 203, 0.55)");
      sky.addColorStop(1, "rgba(255, 255, 255, 0.85)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // floating mini hearts
      for (let i = 0; i < 12; i += 1) {
        const x = (i * 110 + (t * 0.06)) % (W + 120) - 60;
        const y = 90 + (i % 4) * 70 + 14 * Math.sin((t / 500) + i);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = i % 2 ? "rgba(255, 0, 0, 0.55)" : "rgba(255, 192, 203, 0.9)";
        ctx.font = "20px Quicksand";
        ctx.fillText("❤", W - x, y);
      }
      ctx.globalAlpha = 1;

      // ground
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillRect(0, H - 64, W, 64);
      ctx.strokeStyle = "rgba(255, 0, 0, 0.18)";
      ctx.beginPath();
      ctx.moveTo(0, H - 64);
      ctx.lineTo(W, H - 64);
      ctx.stroke();
    }

    function drawPipe(x, topH, bottomY) {
      const w = world.pipeWidth;

      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, "rgba(255, 0, 0, 0.20)");
      grad.addColorStop(0.5, "rgba(255, 255, 255, 0.65)");
      grad.addColorStop(1, "rgba(255, 0, 0, 0.20)");

      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(43, 27, 36, 0.10)";

      // top candy pole
      ctx.beginPath();
      ctx.roundRect(x, 0, w, topH, 16);
      ctx.fill();
      ctx.stroke();

      // bottom candy pole
      ctx.beginPath();
      ctx.roundRect(x, bottomY, w, H - bottomY - 64, 16);
      ctx.fill();
      ctx.stroke();

      // sprinkles
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 10; i += 1) {
        const sx = x + 16 + (i * 7) % (w - 24);
        const sy = 12 + (i * 19) % Math.max(20, topH - 20);
        ctx.fillStyle = i % 2 ? "rgba(255, 192, 203, 0.85)" : "rgba(255, 0, 0, 0.35)";
        ctx.fillRect(sx, sy, 4, 10);
      }
      ctx.globalAlpha = 1;
    }

    function drawPlayer() {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rot);
      ctx.font = "34px Quicksand";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💘", 0, 0);
      ctx.restore();
    }

    function drawScore() {
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.strokeStyle = "rgba(43, 27, 36, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(16, 16, 170, 44, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(43, 27, 36, 0.9)";
      ctx.font = "900 18px Quicksand";
      ctx.fillText(`Love Points: ${score}`, 30, 44);
      ctx.restore();
    }

    function step(dt) {
      player.vy += world.gravity * dt;
      player.y += player.vy * dt;

      const rotTarget = clamp(player.vy / 900, -0.7, 0.9);
      player.rot += (rotTarget - player.rot) * clamp(dt * 8, 0, 1);

      pipes.forEach((p) => {
        p.x -= world.speed * dt;
      });

      // recycle
      if (pipes.length && pipes[0].x < -world.pipeWidth - 20) {
        pipes.shift();
        const lastX = pipes[pipes.length - 1]?.x ?? W;
        spawnPipe(lastX + 300);
      }

      // score
      pipes.forEach((p) => {
        if (!p.scored && p.x + world.pipeWidth < player.x) {
          p.scored = true;
          score += 1;
          updateScores(score);
        }
      });

      // collisions
      if (player.y - player.r < 0 || player.y + player.r > H - 64) {
        gameOver();
        return;
      }

      for (const p of pipes) {
        const topH = p.center - world.gap / 2;
        const bottomY = p.center + world.gap / 2;
        const rx = p.x;
        const rw = world.pipeWidth;

        if (circleRectCollide(player.x, player.y, player.r, rx, 0, rw, topH)) {
          gameOver();
          return;
        }
        if (circleRectCollide(player.x, player.y, player.r, rx, bottomY, rw, H - bottomY - 64)) {
          gameOver();
          return;
        }
      }
    }

    function draw(t) {
      drawBackground(t);
      pipes.forEach((p) => {
        const topH = p.center - world.gap / 2;
        const bottomY = p.center + world.gap / 2;
        drawPipe(p.x, topH, bottomY);
      });
      drawPlayer();
      drawScore();
    }

    function loop(ts) {
      if (!running) return;
      if (!last) last = ts;
      const dt = clamp((ts - last) / 1000, 0, 0.034);
      last = ts;

      step(dt);
      draw(ts);

      if (running) raf = requestAnimationFrame(loop);
    }

    reset();
    draw(0);

    return { reset, start, flap, gameOver };
  }

  const cupidFlap = setupGame();

  function gameFlap() {
    cupidFlap?.flap();
  }

  if (gameStart) {
    gameStart.addEventListener("click", () => {
      cupidFlap?.reset();
      cupidFlap?.start();
    });
  }

  if (gameHow) {
    gameHow.addEventListener("click", () => {
      setGameMsg("How to play: Tap/click/Space to flap 💘. Pass poles = +1 point. Hit anything = game over.");
    });
  }

  if (gameCanvas) {
    gameCanvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      gameFlap();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      gameFlap();
    }
  });

  // ---------- App Router (bottom tabs) ----------
  const views = $$('[data-view]');
  const tabs = $$('[data-tab]');

  // ---------- Mascot ----------
  const mascotText = $("#mascotText");
  const mascotTap = $("#mascotTap");

  const mascotLines = [
    "I’m cheering for you 💗",
    "Pro tip: Hearts are easier to catch than feelings.",
    "If you get a perfect quiz score, I will be impressed.",
    "Try Cupid Flap. It’s chaotic-cute.",
    "Plant flowers in Garden. I love watching them bloom.",
    "You are illegally adorable. That’s my verdict.",
  ];

  function say(line) {
    if (!mascotText) return;
    mascotText.textContent = line;
  }

  let mascotIdx = 0;
  if (mascotTap) {
    mascotTap.addEventListener("click", () => {
      mascotIdx = (mascotIdx + 1) % mascotLines.length;
      say(mascotLines[mascotIdx]);
    });
  }

  const sectionToView = {
    valentine: "home",
    loveMeter: "home",
    reasons: "home",
    arcade: "games",
    memory: "games",
    catch: "games",
    quiz: "quizView",
    bouquet: "gardenView",
    scrapbook: "media",
  };

  function showView(id) {
    const next = views.find((v) => v.id === id) ? id : "home";
    views.forEach((v) => v.classList.toggle("is-active", v.id === next));
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === next));

    // Reveal animations need a nudge when a view becomes visible
    const reveal = $$(".reveal", document.getElementById(next) || document);
    reveal.forEach((el) => {
      // Allow intersection observer to do its thing; also make sure hidden views don't stay invisible forever.
      el.classList.add("is-visible");
    });

    if (next === "games") say("Games time! Tap Start and show me your skills 🎮💗");
    if (next === "home") say("Home sweet home. Press Yes when you’re ready 😌");
    if (next === "gardenView") say("Garden mode: plant flowers like a romance wizard 🌷");
    if (next === "media") say("Scrapbook! Big photos, big feelings ✨");
    if (next === "quizView") say("Quiz time. No pressure… okay tiny pressure 😄");
  }

  function currentHashView() {
    const raw = (window.location.hash || "#home").slice(1);
    return raw || "home";
  }

  window.addEventListener("hashchange", () => {
    showView(currentHashView());
  });

  // Initial route
  showView(currentHashView());

  // Make the top navigation work with app views.
  // If a link points to an in-view section (e.g. #bouquet), switch views first and then scroll.
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const a = t.closest(".top-nav a");
    if (!(a instanceof HTMLAnchorElement)) return;

    const href = a.getAttribute("href") || "";
    if (!href.startsWith("#")) return;
    const id = href.slice(1);
    if (!id) return;

    const viewId = sectionToView[id] || (views.find((v) => v.id === id) ? id : null);
    if (!viewId) return;

    e.preventDefault();
    window.location.hash = `#${viewId}`;

    window.setTimeout(() => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  });

  function spawnHeart() {
    if (!heartsRoot) return;

    const heart = document.createElement("div");
    heart.className = "heart";

    const left = rand(0, 100);
    const size = rand(10, 22);
    const duration = rand(5.5, 11.5);
    const delay = rand(0, 1.2);
    const alpha = rand(0.12, 0.30);

    heart.style.left = `${left}vw`;
    heart.style.width = `${size}px`;
    heart.style.height = `${size}px`;
    heart.style.background = `rgba(255, 0, 0, ${alpha})`;
    heart.style.animationDuration = `${duration}s`;
    heart.style.animationDelay = `${delay}s`;

    heartsRoot.appendChild(heart);

    const ttl = (duration + delay) * 1000;
    window.setTimeout(() => heart.remove(), ttl);
  }

  // Keep it light for mobile
  let heartInterval = window.setInterval(spawnHeart, 380);
  // Seed a few
  for (let i = 0; i < 10; i += 1) spawnHeart();

  // ---------- Sparkles / twinkles background ----------
  function seedTwinkles() {
    if (!sparklesRoot) return;
    sparklesRoot.innerHTML = "";

    const count = Math.round(clamp(window.innerWidth / 28, 14, 38));
    for (let i = 0; i < count; i += 1) {
      const t = document.createElement("div");
      t.className = "twinkle";
      t.style.left = `${rand(0, 100)}vw`;
      t.style.top = `${rand(0, 100)}vh`;
      t.style.animationDuration = `${rand(1.8, 3.5)}s`;
      t.style.animationDelay = `${rand(0, 2.0)}s`;
      t.style.opacity = `${rand(0.15, 0.9)}`;
      sparklesRoot.appendChild(t);
    }
  }

  seedTwinkles();
  window.addEventListener("resize", () => {
    // Re-seed for a nicer distribution on resize
    seedTwinkles();
  });

  // ---------- Reveal on scroll ----------
  const revealEls = $$(".reveal");
  if (revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  // ---------- No button prank + Confetti burst ----------
  const stage = $("#valentineStage");
  const yesBtn = $("#yesBtn");
  const noBtn = $("#noBtn");
  const valentineResult = $("#valentineResult");

  function stageRect() {
    return stage?.getBoundingClientRect();
  }

  function moveNoButton() {
    if (!stage || !noBtn) return;

    const rect = stageRect();
    if (!rect) return;

    const pad = 10;
    const maxX = Math.max(pad, rect.width - noBtn.offsetWidth - pad);
    const maxY = Math.max(pad, rect.height - noBtn.offsetHeight - pad);

    // Position absolutely relative to stage
    stage.style.position = "relative";
    noBtn.style.position = "absolute";

    const x = rand(pad, maxX);
    const y = rand(pad, maxY);

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
  }

  function setValentineMessage(msg) {
    if (!valentineResult) return;
    valentineResult.textContent = msg;
  }

  // Make the prank hard to "win" on both mouse + touch
  if (noBtn) {
    noBtn.addEventListener("pointerenter", moveNoButton);
    noBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      moveNoButton();
      setValentineMessage("Nice try 😌 The No button is on a cardio routine.");
    });
  }

  // Heart-shaped confetti (canvas)
  const confettiCanvas = $("#confetti");
  const confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;

  function resizeConfetti() {
    if (!confettiCanvas || !stage) return;
    const r = stage.getBoundingClientRect();
    confettiCanvas.width = Math.max(1, Math.floor(r.width * window.devicePixelRatio));
    confettiCanvas.height = Math.max(1, Math.floor(r.height * window.devicePixelRatio));
    confettiCanvas.style.width = `${r.width}px`;
    confettiCanvas.style.height = `${r.height}px`;
  }

  window.addEventListener("resize", resizeConfetti);
  resizeConfetti();

  function heartPath(ctx, x, y, size) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.rect(-s / 2, -s / 2, s, s);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-s / 2, 0, s / 2, 0, Math.PI * 2);
    ctx.arc(0, -s / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function burstConfetti() {
    if (!confettiCanvas || !confettiCtx) return;
    resizeConfetti();

    const dpr = window.devicePixelRatio || 1;
    const w = confettiCanvas.width;
    const h = confettiCanvas.height;

    const pieces = [];
    const count = 90;

    for (let i = 0; i < count; i += 1) {
      pieces.push({
        x: w / 2 + rand(-40, 40) * dpr,
        y: h / 2 + rand(-10, 10) * dpr,
        vx: rand(-3.2, 3.2) * dpr,
        vy: rand(-6.2, -2.8) * dpr,
        g: rand(0.12, 0.22) * dpr,
        size: rand(6, 13) * dpr,
        rot: rand(0, Math.PI),
        vr: rand(-0.18, 0.18),
        alpha: 1,
        color: Math.random() > 0.5 ? "rgba(255, 0, 0, 0.75)" : "rgba(255, 192, 203, 0.85)",
      });
    }

    let start = null;
    const duration = 1400;

    function frame(ts) {
      if (!start) start = ts;
      const t = ts - start;

      confettiCtx.clearRect(0, 0, w, h);

      pieces.forEach((p) => {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.alpha = Math.max(0, 1 - t / duration);

        confettiCtx.save();
        confettiCtx.globalAlpha = p.alpha;
        confettiCtx.fillStyle = p.color;
        // Slight flutter
        const flutter = 0.6 + 0.4 * Math.sin((t / 90) + p.rot);
        heartPath(confettiCtx, p.x, p.y, p.size * flutter);
        confettiCtx.restore();
      });

      if (t < duration) {
        requestAnimationFrame(frame);
      } else {
        confettiCtx.clearRect(0, 0, w, h);
      }
    }

    requestAnimationFrame(frame);
  }

  if (yesBtn) {
    yesBtn.addEventListener("click", () => {
      setValentineMessage("YES?! 🥰 Approved! Reward unlocked: unlimited hugs + one extra dessert.");
      burstConfetti();

      // Gentle scroll hint: bring the Love Meter into view after yes
      const loveMeter = $("#loveMeter");
      loveMeter?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ---------- Love Meter (randomized but high) ----------
  const loveForm = $("#loveForm");
  const nameA = $("#nameA");
  const nameB = $("#nameB");
  const loveResult = $("#loveResult");
  const meterFill = $("#meterFill");
  const meterNumber = $("#meterNumber");

  const loveComments = [
    "Soulmates or pizza lovers? Either way: yes.",
    "Warning: intense giggles detected.",
    "Your vibe is giving: matching hoodies.",
    "Even the universe shipped this.",
    "This is scientifically proven by… my heart.",
  ];

  function stableSeedFromNames(a, b) {
    const s = `${a}`.trim().toLowerCase() + "|" + `${b}`.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < s.length; i += 1) {
      hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  function highScoreFromSeed(seed) {
    // 82..100, skewed high
    const base = 82;
    const span = 19;
    const v = (seed % 1000) / 1000;
    const skew = 1 - Math.pow(1 - v, 2.4);
    return Math.round(base + span * skew);
  }

  function setLoveResult(msg) {
    if (!loveResult) return;
    loveResult.textContent = msg;
  }

  function setMeter(pct) {
    if (!meterFill) return;
    meterFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function animateNumber(toPct) {
    if (!meterNumber) return;
    const from = Number.parseInt(meterNumber.textContent || "0", 10) || 0;
    const to = clamp(toPct, 0, 100);
    const duration = 900;
    let start = null;

    function frame(ts) {
      if (!start) start = ts;
      const t = ts - start;
      const p = clamp(t / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(from + (to - from) * eased);
      meterNumber.textContent = `${val}%`;
      if (p < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if (loveForm) {
    loveForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const a = (nameA?.value || "").trim();
      const b = (nameB?.value || "").trim();
      if (!a || !b) return;

      const seed = stableSeedFromNames(a, b);
      const score = highScoreFromSeed(seed);
      const comment = loveComments[seed % loveComments.length];

      setMeter(score);
      animateNumber(score);
      setLoveResult(`${score}% — ${a} + ${b}. ${comment}`);
    });
  }

  // ---------- Reasons Why generator ----------
  const reasonBtn = $("#reasonBtn");
  const reasonAuto = $("#reasonAuto");
  const reasonResult = $("#reasonResult");

  const reasons = [
    "You make even boring days feel like a rom-com montage.",
    "Your laugh is my favorite notification.",
    "You’re cute AND you share snacks. That’s elite behavior.",
    "You understand my weird references. That’s true love.",
    "You’re basically sunshine with better fashion.",
    "Because you’re my safe place… and my favorite adventure.",
    "You’re the reason my heart does little happy somersaults.",
    "You’re adorable. Also: you exist. Strong argument.",
  ];

  function setReason(msg) {
    if (!reasonResult) return;
    reasonResult.textContent = msg;
  }

  function typewrite(el, text) {
    if (!el) return;
    el.classList.add("is-typing");
    el.textContent = "";

    const chars = [...text];
    let i = 0;

    const tick = () => {
      const slice = chars.slice(0, i + 1).join("");
      el.textContent = slice;
      i += 1;
      if (i < chars.length) {
        window.setTimeout(tick, rand(14, 22));
      } else {
        window.setTimeout(() => el.classList.remove("is-typing"), 250);
      }
    };

    tick();
  }

  function showRandomReason() {
    if (!reasonResult) return;
    const idx = Math.floor(Math.random() * reasons.length);
    typewrite(reasonResult, reasons[idx]);
  }

  let autoTimer = null;
  function toggleAutoReasons() {
    if (!reasonAuto) return;
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
      reasonAuto.classList.remove("chip--active");
      reasonAuto.textContent = "Auto";
      return;
    }

    showRandomReason();
    autoTimer = window.setInterval(showRandomReason, 2400);
    reasonAuto.classList.add("chip--active");
    reasonAuto.textContent = "Stop";
  }

  if (reasonBtn) {
    reasonBtn.addEventListener("click", () => {
      showRandomReason();
    });
  }

  if (reasonAuto) {
    reasonAuto.addEventListener("click", toggleAutoReasons);
  }

  // ---------- Love Quiz (5 questions) ----------
  const quizRoot = $("#quizRoot");

  const quiz = [
    {
      q: "Pick our perfect date:",
      choices: ["Fancy dinner", "Cozy movies + snacks", "Arcade battle", "Beach walk"],
      a: 1,
    },
    {
      q: "Our relationship vibe is mostly:",
      choices: ["Chaotic cute", "Calm and cozy", "Sassy besties", "Soft and romantic"],
      a: 0,
    },
    {
      q: "If we were a snack, we’d be:",
      choices: ["Strawberries", "Popcorn", "Chocolate", "Spicy chips"],
      a: 2,
    },
    {
      q: "The most accurate love language here:",
      choices: ["Quality time", "Words of affirmation", "Acts of service", "All of the above"],
      a: 3,
    },
    {
      q: "Our superpower as a couple:",
      choices: ["Perfect timing", "Infinite patience", "Teleporting to food", "Turning moments into memories"],
      a: 3,
    },
  ];

  const rewards = [
    "Reward: You get 1 (one) dramatic forehead kiss.",
    "Reward: I will share the last bite. Yes, the LAST bite.",
    "Reward: You may request a custom love song (bad singing included).",
    "Reward: VIP pass to unlimited hugs today.",
  ];

  function renderQuiz() {
    if (!quizRoot) return;

    let index = 0;
    let score = 0;

    const quizTop = document.createElement("div");
    quizTop.className = "quizTop";

    const progress = document.createElement("div");
    progress.className = "progress";

    const bar = document.createElement("div");
    bar.className = "bar";
    const barFill = document.createElement("div");
    barFill.className = "bar__fill";
    bar.appendChild(barFill);

    const feedback = document.createElement("div");

    quizRoot.innerHTML = "";

    function draw() {
      quizRoot.innerHTML = "";
      progress.textContent = index < quiz.length
        ? `Question ${index + 1} / ${quiz.length}`
        : `Finished!`;

      const pctDone = Math.round((clamp(index, 0, quiz.length) / quiz.length) * 100);
      barFill.style.width = `${pctDone}%`;

      if (index >= quiz.length) {
        const hero = document.createElement("div");
        hero.className = "quizHero";

        const result = document.createElement("div");
        result.className = "result";

        const pct = Math.round((score / quiz.length) * 100);
        const reward = rewards[Math.min(rewards.length - 1, Math.floor(pct / 25))];

        let vibe = "Cute and convincing.";
        if (pct === 100) vibe = "PERFECT SCORE. Are you… telepathic?";
        else if (pct >= 80) vibe = "Elite couple energy.";
        else if (pct >= 60) vibe = "Pretty good! Warm and wholesome.";
        else vibe = "Still adorable. Retake for extra kisses.";

        result.textContent = `Final Score: ${score}/${quiz.length} (${pct}%). ${vibe} ${reward}`;
        hero.appendChild(result);

        const restart = document.createElement("button");
        restart.className = "btn";
        restart.type = "button";
        restart.textContent = "Play again";
        restart.addEventListener("click", () => {
          index = 0;
          score = 0;
          draw();
        });

        quizTop.appendChild(progress);
        quizTop.appendChild(bar);
        quizRoot.appendChild(quizTop);
        quizRoot.appendChild(hero);
        quizRoot.appendChild(restart);

        if (pct === 100) {
          // Small celebration using existing confetti
          burstConfetti();
        }
        return;
      }

      const q = quiz[index];

      const qEl = document.createElement("div");
      qEl.className = "question";
      qEl.textContent = q.q;

      const choices = document.createElement("div");
      choices.className = "choices";

      feedback.className = "pill";
      feedback.textContent = "Pick one to lock in your answer";

      q.choices.forEach((label, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice";
        btn.textContent = label;
        btn.addEventListener("click", () => {
          const correct = i === q.a;
          if (correct) score += 1;

          feedback.className = correct ? "pill pill--good" : "pill pill--bad";
          feedback.textContent = correct ? "Correct! +1 love point" : "Oops! Cute guess though";

          // Disable all, then advance
          [...choices.querySelectorAll("button")].forEach((b) => {
            b.disabled = true;
          });

          btn.style.background = correct
            ? "rgba(43, 182, 115, 0.22)"
            : "rgba(255, 0, 0, 0.14)";

          window.setTimeout(() => {
            index += 1;
            draw();
          }, 520);
        });
        choices.appendChild(btn);
      });

      quizTop.appendChild(progress);
      quizTop.appendChild(bar);
      quizRoot.appendChild(quizTop);
      quizRoot.appendChild(feedback);
      quizRoot.appendChild(qEl);
      quizRoot.appendChild(choices);

      const scoreEl = document.createElement("div");
      scoreEl.className = "muted";
      scoreEl.style.marginTop = "10px";
      scoreEl.textContent = `Score so far: ${score}`;
      quizRoot.appendChild(scoreEl);
    }

    draw();
  }

  renderQuiz();

  // ---------- Virtual bouquet (plant flowers) ----------
  const garden = $("#garden");
  const clearGardenBtn = $("#clearGarden");
  const chips = $$('button[data-flower]');
  let flowerType = "classic";

  function setFlowerType(next) {
    flowerType = next;
    chips.forEach((c) => c.classList.toggle("chip--active", c.dataset.flower === next));
  }

  chips.forEach((c) => {
    c.addEventListener("click", () => {
      const next = c.dataset.flower || "classic";
      setFlowerType(next);
    });
  });

  if (clearGardenBtn) {
    clearGardenBtn.addEventListener("click", () => {
      if (!garden) return;
      garden.innerHTML = "";
    });
  }

  function popSparkle(x, y) {
    if (!garden) return;
    const s = document.createElement("div");
    s.className = "sparkle";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    garden.appendChild(s);
    window.setTimeout(() => s.remove(), 800);
  }

  function plantFlower(clientX, clientY) {
    if (!garden) return;

    const r = garden.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;

    const flower = document.createElement("div");
    flower.className = `flower flower--${flowerType}`;
    flower.style.left = `${x}px`;
    flower.style.top = `${y}px`;

    const stem = document.createElement("div");
    stem.className = "stem";

    const head = document.createElement("div");
    head.className = "head";

    // Tiny variation
    const scale = rand(0.85, 1.25);
    flower.style.transform = `translate(-50%, -50%) scale(${scale * 0.2})`;

    // Accent the head color a bit per type
    if (flowerType === "tulip") {
      head.style.filter = "hue-rotate(-12deg)";
    }
    if (flowerType === "daisy") {
      head.style.filter = "hue-rotate(10deg)";
    }
    if (flowerType === "rose") {
      head.style.filter = "saturate(1.2)";
    }

    flower.appendChild(stem);
    flower.appendChild(head);

    garden.appendChild(flower);

    popSparkle(x, y);

    // Remove older flowers to keep DOM light
    const maxFlowers = 45;
    const flowers = garden.querySelectorAll(".flower");
    if (flowers.length > maxFlowers) {
      flowers[0]?.remove();
    }
  }

  if (garden) {
    garden.addEventListener("click", (e) => {
      plantFlower(e.clientX, e.clientY);
    });

    garden.addEventListener("touchstart", (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      plantFlower(t.clientX, t.clientY);
    }, { passive: true });
  }

  // Clean up interval if tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.clearInterval(heartInterval);
      heartInterval = null;
    } else {
      if (!heartInterval) {
        heartInterval = window.setInterval(spawnHeart, 380);
      }
    }
  });

  // ---------- Scrollspy for nav highlight ----------
  const navLinks = $$(".nav__links a");
  const sections = navLinks
    .map((a) => $(a.getAttribute("href")))
    .filter(Boolean);

  if (navLinks.length && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!visible) return;
        const id = `#${visible.target.id}`;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0.1, 0.2, 0.35] }
    );
    sections.forEach((s) => spy.observe(s));
  }

  // ---------- Love letter modal ----------
  const letterBtn = $("#letterBtn");
  const letterModal = $("#letterModal");
  const letterText = $("#letterText");
  const newLetter = $("#newLetter");
  const copyLetter = $("#copyLetter");

  const letters = [
    "Roses are red, but you’re my favorite color. Thanks for being my calm, my chaos, and my cozy little home.",
    "If love had a sound, it would be your laugh. If it had a place, it would be right next to you.",
    "I like you more than snacks… and that’s the highest compliment I can legally offer.",
    "Every day with you feels like the good part of a song. Let’s keep hitting repeat.",
    "Official notice: you are cute, loved, and absolutely not allowed to doubt it.",
  ];

  function setModal(open) {
    if (!letterModal) return;
    letterModal.classList.toggle("is-open", open);
    letterModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function randomLetter() {
    if (!letterText) return;
    const idx = Math.floor(Math.random() * letters.length);
    typewrite(letterText, letters[idx]);
  }

  if (letterBtn) {
    letterBtn.addEventListener("click", () => {
      setModal(true);
      randomLetter();
    });
  }

  if (letterModal) {
    letterModal.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.dataset.close === "true") setModal(false);
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setModal(false);
  });

  if (newLetter) {
    newLetter.addEventListener("click", randomLetter);
  }

  if (copyLetter) {
    copyLetter.addEventListener("click", async () => {
      if (!letterText) return;
      const text = letterText.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        if (copyLetter) copyLetter.textContent = "Copied!";
        window.setTimeout(() => {
          if (copyLetter) copyLetter.textContent = "Copy";
        }, 900);
      } catch {
        // Clipboard can fail depending on browser permissions.
      }
    });
  }
})();
