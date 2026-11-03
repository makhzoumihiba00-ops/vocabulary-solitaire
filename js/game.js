/* ============================================================
 * Vocabulary Solitaire — game.js
 * Centralised game state, responsive board layout, pointer
 * drag-and-drop + tap-to-place, scoring, undo, hints, pause,
 * fullscreen, persistence and the victory flow.
 * ============================================================ */
"use strict";

(function () {

  /* ---------- constants & elements ---------- */
  let CATS = CATEGORIES;
  let CAT_INDEX = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
  const SUITS = ["♠", "♥", "♦", "♣"];

  const boardEl = document.getElementById("board");
  const coachEl = document.getElementById("coach");
  const els = {
    score: document.getElementById("hudScore"),
    time: document.getElementById("hudTime"),
    progress: document.getElementById("hudProgress"),
    comboWrap: document.getElementById("hudComboWrap"),
    combo: document.getElementById("hudCombo"),
    btnNew: document.getElementById("btnNew"),
    btnRestart: document.getElementById("btnRestart"),
    btnUndo: document.getElementById("btnUndo"),
    btnHint: document.getElementById("btnHint"),
    btnSkip: document.getElementById("btnSkip"),
    btnSound: document.getElementById("btnSound"),
    btnPause: document.getElementById("btnPause"),
    btnFull: document.getElementById("btnFull"),
    deckOv: document.getElementById("deckOverlay"),
    deckChoices: document.getElementById("deckChoices"),
    currentDeckName: document.getElementById("currentDeckName"),
    levelIndicator: document.getElementById("levelIndicator"),
    winOv: document.getElementById("winOverlay"),
    confetti: document.getElementById("confetti"),
    winScore: document.getElementById("winScore"),
    winAcc: document.getElementById("winAcc"),
    winTime: document.getElementById("winTime"),
    winBest: document.getElementById("winBest"),
    winStars: document.getElementById("winStars"),
    winNewBest: document.getElementById("winNewBest"),
    winMessage: document.getElementById("winMessage"),
    btnNextLevel: document.getElementById("btnNextLevel")
  };

  let allCards = buildCards();
  let byId = new Map(allCards.map(c => [c.id, c]));
  const catCards = {};   // catId -> { root, countEl }
  const zoneEls = [];    // per-category tap zones
  let slotDeck, slotWaste, deckZone;

  /* ---------- persistent settings ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("vocabSolitaire." + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("vocabSolitaire." + k, v); } catch (e) { /* ignore */ } }
  };
  function bestGet() { try { return JSON.parse(store.get("best", "null")); } catch (e) { return null; } }

  /* ---------- game state ---------- */
  const S = {
    deck: [],           // ids left to draw (top = last)
    initialDeck: [],    // restart keeps this order
    current: null,      // revealed word card id
    piles: {},          // catId -> [ids]
    history: [],        // undo entries
    score: 0, combo: 0, correct: 0, wrong: 0, elapsed: 0,
    paused: false, over: false, started: false, busy: false,
    selected: false, drag: null, pendingDraw: false, timerId: null,
    L: null             // layout geometry
  };
  CATS.forEach(c => { S.piles[c.id] = []; });

  /* ---------- small helpers ---------- */
  const div = (cls, parent) => { const d = document.createElement("div"); if (cls) d.className = cls; (parent || boardEl).appendChild(d); return d; };
  const cardEl = id => byId.get(id).el;
  const setPos = (el, x, y) => { el.style.left = x + "px"; el.style.top = y + "px"; };
  const placedCount = () => CATS.reduce((n, c) => n + S.piles[c.id].length, 0);
  const fmtTime = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

  /* ============================================================
   * Responsive layout — solve card size from width AND height so
   * six columns always fit in one row and full piles never clip.
   * ============================================================ */
  function layout() {
    const bw = boardEl.clientWidth, bh = boardEl.clientHeight;
    const RATIO = 1.45;    // card height / width
    const GAP = 0.28;      // wide, clear spacing between category columns
    const OFF = 0.12;      // compact stack offset keeps six cards on screen
    const VG = 0.25;       // vertical gap between deck row and columns / card height
    const PAD = 18;

    let w = Math.min(
      (bw - 2 * PAD) / (6 + 5 * GAP),
      (bh - 2 * PAD) / ((3 + VG + 5 * OFF) * RATIO)
    );
    w = Math.max(w, 34);

    const h = w * RATIO, gap = w * GAP, off = h * OFF, vg = h * VG;
    const gridW = 6 * w + 5 * gap;
    const padX = Math.max((bw - gridW) / 2, 8);
    const contentH = h + vg + h + 5 * off + h;
    const topY = Math.max(10, (bh - contentH) / 2);

    S.L = {
      bw, bh, w, h, gap, off, vg, topY, padX,
      deck: { x: padX, y: topY },
      waste: { x: padX + w + gap, y: topY },
      catY: topY + h + vg,
      colX: i => padX + i * (w + gap)
    };
    const root = document.documentElement.style;
    root.setProperty("--card-w", w + "px");
    root.setProperty("--card-h", h + "px");
    root.setProperty("--stack-off", off + "px");
  }

  function positionChrome() {
    const L = S.L;
    setPos(slotDeck, L.deck.x, L.deck.y);
    setPos(slotWaste, L.waste.x, L.waste.y);
    CATS.forEach((c, i) => {
      const z = zoneEls[i];
      z.style.left = (L.colX(i) - L.gap * 0.25) + "px";
      z.style.top = (L.catY - 6) + "px";
      z.style.width = (L.w + L.gap * 0.5) + "px";
      z.style.height = Math.max(10, L.bh - (L.catY - 6) - 4) + "px";
    });
    setPos(deckZone, L.deck.x, L.deck.y);
    deckZone.style.width = L.w + "px";
    deckZone.style.height = L.h + "px";
    const cx = L.waste.x + L.w + L.gap;
    const avail = L.bw - cx - 12;
    coachEl.style.display = avail > 170 ? "" : "none";
    coachEl.style.left = cx + "px";
    coachEl.style.top = (L.topY + L.h * 0.5 - 12) + "px";
    coachEl.style.maxWidth = (avail - 6) + "px";
  }

  function positionAllCards() {
    const L = S.L;
    if (!L) return;
    CATS.forEach((c, i) => {
      const el = catCards[c.id].root;
      setPos(el, L.colX(i), L.catY);
      el.style.width = L.w + "px";
      el.style.height = L.h + "px";
      el.style.zIndex = 95;
    });
    S.deck.forEach((id, i) => {
      const el = cardEl(id);
      if (!el) return;
      const above = S.deck.length - 1 - i;      // 0 for the top card
      const d = Math.min(above, 3);
      setPos(el, L.deck.x + d * 0.7, L.deck.y + d * 0.9);
      el.style.zIndex = 10 + i;
    });
    if (S.current) {
      const currentEl = cardEl(S.current);
      currentEl.style.visibility = "visible";
      setPos(currentEl, L.waste.x, L.waste.y);
      cardEl(S.current).style.zIndex = 600;
    }
    CATS.forEach((c, i) => S.piles[c.id].forEach((id, j) => {
      const el = cardEl(id);
      const visualIndex = visualPileIndex(j, S.piles[c.id].length);
      if (visualIndex < 0) {
        el.style.visibility = "hidden";
        return;
      }
      el.style.visibility = "visible";
      setPos(el, L.colX(i), L.catY + L.h + visualIndex * L.off);
      el.style.zIndex = 100 + visualIndex;
    }));
  }

  function visualPileIndex(index, total) {
    if (index < 5) return index;
    if (total > 5 && index === total - 1) return 5;
    return -1;
  }

  function relayout() {
    if (!boardEl.clientWidth) return;
    layout();
    fitVocabularyWords();
    boardEl.classList.add("no-anim");
    positionChrome();
    positionAllCards();
    void boardEl.offsetWidth; // force reflow before re-enabling transitions
    requestAnimationFrame(() => boardEl.classList.remove("no-anim"));
  }

  function fitVocabularyWords() {
    boardEl.querySelectorAll(".word").forEach(wordEl => {
      wordEl.style.fontSize = "";
      const availableWidth = wordEl.clientWidth;
      let fontSize = parseFloat(getComputedStyle(wordEl).fontSize);

      while (wordEl.scrollWidth > availableWidth && fontSize > 7) {
        fontSize -= 0.5;
        wordEl.style.fontSize = fontSize + "px";
      }
    });
  }

  /* ============================================================
   * DOM construction
   * ============================================================ */
  function makeCategoryCard(cat) {
    const el = div("card category-card");
    el.style.setProperty("--cat", cat.color);
    el.innerHTML =
      '<div class="card-w"><div class="card-inner"><div class="face front">' +
      '<svg class="cat-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + (CATEGORY_ICONS[cat.id] || '<circle cx="12" cy="12" r="8"/>') + "</svg>" +
      '<div class="category-visual" aria-hidden="true">' + (CATEGORY_IMAGES[cat.id] || "✨") + "</div>" +
      '<div class="cat-name">' + cat.name + "</div>" +
      '<div class="cat-count">0/10</div>' +
      '<div class="badge"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      "</div></div></div>";
    catCards[cat.id] = { root: el, countEl: el.querySelector(".cat-count") };
  }

  function makeWordCard(c) {
    const el = div("card word-card draggable");
    const suit = SUITS[(c.id.length * 3 + c.word.length) % 4];
    const sizeCls = c.word.length >= 10 ? " xlong" : c.word.length >= 8 ? " long" : "";
    const image = getWordImage(c.word, c.cat);
    el.innerHTML =
      '<div class="card-w"><div class="card-inner">' +
      '<div class="face back"><div class="back-pattern"></div></div>' +
      '<div class="face front"><span class="pip tl">' + suit + '</span><span class="pip br">' + suit + "</span>" +
      '<div class="word-visual" aria-hidden="true">' + image + "</div>" +
      '<div class="word' + sizeCls + '">' + c.word + "</div></div>" +
      "</div></div>";
    c.el = el;
  }

  function buildBoard() {
    boardEl.querySelectorAll(".slot, .zone, .card").forEach(el => el.remove());
    zoneEls.length = 0;
    Object.keys(catCards).forEach(id => delete catCards[id]);
    slotDeck = div("slot");
    slotWaste = div("slot");
    deckZone = div("zone deck-zone");
    deckZone.addEventListener("click", () => {
      Sound.unlock();
      if (!S.current && !S.busy && !S.paused && !S.over && S.deck.length) draw();
    });
    CATS.forEach((cat, i) => {
      const z = div("zone");
      z.dataset.cat = cat.id;
      z.addEventListener("click", onZoneTap);
      zoneEls.push(z);
    });
    CATS.forEach(makeCategoryCard);
    allCards.forEach(makeWordCard);
  }

  /* ============================================================
   * HUD & counters
   * ============================================================ */
  function updateHUD() {
    els.score.textContent = S.score;
    els.progress.textContent = placedCount() + "/60";
    els.comboWrap.hidden = S.combo < 2;
    els.combo.textContent = "×" + S.combo;
    els.btnUndo.disabled = !S.history.length || S.over;
    els.btnSkip.disabled = !S.current || !S.deck.length || S.busy || S.paused || S.over;
  }
  function updateCat(catId) {
    catCards[catId].countEl.textContent = S.piles[catId].length + "/10";
  }
  function floatText(x, y, txt, big) {
    const f = div("float" + (big ? " big" : ""));
    f.textContent = txt;
    f.style.left = x + "px";
    f.style.top = y + "px";
    setTimeout(() => f.remove(), 1000);
  }

  /* ============================================================
   * Timer
   * ============================================================ */
  function startTimer() {
    if (S.timerId) return;
    S.timerId = setInterval(() => {
      if (S.started && !S.paused && !S.over) {
        S.elapsed++;
        els.time.textContent = fmtTime(S.elapsed);
      }
    }, 1000);
  }

  /* ============================================================
   * Drawing cards (deck -> waste with a flip)
   * ============================================================ */
  function draw() {
    if (S.over) return;
    if (S.paused) { S.pendingDraw = true; return; }
    if (S.current || !S.deck.length) return;
    drawCard(S.deck.pop());
  }

  function drawCard(id) {
    S.started = true;
    startTimer();

    S.current = id;
    const el = cardEl(id);
    el.style.visibility = "visible";

    el.classList.remove("moving");
    setPos(el, S.L.deck.x, S.L.deck.y);   // currently face-down on the deck
    el.style.zIndex = 600;
    void el.offsetWidth;                  // settle start position first
    el.classList.add("moving", "faceup"); // fly to the waste slot while flipping
    setPos(el, S.L.waste.x, S.L.waste.y);
    Sound.flip();
    deckZone.classList.toggle("empty", !S.deck.length);
    updateHUD();
  }

  function skipCurrentCard() {
    if (!S.current || S.busy || S.paused || S.over || !S.deck.length) return;

    clearSelection();
    const skippedId = S.current;
    const nextId = S.deck.pop();
    const insertAt = Math.floor(Math.random() * (S.deck.length + 1));
    S.deck.splice(insertAt, 0, skippedId);
    S.current = null;

    const skippedEl = cardEl(skippedId);
    skippedEl.classList.remove("moving", "faceup", "selected", "dragging");
    skippedEl.style.visibility = "hidden";
    deckZone.classList.toggle("empty", !S.deck.length);
    updateHUD();
    drawCard(nextId);
  }

  /* ============================================================
   * Placement
   * ============================================================ */
  function clearSelection() {
    S.selected = false;
    boardEl.classList.remove("card-selected");
    if (S.current) cardEl(S.current).classList.remove("selected");
  }

  function tryPlace(catId) {
    if (!S.current || S.busy || S.paused || S.over) return;
    const c = byId.get(S.current);
    clearSelection();
    if (c.cat === catId) placeCorrect(c);
    else placeWrong(c, catId);
  }

  function placeCorrect(c) {
    const pile = S.piles[c.cat];
    const j = pile.length;
    const col = CAT_INDEX[c.cat];
    const L = S.L;

    S.history.push({ id: c.id, cat: c.cat, score: S.score, combo: S.combo, correct: S.correct });
    pile.push(c.id);
    S.current = null;

    S.combo++;
    S.correct++;
    const pts = 10 + 2 * Math.min(S.combo - 1, 5);
    S.score += pts;

    const el = c.el;
    el.classList.add("moving");
    const visualIndex = visualPileIndex(j, pile.length);
    setPos(el, L.colX(col), L.catY + L.h + visualIndex * L.off);
    el.style.zIndex = 100 + visualIndex;
    positionAllCards();

    Sound.place();
    setTimeout(() => Sound.correct(), 90);
    floatText(L.colX(col) + L.w / 2, L.catY + L.h + j * L.off + L.h * 0.18,
      "+" + pts + (S.combo >= 2 ? "  ×" + S.combo : ""), S.combo >= 3);

    updateCat(c.cat);
    updateHUD();
    coachEl.classList.add("off");

    S.busy = true;
    if (pile.length === 10) completeCategory(c.cat, col);
    const done = CATS.every(x => S.piles[x.id].length === 10);
    setTimeout(() => {
      S.busy = false;
      if (done) win();
      else draw();
    }, 380);
  }

  function placeWrong(c, catId) {
    S.wrong++;
    S.combo = 0;
    updateHUD();
    Sound.wrong();
    const z = zoneEls[CAT_INDEX[catId]];
    z.classList.remove("no"); void z.offsetWidth; z.classList.add("no");
    const el = c.el;
    el.classList.add("moving", "wrong");
    setPos(el, S.L.waste.x, S.L.waste.y);
    el.style.zIndex = 600;
    setTimeout(() => el.classList.remove("wrong"), 460);
  }

  function snapBack(el) {
    el.classList.add("moving");
    setPos(el, S.L.waste.x, S.L.waste.y);
    el.style.zIndex = 600;
    Sound.flip();
  }

  function completeCategory(catId, col) {
    catCards[catId].root.classList.add("done");
    setTimeout(() => Sound.complete(), 160);
    floatText(S.L.colX(col) + S.L.w / 2, S.L.catY + S.L.h * 0.35, "★ " + CATS[col].name + " complete! ★", true);
  }

  /* ============================================================
   * Undo
   * ============================================================ */
  function undo() {
    if (!S.history.length || S.busy || S.over || S.paused) return;
    // If a fresh card was already drawn, tuck it back on top of the deck first.
    if (S.current) {
      const cur = S.current;
      S.current = null;
      clearSelection();
      S.deck.push(cur);
      const el = cardEl(cur);
      el.classList.add("moving");
      el.classList.remove("faceup");
      setPos(el, S.L.deck.x, S.L.deck.y);
      el.style.zIndex = 10 + S.deck.length;
    }
    const h = S.history.pop();
    const pile = S.piles[h.cat];
    pile.pop();
    if (pile.length === 9) catCards[h.cat].root.classList.remove("done");

    S.current = h.id;
    S.score = h.score;
    S.combo = h.combo;
    S.correct = h.correct;

    const el = cardEl(h.id);
    el.style.visibility = "visible";
    el.classList.add("moving");          // stays face-up, returns to the waste slot
    setPos(el, S.L.waste.x, S.L.waste.y);
    el.style.zIndex = 600;

    updateCat(h.cat);
    updateHUD();
    positionAllCards();
    Sound.flip();
  }

  /* ============================================================
   * Hint
   * ============================================================ */
  function hint() {
    if (!S.current || S.busy || S.paused || S.over) return;
    const cat = byId.get(S.current).cat;
    const el = catCards[cat].root;
    el.classList.remove("hint");
    void el.offsetWidth;
    el.classList.add("hint");
    setTimeout(() => el.classList.remove("hint"), 1750);
    Sound.hint();
  }

  /* ============================================================
   * Pointer input — drag & drop plus tap-to-select / tap-to-place
   * ============================================================ */
  function onPointerDown(e) {
    Sound.unlock();
    if (S.paused || S.over || S.busy || !S.current) return;
    if (e.button !== undefined && e.button !== 0) return;
    const el = e.target.closest ? e.target.closest(".card") : null;
    if (!el || el !== cardEl(S.current)) return;
    e.preventDefault();
    S.drag = {
      pid: e.pointerId, el,
      x0: e.clientX, y0: e.clientY,
      left: parseFloat(el.style.left) || 0,
      top: parseFloat(el.style.top) || 0,
      moved: false, t0: performance.now()
    };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    el.classList.add("dragging");
    el.style.zIndex = 1000;
  }

  function onPointerMove(e) {
    const d = S.drag;
    if (!d || e.pointerId !== d.pid) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true;
    if (d.moved) {
      d.el.style.left = (d.left + dx) + "px";
      d.el.style.top = (d.top + dy) + "px";
    }
  }

  function endDrag(e, cancelled) {
    const d = S.drag;
    if (!d || e.pointerId !== d.pid) return;
    S.drag = null;
    d.el.classList.remove("dragging");
    if (!cancelled && !d.moved && performance.now() - d.t0 < 450) {
      d.el.style.zIndex = 600;
      toggleSelect();                       // tap on the word card
      return;
    }
    if (cancelled) { snapBack(d.el); return; }
    const r = d.el.getBoundingClientRect();
    const cat = zoneAt(r.left + r.width / 2, r.top + r.height / 2);
    if (cat) tryPlace(cat);
    else snapBack(d.el);
  }

  function zoneAt(clientX, clientY) {
    const br = boardEl.getBoundingClientRect();
    const x = clientX - br.left, y = clientY - br.top;
    const L = S.L;
    for (let i = 0; i < CATS.length; i++) {
      const x0 = L.colX(i) - L.gap * 0.25, x1 = x0 + L.w + L.gap * 0.5;
      if (x >= x0 && x <= x1 && y >= L.catY - 6) return CATS[i].id;
    }
    return null;
  }

  function toggleSelect() {
    if (!S.current || S.busy || S.paused || S.over) return;
    S.selected = !S.selected;
    cardEl(S.current).classList.toggle("selected", S.selected);
    boardEl.classList.toggle("card-selected", S.selected);
  }

  function onZoneTap(e) {
    Sound.unlock();
    if (S.selected && S.current) tryPlace(e.currentTarget.dataset.cat);
  }

  boardEl.addEventListener("pointerdown", onPointerDown);
  boardEl.addEventListener("pointermove", onPointerMove);
  boardEl.addEventListener("pointerup", e => endDrag(e, false));
  boardEl.addEventListener("pointercancel", e => endDrag(e, true));
  boardEl.addEventListener("contextmenu", e => e.preventDefault());

  /* ============================================================
   * Pause / resume
   * ============================================================ */
  /* ============================================================
   * Victory
   * ============================================================ */
  function starsFor(acc) { return acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : 1; }

  function win() {
    S.over = true;
    S.current = null;
    const attempts = S.correct + S.wrong;
    const acc = attempts ? S.correct / attempts : 1;
    const stars = starsFor(acc);

    Sound.victory();
    boardEl.classList.add("won");
    let k = 0;
    CATS.forEach(cat => S.piles[cat.id].forEach(id => {
      cardEl(id).style.setProperty("--d", (k++ * 0.045).toFixed(3) + "s");
    }));

    els.winScore.textContent = S.score;
    els.winAcc.textContent = Math.round(acc * 100) + "%";
    els.winTime.textContent = fmtTime(S.elapsed);
    const prev = bestGet();
    const isBest = !prev || S.score > prev.score;
    if (isBest) store.set("best", JSON.stringify({ score: S.score, stars, time: S.elapsed }));
    els.winBest.textContent = Math.max(prev ? prev.score : 0, S.score);
    els.winNewBest.hidden = !isBest;

    const starSvg = on =>
      '<svg viewBox="0 0 24 24" class="' + (on ? "on" : "off") + '"><path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z"/></svg>';
    els.winStars.innerHTML = starSvg(stars >= 1) + starSvg(stars >= 2) + starSvg(stars >= 3);

    spawnConfetti();
    updateHUD();
    if (activeLevel < 5) {
      els.winMessage.textContent = "Level " + activeLevel + " complete! All 60 words sorted.";
      els.btnNextLevel.textContent = "Next Level";
      els.btnNextLevel.hidden = false;
      saveDeckLevel(activeDeck.id, activeLevel + 1);
      activeLevel++;
      updateLevelIndicator();
    } else {
      els.winMessage.textContent = "Deck Completed! You mastered all 5 levels.";
      els.btnNextLevel.textContent = "Replay Level 5";
      els.btnNextLevel.hidden = false;
      saveDeckLevel(activeDeck.id, 5);
    }
    setTimeout(() => els.winOv.classList.add("show"), 1100);
  }

  function spawnConfetti() {
    const colors = ["#f5b301", "#e2626b", "#4fae6d", "#2e6fbe", "#8f54c9", "#ffffff"];
    let html = "";
    for (let i = 0; i < 90; i++) {
      const c = colors[i % colors.length];
      html += '<div class="pc" style="left:' + (Math.random() * 100).toFixed(2) + "%;width:" +
        (5 + Math.random() * 5).toFixed(1) + "px;height:" + (8 + Math.random() * 7).toFixed(1) +
        "px;background:" + c + ";animation-duration:" + (2.4 + Math.random() * 1.8).toFixed(2) +
        "s;animation-delay:-" + (Math.random() * 3).toFixed(2) + 's"></div>';
    }
    els.confetti.innerHTML = html;
  }

  /* ============================================================
   * New game / restart
   * ============================================================ */
  let activeDeck = DECKS[0];
  let activeLevel = 1;

  function levelStorageKey(deckId) {
    return "level." + deckId;
  }

  function loadDeckLevel(deckId) {
    const stored = parseInt(store.get(levelStorageKey(deckId), "1"), 10);
    if (Number.isFinite(stored) && stored !== 1) return Math.min(5, Math.max(1, stored));
    try {
      const legacy = parseInt(localStorage.getItem("vocabSolitaire.level." + deckId), 10);
      if (Number.isFinite(legacy)) return Math.min(5, Math.max(1, legacy));
    } catch (e) {}
    return Number.isFinite(stored) ? Math.min(5, Math.max(1, stored)) : 1;
  }

  function saveDeckLevel(deckId, level) {
    store.set(levelStorageKey(deckId), String(level));
  }

  function updateLevelIndicator() {
    els.levelIndicator.textContent = "Level " + activeLevel;
    els.levelIndicator.setAttribute("aria-label", "Current level " + activeLevel);
  }

  function activateCurrentLevel() {
    CATS = categoriesForLevel(activeDeck, activeLevel);
    CAT_INDEX = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
    allCards = buildCards(CATS);
    byId = new Map(allCards.map(c => [c.id, c]));
    S.current = null;
    S.deck = [];
    S.initialDeck = [];
    S.history.length = 0;
    Object.keys(S.piles).forEach(id => delete S.piles[id]);
    CATS.forEach(c => { S.piles[c.id] = []; });
    buildBoard();
  }

  function selectDeck(deck) {
    activeDeck = deck;
    activeLevel = loadDeckLevel(deck.id);
    updateLevelIndicator();
    CATS = categoriesForLevel(deck, activeLevel);
    CAT_INDEX = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
    allCards = buildCards(CATS);
    byId = new Map(allCards.map(c => [c.id, c]));
    S.current = null;
    S.deck = [];
    S.initialDeck = [];
    S.history.length = 0;
    Object.keys(S.piles).forEach(id => delete S.piles[id]);
    CATS.forEach(c => { S.piles[c.id] = []; });
    els.currentDeckName.textContent = deck.name;
    els.deckOv.classList.remove("show");
    els.winOv.classList.remove("show");
    activateCurrentLevel();
    newGame(true);
  }

  function renderDeckChoices() {
    els.deckChoices.innerHTML = DECKS.map(deck =>
      '<article class="deck-card">' +
        '<div class="deck-icon" aria-hidden="true">' + deck.icon + '</div>' +
        '<h3>' + deck.name + '</h3>' +
        '<ul class="deck-categories">' + deck.categories.map(c => '<li>' + c.name + '</li>').join("") + '</ul>' +
        '<div class="deck-total">60 vocabulary words</div>' +
        '<button class="btn play-deck" type="button" data-deck="' + deck.id + '">Play</button>' +
      '</article>'
    ).join("");
  }

  function openDecks() {
    renderDeckChoices();
    els.winOv.classList.remove("show");
    els.deckOv.classList.add("show");
  }

  function newGame(fresh) {
    S.over = false;
    S.busy = false;
    S.pendingDraw = false;
    S.drag = null;
    S.score = 0; S.combo = 0; S.correct = 0; S.wrong = 0; S.elapsed = 0;
    S.started = false; S.selected = false; S.current = null;
    S.paused = false;
    S.history.length = 0;
    CATS.forEach(c => { S.piles[c.id].length = 0; });

    if (fresh || !S.initialDeck.length) {
      S.initialDeck = allCards.map(c => c.id);
      for (let i = 0; i < activeLevel; i++) S.initialDeck = shuffled(S.initialDeck);
    }
    S.deck = S.initialDeck.slice();

    els.winOv.classList.remove("show");
    els.confetti.innerHTML = "";
    boardEl.classList.remove("won");
    boardEl.classList.remove("paused");
    els.btnPause.classList.remove("is-paused");
    els.btnPause.setAttribute("aria-pressed", "false");
    els.btnPause.title = "Pause game";
    els.btnPause.querySelector("span").textContent = "Pause";

    boardEl.classList.add("no-anim");
    allCards.forEach(c => {
      const el = c.el;
      el.style.visibility = "visible";
      el.classList.remove("faceup", "selected", "wrong", "moving");
      el.style.removeProperty("--d");
    });
    CATS.forEach(c => catCards[c.id].root.classList.remove("done", "hint"));
    layout();
    positionChrome();
    positionAllCards();
    allCards.forEach(c => {
      if (!c.el.style.left && !c.el.style.top) {
        setPos(c.el, S.L.deck.x, S.L.deck.y);
      }
    });
    void boardEl.offsetWidth;
    requestAnimationFrame(() => boardEl.classList.remove("no-anim"));

    CATS.forEach(c => updateCat(c.id));
    els.time.textContent = "00:00";
    coachEl.classList.remove("off");
    deckZone.classList.remove("empty");
    updateHUD();
    setTimeout(() => { if (!S.over) draw(); }, 500);
  }

  /* ============================================================
   * Toolbar wiring
   * ============================================================ */
  els.btnNew.addEventListener("click", () => {
    Sound.unlock(); Sound.click();
    const started = S.started && !S.over && (S.correct + S.wrong > 0 || S.history.length > 0);
    if (started && !window.confirm("Discard this unfinished game and choose another deck?")) return;
    openDecks();
  });
  els.deckChoices.addEventListener("click", e => {
    const button = e.target.closest("[data-deck]");
    if (!button) return;
    selectDeck(DECKS.find(d => d.id === button.dataset.deck) || activeDeck);
  });
  document.getElementById("btnCloseDecks").addEventListener("click", () => els.deckOv.classList.remove("show"));
  document.getElementById("btnChooseAnother").addEventListener("click", openDecks);
  document.getElementById("btnAgain").addEventListener("click", () => { Sound.click(); newGame(true); });
  els.btnNextLevel.addEventListener("click", () => {
    Sound.click();
    els.winOv.classList.remove("show");
    activateCurrentLevel();
    newGame(true);
  });
  els.btnRestart.addEventListener("click", () => { Sound.unlock(); Sound.click(); newGame(false); });
  els.btnUndo.addEventListener("click", () => { Sound.unlock(); undo(); });
  els.btnHint.addEventListener("click", () => { Sound.unlock(); hint(); });
  els.btnSkip.addEventListener("click", () => { Sound.unlock(); Sound.click(); skipCurrentCard(); });

  els.btnPause.addEventListener("click", () => {
    Sound.unlock(); Sound.click();
    S.paused = !S.paused;
    els.btnPause.classList.toggle("is-paused", S.paused);
    els.btnPause.setAttribute("aria-pressed", String(S.paused));
    els.btnPause.title = S.paused ? "Resume game" : "Pause game";
    els.btnPause.querySelector("span").textContent = S.paused ? "Resume" : "Pause";
    boardEl.classList.toggle("paused", S.paused);
    if (!S.paused && S.pendingDraw) { S.pendingDraw = false; draw(); }
  });

  els.btnSound.addEventListener("click", () => {
    const m = !Sound.isMuted();
    Sound.setMuted(m);
    if (!m) { Sound.unlock(); Sound.click(); }
    els.btnSound.classList.toggle("is-muted", m);
    els.btnSound.setAttribute("aria-pressed", String(m));
  });

  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
  els.btnFull.addEventListener("click", () => {
    Sound.unlock(); Sound.click();
    try {
      if (!fsElement()) {
        const de = document.documentElement;
        (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      }
    } catch (e) { /* ignore */ }
  });

  function syncSoundButton() {
    els.btnSound.classList.toggle("is-muted", Sound.isMuted());
  }

  /* ============================================================
   * Global listeners
   * ============================================================ */
  let rzId = 0, rzT = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(rzId);
    rzId = requestAnimationFrame(relayout);
    clearTimeout(rzT);             // catch animated/late viewport changes
    rzT = setTimeout(relayout, 260);
  });
  window.addEventListener("orientationchange", () => setTimeout(relayout, 160));
  ["fullscreenchange", "webkitfullscreenchange"].forEach(ev =>
    document.addEventListener(ev, () => {
      els.btnFull.classList.toggle("is-full", !!fsElement());
      setTimeout(relayout, 90);
    })
  );
  /* Debug/testing API (also used by QA). */
  window.VS = {
    state: S, newGame, restart: () => newGame(false), draw, undo, hint, tryPlace, relayout,
    validate: validateContent,
    autoplay() {
      return new Promise(resolve => {
        (function step() {
          if (S.over) return resolve(true);
          if (!S.current) {
            if (S.deck.length) { draw(); return setTimeout(step, 460); }
            return resolve(true);
          }
          tryPlace(byId.get(S.current).cat);
          setTimeout(step, 440);
        })();
      });
    }
  };

  /* ---------- boot ---------- */
  const check = validateContent();
  if (!check.ok) console.warn("Vocabulary content issues:", check.issues);
  else console.info("Vocabulary Solitaire: " + check.total + " words in " + check.categories + " categories loaded.");

  syncSoundButton();
  activeLevel = loadDeckLevel(activeDeck.id);
  activateCurrentLevel();
  relayout();
  updateLevelIndicator();
  els.currentDeckName.textContent = activeDeck.name;
  newGame(true);

})();
