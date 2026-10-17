/* ==========================================
   NHOVA — Jeux pour Elisa
   Tout se joue d'un seul appui : pas de
   glisser, pas de lecture, consignes à voix haute.

   Jeux : puzzle, paires, bulles, musique,
   suite (à répéter), écoute, le différent,
   coloriage.
========================================== */

"use strict";

const NhovaGames = (() => {

    const $ = id => document.getElementById(id);

    const overlay   = $("gameOverlay");
    const menu      = $("gameMenu");
    const wrap      = $("gameBoardWrap");
    const board     = $("gameBoard");
    const bottom    = $("gameBottom");
    const hintBtn   = $("gameHint");
    const homeBtn   = $("gameHome");
    const menuBtn   = $("gameMenuBtn");
    const newBtn    = $("gameNew");
    const celebrate = $("gameCelebrate");

    let isOpen = false;
    let current = null;
    let speed = 1;                       // sert aux tests : réduit les attentes

    const say = (text) => { if (window.nhovaSay) window.nhovaSay(text); };
    const rand = n => Math.floor(Math.random() * n);

    /* ---------- Minuteries : tout est nettoyé en changeant d'écran ---------- */

    let timers = [];
    let bubbleTimer = null;

    const later = (fn, ms) => {
        const t = setTimeout(fn, ms * speed);
        timers.push(t);
        return t;
    };

    function clearTimers() {
        timers.forEach(clearTimeout);
        timers = [];
        if (bubbleTimer) { clearInterval(bubbleTimer); bubbleTimer = null; }
    }

    function resetBoard() {
        clearTimers();
        board.className = "board";
        board.removeAttribute("style");
        board.onclick = null;
        board.innerHTML = "";
        celebrate.hidden = true;
        newBtn.classList.remove("pulse");
    }

    // Quels boutons montrer selon le jeu
    function layout(opts) {
        menu.hidden = true;
        wrap.hidden = false;
        bottom.hidden = false;
        hintBtn.hidden = !opts.hint;
        hintBtn.textContent = opts.hintIcon || "💡";
        newBtn.hidden = opts.nw === false;
        hintBtn.onclick = null;
    }

    /* ---------- Sons ---------- */

    let actx = null;

    function tone(freq, dur, type, vol) {
        try {
            actx = actx || new (window.AudioContext || window.webkitAudioContext)();
            if (actx.state === "suspended") actx.resume();

            const osc = actx.createOscillator();
            const gain = actx.createGain();
            const d = dur || 0.4;

            osc.type = type || "triangle";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol || 0.2, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d);
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start();
            osc.stop(actx.currentTime + d);
        } catch (e) { /* pas de son : le jeu continue */ }
    }

    const okSound  = () => { tone(660, 0.12); setTimeout(() => tone(880, 0.18), 120); };
    const badSound = () => tone(150, 0.35, "sawtooth", 0.12);

    function cheer() {
        tone(523, 0.15); setTimeout(() => tone(659, 0.15), 150); setTimeout(() => tone(784, 0.3), 300);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]);

        celebrate.hidden = false;
        celebrate.style.animation = "none";
        void celebrate.offsetWidth;
        celebrate.style.animation = "";
        later(() => { celebrate.hidden = true; }, 2500);
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = rand(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function sizeBoard(cols, rows, gap) {
        board.style.display = "grid";
        board.style.gap = (gap || 4) + "px";
        board.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
        board.style.gridTemplateRows = "repeat(" + rows + ", 1fr)";
        board.style.aspectRatio = cols + " / " + rows;
        board.style.width = "min(94vw, " + (58 * cols / rows).toFixed(1) + "dvh)";
    }


    /* ---------- Écrans ---------- */

    function showMenu() {
        current = null;
        resetBoard();
        menu.hidden = false;
        wrap.hidden = true;
        bottom.hidden = true;
        hintBtn.hidden = true;
        say("Choisis un jeu.");
    }

    const STARTERS = {};

    function open(game) {
        isOpen = true;
        overlay.classList.add("visible");

        if (STARTERS[game]) STARTERS[game]();
        else showMenu();
    }

    function close() {
        isOpen = false;
        current = null;
        resetBoard();
        overlay.classList.remove("visible");
        if (typeof stopSpeaking === "function") stopSpeaking();
        if (typeof setState === "function") setState("idle");
    }


    /* ==========================================
       PUZZLE : on touche une pièce, puis une autre,
       elles échangent leur place.
    ========================================== */

    const HEAD = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300' preserveAspectRatio='none'>";

    const SCENES = [

        // Montagne et randonnée
        HEAD +
        "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3a8dde'/><stop offset='1' stop-color='#ffd9a0'/></linearGradient></defs>" +
        "<rect width='300' height='300' fill='url(#g)'/>" +
        "<circle cx='240' cy='55' r='26' fill='#fff2a8'/>" +
        "<polygon points='0,200 75,80 140,190 195,105 300,205 300,300 0,300' fill='#6d7fa6'/>" +
        "<polygon points='75,80 58,112 74,106 88,114' fill='#fff'/>" +
        "<polygon points='195,105 178,134 194,127 208,137' fill='#fff'/>" +
        "<polygon points='0,245 95,185 185,245 265,195 300,222 300,300 0,300' fill='#3f9a5f'/>" +
        "<path d='M150 300 C160 270 120 262 140 240 C150 228 170 232 175 222' stroke='#e9d8a6' stroke-width='9' fill='none'/>" +
        "<circle cx='176' cy='212' r='8' fill='#f4a261'/><rect x='170' y='220' width='12' height='20' rx='4' fill='#e63946'/>" +
        "<polygon points='40,285 55,235 70,285' fill='#2b7a4b'/><polygon points='235,290 250,240 265,290' fill='#2b7a4b'/></svg>",

        // Plage
        HEAD +
        "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#7ad7ff'/><stop offset='1' stop-color='#fff1c1'/></linearGradient></defs>" +
        "<rect width='300' height='300' fill='url(#g)'/>" +
        "<circle cx='70' cy='70' r='32' fill='#ffd23f'/>" +
        "<rect y='150' width='300' height='80' fill='#1e90c8'/>" +
        "<path d='M0 170 Q25 160 50 170 T100 170 T150 170 T200 170 T250 170 T300 170' stroke='#fff' stroke-width='4' fill='none'/>" +
        "<path d='M0 205 Q25 195 50 205 T100 205 T150 205 T200 205 T250 205 T300 205' stroke='#bfe9ff' stroke-width='4' fill='none'/>" +
        "<path d='M0 225 Q150 200 300 230 L300 300 L0 300 Z' fill='#f2d49b'/>" +
        "<polygon points='150,128 190,128 178,160 162,160' fill='#fff'/><rect x='168' y='118' width='4' height='40' fill='#6b4f2a'/>" +
        "<path d='M190 235 A55 55 0 0 1 300 235 Z' fill='#e63946'/><path d='M227 235 A18 55 0 0 1 263 235 Z' fill='#fff'/>" +
        "<rect x='243' y='185' width='5' height='95' fill='#6b4f2a'/><circle cx='60' cy='260' r='14' fill='#ff9ecb'/></svg>",

        // Foire et grande roue
        HEAD +
        "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2b1055'/><stop offset='1' stop-color='#ff7e5f'/></linearGradient></defs>" +
        "<rect width='300' height='300' fill='url(#g)'/>" +
        "<rect y='250' width='300' height='50' fill='#2d2a4a'/>" +
        "<circle cx='30' cy='30' r='3' fill='#fff'/><circle cx='110' cy='20' r='2' fill='#fff'/><circle cx='260' cy='35' r='3' fill='#fff'/>" +
        "<line x1='150' y1='130' x2='110' y2='250' stroke='#fff' stroke-width='5'/><line x1='150' y1='130' x2='190' y2='250' stroke='#fff' stroke-width='5'/>" +
        "<circle cx='150' cy='130' r='85' stroke='#fff' stroke-width='4' fill='none'/>" +
        "<line x1='150' y1='45' x2='150' y2='215' stroke='#fff' stroke-width='3'/><line x1='65' y1='130' x2='235' y2='130' stroke='#fff' stroke-width='3'/>" +
        "<line x1='90' y1='70' x2='210' y2='190' stroke='#fff' stroke-width='3'/><line x1='210' y1='70' x2='90' y2='190' stroke='#fff' stroke-width='3'/>" +
        "<circle cx='235' cy='130' r='10' fill='#ffd23f'/><circle cx='210' cy='190' r='10' fill='#2ee59d'/><circle cx='150' cy='215' r='10' fill='#00d9ff'/><circle cx='90' cy='190' r='10' fill='#ff6b9d'/>" +
        "<circle cx='65' cy='130' r='10' fill='#ffd23f'/><circle cx='90' cy='70' r='10' fill='#2ee59d'/><circle cx='150' cy='45' r='10' fill='#00d9ff'/><circle cx='210' cy='70' r='10' fill='#ff6b9d'/>" +
        "<polygon points='10,250 50,190 90,250' fill='#ffd23f'/><polygon points='215,250 255,195 295,250' fill='#e63946'/>" +
        "<circle cx='255' cy='95' r='14' fill='#e63946'/><circle cx='280' cy='115' r='14' fill='#2ee59d'/><circle cx='235' cy='120' r='14' fill='#ffd23f'/></svg>"
    ];

    const sceneUrl = (i) =>
        'url("data:image/svg+xml,' + encodeURIComponent(SCENES[i % SCENES.length]) + '")';

    const PUZZLE_LEVELS = [[2, 3], [3, 3], [3, 4], [4, 4]];   // [colonnes, lignes]

    let pLevel = 1;
    let pScene = 0;
    let order = [];
    let picked = -1;
    let solved = false;

    const puzzleSolved = () => order.every((v, i) => v === i);

    STARTERS.puzzle = function startPuzzle() {

        current = "puzzle";
        resetBoard();
        layout({ hint: true, hintIcon: "💡" });
        hintBtn.onclick = puzzleHint;

        const [cols, rows] = PUZZLE_LEVELS[pLevel];

        order = [...Array(cols * rows).keys()];
        do { shuffle(order); } while (puzzleSolved());

        picked = -1;
        solved = false;

        sizeBoard(cols, rows);
        renderPuzzle();
    };

    function renderPuzzle() {

        const [cols, rows] = PUZZLE_LEVELS[pLevel];

        board.innerHTML = "";

        order.forEach((piece, position) => {

            const tile = document.createElement("div");
            tile.className = "tile";

            if (piece === position) tile.classList.add("right");
            if (position === picked) tile.classList.add("picked");

            tile.style.backgroundImage = sceneUrl(pScene);
            tile.style.backgroundSize = (cols * 100) + "% " + (rows * 100) + "%";
            tile.style.backgroundPosition =
                ((piece % cols) / (cols - 1) * 100) + "% " +
                (Math.floor(piece / cols) / (rows - 1) * 100) + "%";

            tile.addEventListener("click", () => onTile(position));

            board.appendChild(tile);
        });
    }

    function onTile(position) {

        if (solved) return;

        if (picked === -1) {
            picked = position;
            renderPuzzle();
            return;
        }

        if (picked !== position) {
            [order[picked], order[position]] = [order[position], order[picked]];
        }

        picked = -1;
        renderPuzzle();
        checkPuzzle();
    }

    function checkPuzzle() {

        if (!puzzleSolved()) return;

        solved = true;
        board.classList.add("won");
        cheer();
        say("Bravo Elisa ! Tu as réussi le puzzle !");

        // La prochaine partie sera un peu plus difficile, avec une autre image
        pLevel = Math.min(pLevel + 1, PUZZLE_LEVELS.length - 1);
        pScene = (pScene + 1) % SCENES.length;
        newBtn.classList.add("pulse");
    }

    function puzzleHint() {

        if (solved) return;

        const i = order.findIndex((v, idx) => v !== idx);
        if (i === -1) return;

        const j = order.indexOf(i);
        [order[i], order[j]] = [order[j], order[i]];

        picked = -1;
        renderPuzzle();
        checkPuzzle();
    }


    /* ==========================================
       PAIRES : on retourne deux cartes identiques.
    ========================================== */

    const EMOJIS = ["🏔️", "🎡", "🍕", "🎬", "🖼️", "☀️", "🥾", "🍦", "🎠", "🌳", "🚌", "🎈"];
    const MEMORY_LEVELS = [[3, 4], [4, 4], [4, 5]];            // [colonnes, lignes]

    let mLevel = 0;
    let cards = [];
    let firstCard = -1;
    let lock = false;

    STARTERS.memory = function startMemory() {

        current = "memory";
        resetBoard();
        layout({ hint: false });

        const [cols, rows] = MEMORY_LEVELS[mLevel];
        const pairs = (cols * rows) / 2;

        const chosen = shuffle([...EMOJIS]).slice(0, pairs);

        cards = shuffle([...chosen, ...chosen]).map(e => ({
            emoji: e, up: false, matched: false
        }));

        firstCard = -1;
        lock = false;

        sizeBoard(cols, rows, 8);
        renderMemory();
    };

    function renderMemory() {

        board.innerHTML = "";

        cards.forEach((card, i) => {

            const button = document.createElement("button");
            button.type = "button";
            button.className = "card";

            if (card.up || card.matched) {
                button.classList.add("up");
                button.textContent = card.emoji;
            } else {
                button.textContent = "🌟";
            }

            if (card.matched) button.classList.add("matched");

            button.addEventListener("click", () => onCard(i));
            board.appendChild(button);
        });
    }

    function onCard(i) {

        const card = cards[i];

        if (lock || card.up || card.matched) return;

        card.up = true;
        tone(440, 0.08);

        if (firstCard === -1) {
            firstCard = i;
            renderMemory();
            return;
        }

        const other = cards[firstCard];

        if (other.emoji === card.emoji) {

            card.matched = true;
            other.matched = true;
            firstCard = -1;
            renderMemory();
            tone(784, 0.15);

            if (cards.every(c => c.matched)) {
                board.classList.add("won");
                cheer();
                say("Bravo Elisa ! Tu as trouvé toutes les paires !");
                mLevel = Math.min(mLevel + 1, MEMORY_LEVELS.length - 1);
                newBtn.classList.add("pulse");
            }

            return;
        }

        // Pas pareil : on laisse le temps de voir, puis on cache
        lock = true;
        renderMemory();

        const a = firstCard;
        firstCard = -1;

        later(() => {
            cards[a].up = false;
            card.up = false;
            lock = false;
            if (current === "memory") renderMemory();
        }, 1300);
    }


    /* ==========================================
       BULLES : on éclate les bulles qui montent.
       Rien à perdre : c'est juste agréable.
    ========================================== */

    let popped = 0;
    let starsEl = null;

    STARTERS.bubbles = function startBubbles() {

        current = "bubbles";
        resetBoard();
        layout({ hint: false });

        board.classList.add("sky");
        board.innerHTML = "<div class='stars' id='stars'></div>";
        starsEl = board.firstChild;

        popped = 0;

        say("Éclate les bulles !");

        spawnBubble();
        bubbleTimer = setInterval(spawnBubble, 1100 * speed);
    };

    function spawnBubble() {

        if (current !== "bubbles") return;

        const size = 76 + rand(44);
        const dur = 8 + rand(4);

        const holder = document.createElement("div");
        holder.className = "bwrap";
        holder.style.left = "calc((100% - " + size + "px) * " + Math.random().toFixed(3) + ")";
        holder.style.animationDuration = dur + "s";

        const bubble = document.createElement("button");
        bubble.type = "button";
        bubble.className = "bubble";
        bubble.style.width = size + "px";
        bubble.style.height = size + "px";
        bubble.style.setProperty("--h", rand(360));
        bubble.addEventListener("click", () => popBubble(bubble, holder));

        holder.appendChild(bubble);
        board.appendChild(holder);

        later(() => holder.remove(), dur * 1000 + 300);
    }

    function popBubble(bubble, holder) {

        if (bubble.classList.contains("popped")) return;

        bubble.classList.add("popped");
        tone(500 + rand(500), 0.14, "sine");
        if (navigator.vibrate) navigator.vibrate(15);

        later(() => holder.remove(), 260);

        popped++;
        starsEl.textContent = "⭐".repeat(Math.min(popped, 10));

        if (popped >= 10) {
            cheer();
            say("Bravo Elisa !");
            later(() => { popped = 0; starsEl.textContent = ""; }, 2600);
        }
    }


    /* ==========================================
       MUSIQUE : 8 grosses touches de couleur.
    ========================================== */

    const NOTES = [
        { f: 261.63, c: "#e63946" }, { f: 293.66, c: "#ff9f1c" },
        { f: 329.63, c: "#ffd23f" }, { f: 349.23, c: "#2ee59d" },
        { f: 392.00, c: "#00b4d8" }, { f: 440.00, c: "#625aff" },
        { f: 493.88, c: "#c77dff" }, { f: 523.25, c: "#ff6b9d" }
    ];

    STARTERS.piano = function startPiano() {

        current = "piano";
        resetBoard();
        layout({ hint: false, nw: false });

        board.style.display = "grid";
        board.style.gridTemplateColumns = "repeat(4, 1fr)";
        board.style.gridTemplateRows = "repeat(2, 1fr)";
        board.style.gap = "10px";
        board.style.width = "min(94vw, 600px)";
        board.style.height = "min(52dvh, 360px)";

        NOTES.forEach((note) => {

            const pad = document.createElement("button");
            pad.type = "button";
            pad.className = "pad";
            pad.style.background = note.c;

            pad.addEventListener("click", () => {
                tone(note.f, 0.7);
                pad.classList.add("lit");
                later(() => pad.classList.remove("lit"), 220);
            });

            board.appendChild(pad);
        });

        say("Touche les couleurs pour faire de la musique.");
    };


    /* ==========================================
       SUITE : Nhova joue une suite de couleurs,
       Elisa la répète. Une erreur ? On recommence
       tranquillement la même suite.
    ========================================== */

    const SIMON = [
        { f: 329.63, c: "#e63946" }, { f: 261.63, c: "#2ee59d" },
        { f: 392.00, c: "#00b4d8" }, { f: 440.00, c: "#ffd23f" }
    ];
    const SIMON_MAX = 7;

    let seq = [];
    let phase = "idle";
    let pos = 0;
    let simonPads = [];
    let cueEl = null;

    STARTERS.simon = function startSimon() {

        current = "simon";
        resetBoard();
        layout({ hint: false });

        board.classList.add("simon");
        board.innerHTML = "<div class='cue' id='cue'>👀</div><div class='padgrid'></div>";
        cueEl = board.firstChild;

        const grid = board.lastChild;
        simonPads = SIMON.map((s, i) => {
            const pad = document.createElement("button");
            pad.type = "button";
            pad.className = "pad";
            pad.style.background = s.c;
            pad.addEventListener("click", () => onSimon(i));
            grid.appendChild(pad);
            return pad;
        });

        seq = [rand(4), rand(4)];
        phase = "idle";

        say("Regarde bien, puis répète.");
        later(simonRound, 2600);
    };

    function setCue(text) { if (cueEl) cueEl.textContent = text; }

    function flashPad(n) {
        simonPads[n].classList.add("lit");
        tone(SIMON[n].f, 0.45);
        later(() => simonPads[n] && simonPads[n].classList.remove("lit"), 450);
    }

    function simonRound() {

        if (current !== "simon") return;

        phase = "show";
        pos = 0;
        setCue("👀");

        seq.forEach((n, i) => later(() => flashPad(n), 600 + i * 800));

        later(() => { phase = "input"; pos = 0; setCue("👆"); }, 600 + seq.length * 800);
    }

    function onSimon(n) {

        if (phase !== "input") return;

        flashPad(n);

        if (n !== seq[pos]) {
            phase = "wait";
            badSound();
            setCue("🔁");
            later(simonRound, 1400);
            return;
        }

        pos++;

        if (pos < seq.length) return;

        phase = "wait";

        if (seq.length >= SIMON_MAX) {
            setCue("🎉");
            cheer();
            say("Bravo Elisa ! Quelle mémoire !");
            newBtn.classList.add("pulse");
            return;
        }

        setCue("👍");
        later(() => { seq.push(rand(4)); simonRound(); }, 1000);
    }


    /* ==========================================
       ÉCOUTE : Nhova dit « Touche le restaurant »,
       Elisa touche la bonne image.
    ========================================== */

    const VOCAB = [
        { e: "🏔️", n: "la montagne" },   { e: "🎡", n: "la grande roue" },
        { e: "🍕", n: "la pizza" },      { e: "🎬", n: "le cinéma" },
        { e: "🖼️", n: "le tableau" },    { e: "☀️", n: "le soleil" },
        { e: "🥾", n: "la chaussure de randonnée" }, { e: "🍦", n: "la glace" },
        { e: "🌳", n: "l'arbre" },       { e: "🚌", n: "le bus" },
        { e: "🎈", n: "le ballon" },     { e: "🏛️", n: "le musée" },
        { e: "🍽️", n: "le restaurant" }, { e: "☂️", n: "le parapluie" },
        { e: "📷", n: "l'appareil photo" }, { e: "🎟️", n: "le billet" }
    ];

    let picks = [];
    let target = null;
    let listenGood = 0;
    let listenLock = false;

    STARTERS.listen = function startListen() {

        current = "listen";
        resetBoard();
        layout({ hint: true, hintIcon: "🔊" });
        hintBtn.onclick = askTarget;

        listenGood = 0;
        listenRound();
    };

    function listenRound() {

        if (current !== "listen") return;

        listenLock = false;
        picks = shuffle([...VOCAB]).slice(0, 4);
        target = picks[rand(4)];

        sizeBoard(2, 2, 12);
        board.innerHTML = "";

        picks.forEach((item, i) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "card up pic";
            card.textContent = item.e;
            card.addEventListener("click", () => onListen(i, card));
            board.appendChild(card);
        });

        later(askTarget, 400);
    }

    function askTarget() {
        if (target) say("Touche " + target.n + ".");
    }

    function onListen(i, card) {

        if (listenLock || current !== "listen") return;

        if (picks[i] !== target) {
            badSound();
            card.classList.add("wrong");
            later(() => card.classList.remove("wrong"), 600);
            later(askTarget, 700);
            return;
        }

        listenLock = true;
        card.classList.add("matched");
        okSound();
        listenGood++;

        if (listenGood >= 5) {
            board.classList.add("won");
            cheer();
            say("Bravo Elisa ! Tu as tout trouvé !");
            newBtn.classList.add("pulse");
            return;
        }

        say("Oui, c'est " + target.n + ". Bravo !");
        later(listenRound, 2200);
    }


    /* ==========================================
       LE DIFFÉRENT : toutes les images sont pareilles
       sauf une. On la touche.
    ========================================== */

    const PAIRS = [
        ["🍎", "🍅"], ["🐶", "🐱"], ["🌲", "🌴"], ["🚗", "🚕"], ["🌹", "🌷"],
        ["🏠", "🏢"], ["⭐", "🌟"], ["🍋", "🍊"], ["⚽", "🏀"], ["☀️", "🌙"]
    ];
    const ODD_LEVELS = [[2, 2], [2, 3], [3, 3], [3, 4]];

    let oLevel = 0;
    let oWins = 0;
    let oIdx = -1;
    let oLock = false;

    STARTERS.odd = function startOdd() {

        current = "odd";
        resetBoard();
        layout({ hint: true, hintIcon: "🔊" });
        hintBtn.onclick = () => say("Touche celui qui est différent.");

        oWins = 0;
        say("Touche celui qui est différent.");
        later(oddRound, 1800);
    };

    function oddRound() {

        if (current !== "odd") return;

        oLock = false;

        const [cols, rows] = ODD_LEVELS[oLevel];
        const n = cols * rows;
        const [same, odd] = shuffle([...PAIRS[rand(PAIRS.length)]]);

        oIdx = rand(n);

        sizeBoard(cols, rows, 8);
        board.innerHTML = "";

        for (let i = 0; i < n; i++) {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "card up pic";
            card.textContent = i === oIdx ? odd : same;
            card.addEventListener("click", () => onOdd(i, card));
            board.appendChild(card);
        }
    }

    function onOdd(i, card) {

        if (oLock || current !== "odd") return;

        if (i !== oIdx) {
            badSound();
            card.classList.add("wrong");
            later(() => card.classList.remove("wrong"), 600);
            return;
        }

        oLock = true;
        card.classList.add("matched");
        okSound();
        oWins++;

        if (oWins % 4 === 0) {
            cheer();
            say("Bravo Elisa !");
            oLevel = Math.min(oLevel + 1, ODD_LEVELS.length - 1);
            later(oddRound, 2800);
        } else {
            later(oddRound, 1000);
        }
    }


    /* ==========================================
       COLORIAGE : on choisit une couleur, puis on
       touche une zone pour la colorier.
    ========================================== */

    const COLORS = ["#e63946", "#ff9f1c", "#ffd23f", "#2ee59d", "#00b4d8", "#625aff", "#ff6b9d", "#8d6e63"];

    const COLOR_SCENES = [

        // Montagne et randonnée
        "<rect class='zone' x='0' y='0' width='300' height='300'/>" +
        "<circle class='zone' cx='235' cy='55' r='30'/>" +
        "<ellipse class='zone' cx='95' cy='60' rx='42' ry='20'/>" +
        "<polygon class='zone' points='0,210 80,80 160,210'/>" +
        "<polygon class='zone' points='110,210 200,95 300,210'/>" +
        "<polygon class='zone' points='0,300 0,220 120,200 300,235 300,300'/>" +
        "<ellipse class='zone' cx='215' cy='270' rx='70' ry='20'/>" +
        "<rect class='zone' x='55' y='235' width='22' height='45'/>" +
        "<polygon class='zone' points='25,240 66,170 107,240'/>" +
        "<polygon class='zone' points='112,290 135,248 158,290'/>",

        // Foire
        "<rect class='zone' x='0' y='0' width='300' height='300'/>" +
        "<rect class='zone' x='0' y='250' width='300' height='50'/>" +
        "<circle class='zone' cx='40' cy='45' r='22'/>" +
        "<circle class='zone' cx='150' cy='130' r='80'/>" +
        "<circle class='zone' cx='150' cy='130' r='35'/>" +
        "<polygon class='zone' points='10,255 55,185 100,255'/>" +
        "<polygon class='zone' points='205,255 255,190 295,255'/>" +
        "<circle class='zone' cx='255' cy='80' r='16'/>" +
        "<circle class='zone' cx='280' cy='115' r='16'/>" +
        "<circle class='zone' cx='232' cy='110' r='16'/>"
    ];

    let cScene = 0;
    let cColor = COLORS[0];
    let cDone = false;

    STARTERS.color = function startColor() {

        current = "color";
        resetBoard();
        layout({ hint: false });

        cColor = COLORS[0];
        cDone = false;

        board.classList.add("paintboard");

        board.innerHTML =
            "<svg viewBox='0 0 300 300' class='paint'>" +
            "<g fill='#ffffff' stroke='#1b2a41' stroke-width='3' stroke-linejoin='round'>" +
            COLOR_SCENES[cScene % COLOR_SCENES.length] +
            "</g></svg>" +
            "<div class='palette'>" +
            COLORS.map((c, i) =>
                "<button type='button' class='swatch" + (i === 0 ? " on" : "") +
                "' data-c='" + c + "' style='background:" + c + "' aria-label='Couleur'></button>"
            ).join("") +
            "</div>";

        board.onclick = onPaint;

        say("Choisis une couleur, puis touche le dessin.");
    };

    function onPaint(event) {

        const swatch = event.target.closest && event.target.closest(".swatch");

        if (swatch) {
            cColor = swatch.dataset.c;
            board.querySelectorAll(".swatch").forEach(s => s.classList.toggle("on", s === swatch));
            tone(520, 0.08);
            return;
        }

        const zone = event.target.closest && event.target.closest(".zone");

        if (!zone || cDone) return;

        zone.setAttribute("fill", cColor);
        tone(380 + rand(300), 0.15);

        const zones = [...board.querySelectorAll(".zone")];

        if (zones.every(z => z.hasAttribute("fill"))) {
            cDone = true;
            cheer();
            say("Bravo Elisa ! Quel beau coloriage !");
            cScene = (cScene + 1) % COLOR_SCENES.length;
            newBtn.classList.add("pulse");
        }
    }


    /* ---------- Boutons ---------- */

    menu.querySelectorAll(".menu-card").forEach(card => {
        card.addEventListener("click", () => open(card.dataset.game));
    });

    homeBtn.addEventListener("click", close);
    menuBtn.addEventListener("click", showMenu);

    newBtn.addEventListener("click", () => {
        if (current && STARTERS[current === "piano" ? "piano" : current]) STARTERS[current]();
    });

    return {
        open,
        close,
        isOpen: () => isOpen,
        games: () => Object.keys(STARTERS),
        // Réservé aux tests automatiques
        _debug: () => ({ current, seq, phase, pos, target, picks, oIdx, popped, speed }),
        _setSpeed: (s) => { speed = s; }
    };

})();
