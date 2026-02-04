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
