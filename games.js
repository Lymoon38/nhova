/* ==========================================
   NHOVA — Les 12 jeux d'Elisa
   Tout se joue d'un seul appui : pas de glisser,
   pas de lecture, consignes et félicitations à voix haute.

   Niveaux : ⭐ facile, ⭐⭐ moyen, ⭐⭐⭐ difficile.
   Ils montent tout seuls (3 victoires) et on peut
   aussi les choisir. La progression est gardée
   sur le téléphone, avec un bouton 🗑️ pour
   recommencer à zéro.
========================================== */

"use strict";

const NhovaGames = (() => {

    const $ = id => document.getElementById(id);

    const overlay    = $("gameOverlay");
    const menu       = $("gameMenu");
    const wrap       = $("gameBoardWrap");
    const board      = $("gameBoard");
    const bottom     = $("gameBottom");
    const homeBtn    = $("gameHome");
    const levelBtn   = $("gameLevel");
    const viewBtn    = $("gameView");
    const hintBtn    = $("gameHint");
    const trophyBtn  = $("gameTrophy");
    const menuBtn    = $("gameMenuBtn");
    const resetBtn   = $("gameReset");
    const newBtn     = $("gameNew");
    const celebrate  = $("gameCelebrate");
    const trophyView = $("trophyView");
    const resetPanel = $("resetPanel");
    const resetOne   = $("resetOne");
    const resetAll   = $("resetAll");
    const resetNo    = $("resetNo");

    let isOpen = false;
    let current = null;
    let speed = 1;                 // réservé aux tests : réduit les attentes
    let done = false;              // la partie est gagnée
    let hintFn = null;             // aide du jeu en cours (💡)
    let viewFn = null;             // 👁️ voir le modèle
    let helpTimer = null;
    let helpCount = 0;

    const say = (text) => { if (window.nhovaSay) window.nhovaSay(text); };
    const rand = n => Math.floor(Math.random() * n);
    const nameOf = () => (window.nhovaName && window.nhovaName()) || "Elisa";

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = rand(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }


    /* ---------- Les jeux ---------- */

    const GAMES = {
        puzzle:  { emoji: "🧩", label: "Puzzle",            name: "au puzzle",               tiers: true,  view: true,  hint: true,  progress: true },
        slide:   { emoji: "🔀", label: "Taquin",            name: "au taquin",               tiers: true,  view: true,  hint: true,  progress: true },
        memory:  { emoji: "🃏", label: "Paires",            name: "aux paires",              tiers: true,  view: false, hint: true,  progress: true },
        link:    { emoji: "🔗", label: "Qui va avec qui",   name: "au jeu des associations", tiers: true,  view: false, hint: true,  progress: true },
        gone:    { emoji: "🎩", label: "Disparu",           name: "au jeu de mémoire",       tiers: true,  view: false, hint: true,  progress: true },
        match3:  { emoji: "🍬", label: "Match-3",           name: "au match trois",          tiers: true,  view: false, hint: true,  progress: true },
        bubbles: { emoji: "🎈", label: "Bulles",            name: "aux bulles",              tiers: true,  view: false, hint: false, progress: true },
        piano:   { emoji: "🎹", label: "Musique",           name: "à la musique",            tiers: false, view: false, hint: false, progress: false },
        simon:   { emoji: "🧠", label: "Suite de couleurs", name: "à la suite de couleurs",  tiers: true,  view: false, hint: true,  progress: true },
        listen:  { emoji: "👂", label: "Écoute",            name: "au jeu d'écoute",         tiers: true,  view: false, hint: true,  progress: true },
        odd:     { emoji: "🔍", label: "Le différent",      name: "au jeu du différent",     tiers: true,  view: false, hint: true,  progress: true },
        color:   { emoji: "🎨", label: "Coloriage",         name: "au coloriage",            tiers: false, view: false, hint: false, progress: true }
    };

    const STARTERS = {};
    const LEVEL_WORDS = ["facile", "moyen", "difficile"];


    /* ---------- Félicitations variées et personnalisées ---------- */

    const PHRASES = {
        win: [
            "Bravo {n} !", "Super, {n}, tu as réussi !", "Quel talent, {n} !", "Bien joué {n} !",
            "Magnifique, {n} !", "Tu es une championne, {n} !", "Excellent travail, {n} !",
            "Chapeau {n} !", "Tu es vraiment forte, {n} !", "Formidable, {n} !"
        ],
        ok: [
            "Oui !", "C'est ça !", "Bravo !", "Très bien !", "Exactement !", "Parfait !", "Bien vu !"
        ],
        retry: [
            "Essaie encore.", "Presque !", "Pas tout à fait, réessaie.", "Tu vas y arriver.",
            "Ce n'est pas celui-là.", "Regarde bien, {n}."
        ],
        level: [
            "On passe au niveau suivant, c'est de plus en plus fort !",
            "Niveau suivant ! Tu progresses vite, {n}.",
            "Tu montes d'un niveau, bravo !"
        ],
        help: [
            "Tu veux de l'aide ? Touche l'ampoule.",
            "Je peux t'aider. Touche l'ampoule.",
            "Besoin d'un coup de main, {n} ? Touche l'ampoule."
        ]
    };

    const lastPick = {};

    function pick(kind) {
        const list = PHRASES[kind];
        let i;
        do { i = rand(list.length); } while (list.length > 1 && i === lastPick[kind]);
        lastPick[kind] = i;
        return list[i].replace(/\{n\}/g, nameOf());
    }


    /* ---------- Timers : tout est nettoyé en changeant d'écran ---------- */

    let timers = [];
    let bubbleTimer = null;

    const later = (fn, ms) => {
        const t = setTimeout(fn, ms * speed);
        timers.push(t);
        return t;
    };

    function resetBoard() {
        timers.forEach(clearTimeout);
        timers = [];
        if (bubbleTimer) { clearInterval(bubbleTimer); bubbleTimer = null; }
        clearTimeout(helpTimer);

        board.className = "board";
        board.removeAttribute("style");
        board.onclick = null;
        board.innerHTML = "";

        celebrate.hidden = true;
        newBtn.classList.remove("pulse");
        hintBtn.classList.remove("pulse");
        resetPanel.classList.remove("visible");
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


    /* ---------- Progression (gardée sur le téléphone) ---------- */

    const STORE_KEY = "nhova-progress";
    let store = { games: {} };

    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
        if (saved && typeof saved === "object" && saved.games && typeof saved.games === "object") store = saved;
    } catch (e) { /* on repart de zéro */ }

    function saveStore() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignoré */ }
    }

    function prog(id) {
        if (!store.games[id]) store.games[id] = { tier: 1, wins: 0, winsAtTier: 0, stars: 0, last: 0 };
        return store.games[id];
    }

    const tierOf = id => Math.min(3, Math.max(1, prog(id).tier || 1));

    const MEDALS = [null, { emoji: "🥉", word: "de bronze" }, { emoji: "🥈", word: "d'argent" }, { emoji: "🥇", word: "d'or" }];
    const medalOf = wins => wins >= 15 ? 3 : wins >= 5 ? 2 : wins >= 1 ? 1 : 0;

    function updateLevelBtn() {
        if (current && GAMES[current] && GAMES[current].tiers) {
            levelBtn.textContent = "⭐".repeat(tierOf(current));
        }
    }

    function win(id, keepGoing) {

        const g = GAMES[id];
        const p = prog(id);
        const before = medalOf(p.wins);

        p.wins++;
        p.winsAtTier++;
        p.stars += g.tiers ? p.tier : 1;
        p.last = Date.now();

        const parts = [pick("win")];
        let leveled = false;

        // Après 3 victoires, le niveau monte tout seul
        if (g.tiers && p.tier < 3 && p.winsAtTier >= 3) {
            p.tier++;
            p.winsAtTier = 0;
            leveled = true;
            parts.push(pick("level"));
        }

        const after = medalOf(p.wins);
        if (after > before) parts.push("Tu gagnes une médaille " + MEDALS[after].word + " " + g.name + " !");

        saveStore();
        cheer();
        say(parts.join(" "));

        if (!keepGoing) {
            done = true;
            clearTimeout(helpTimer);
            newBtn.classList.add("pulse");
        }

        updateLevelBtn();
        return { leveled, medal: after > before ? after : 0 };
    }

    function resetProgress(scope) {
        if (scope === "all") store = { games: {} };
        else if (scope && store.games[scope]) delete store.games[scope];
        saveStore();
    }


    /* ---------- Aide : 💡 si Elisa reste bloquée ---------- */

    function armHelp() {
        clearTimeout(helpTimer);
        if (!hintFn || done || !isOpen || helpCount >= 3) return;

        helpTimer = setTimeout(() => {
            if (!hintFn || done || !isOpen) return;
            helpCount++;
            hintBtn.classList.add("pulse");
            say(pick("help"));
            armHelp();
        }, 25000 * speed);
    }

    overlay.addEventListener("click", () => {
        hintBtn.classList.remove("pulse");
        armHelp();
    }, true);

    hintBtn.addEventListener("click", () => { if (hintFn && !done) hintFn(); });
    viewBtn.addEventListener("click", () => { if (viewFn) viewFn(); });


    /* ---------- Écrans ---------- */

    function configure(id) {
        const g = GAMES[id];

        menu.hidden = true;
        trophyView.hidden = true;
        wrap.hidden = false;
        bottom.hidden = false;

        trophyBtn.hidden = true;
        levelBtn.hidden = !g.tiers;
        viewBtn.hidden = !g.view;
        hintBtn.hidden = !g.hint;
        hintBtn.textContent = "💡";
        resetBtn.hidden = !g.progress;
        newBtn.hidden = id === "piano";

        updateLevelBtn();
    }

    function begin(id) {
        current = id;
        done = false;
        hintFn = null;
        viewFn = null;
        helpCount = 0;
        resetBoard();
        configure(id);
    }

    function hideTop() {
        levelBtn.hidden = true;
        viewBtn.hidden = true;
        hintBtn.hidden = true;
    }

    function showMenu() {
        current = null;
        hintFn = null;
        viewFn = null;
        resetBoard();
        hideTop();
        menu.hidden = false;
        wrap.hidden = true;
        trophyView.hidden = true;
        bottom.hidden = true;
        trophyBtn.hidden = false;
        say("Choisis un jeu.");
    }

    function open(game) {
        isOpen = true;
        overlay.classList.add("visible");

        if (STARTERS[game]) STARTERS[game]();
        else if (game === "trophy") showTrophies();
        else showMenu();
    }

    function close() {
        isOpen = false;
        current = null;
        hintFn = null;
        viewFn = null;
        resetBoard();
        overlay.classList.remove("visible");
        if (typeof stopSpeaking === "function") stopSpeaking();
        if (typeof setState === "function") setState("idle");
    }

    function sizeBoard(cols, rows, gap) {
        board.style.display = "grid";
        board.style.gap = (gap || 4) + "px";
        board.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
        board.style.gridTemplateRows = "repeat(" + rows + ", 1fr)";
        board.style.aspectRatio = cols + " / " + rows;
        board.style.width = "min(94vw, " + (56 * cols / rows).toFixed(1) + "dvh)";
    }

    const glow = (el) => {
        if (!el) return;
        el.classList.add("glow");
        later(() => el.classList.remove("glow"), 1600);
    };


    /* ==========================================
       IMAGES (puzzle et taquin)
    ========================================== */

    const HEAD = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300' preserveAspectRatio='none'>";

    const windowsOf = (xs, ys) => xs.flatMap(x => ys.map(y =>
        "<rect x='" + x + "' y='" + y + "' width='10' height='12' fill='#ffd23f'/>")).join("");

    const SCENES = [

        // 0 · Montagne et randonnée
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

        // 1 · Plage
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

        // 2 · Foire et grande roue
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
        "<circle cx='255' cy='95' r='14' fill='#e63946'/><circle cx='280' cy='115' r='14' fill='#2ee59d'/><circle cx='235' cy='120' r='14' fill='#ffd23f'/></svg>",

        // 3 · Musée
        HEAD +
        "<rect width='300' height='300' fill='#f3e6c8'/><rect y='230' width='300' height='70' fill='#b08968'/>" +
        "<rect x='20' y='40' width='80' height='60' fill='#fff' stroke='#6b4f2a' stroke-width='6'/><circle cx='60' cy='70' r='18' fill='#e63946'/>" +
        "<rect x='120' y='30' width='60' height='80' fill='#fff' stroke='#6b4f2a' stroke-width='6'/><polygon points='128,100 150,50 172,100' fill='#2a9d8f'/>" +
        "<rect x='200' y='50' width='80' height='55' fill='#fff' stroke='#6b4f2a' stroke-width='6'/><rect x='212' y='62' width='56' height='30' fill='#f4a261'/>" +
        "<rect x='40' y='150' width='24' height='80' fill='#d9c9a3'/><circle cx='52' cy='140' r='18' fill='#e9d8b0'/>" +
        "<rect x='130' y='170' width='40' height='60' fill='#8d6e63'/><rect x='215' y='140' width='24' height='90' fill='#d9c9a3'/><circle cx='227' cy='130' r='18' fill='#e9d8b0'/></svg>",

        // 4 · Forêt et lac
        HEAD +
        "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#9be7ff'/><stop offset='1' stop-color='#e8fff1'/></linearGradient></defs>" +
        "<rect width='300' height='300' fill='url(#g)'/><circle cx='230' cy='50' r='24' fill='#ffe97a'/>" +
        "<polygon points='0,170 70,80 140,170' fill='#7a8fa6'/><polygon points='100,170 190,70 290,170' fill='#8aa1b8'/>" +
        "<rect y='165' width='300' height='135' fill='#3f9a5f'/><ellipse cx='150' cy='235' rx='95' ry='35' fill='#3aa0d8'/>" +
        "<polygon points='20,200 45,130 70,200' fill='#1f6f43'/><polygon points='230,205 258,125 286,205' fill='#1f6f43'/><polygon points='200,195 220,150 240,195' fill='#2b8a55'/>" +
        "<rect x='42' y='198' width='6' height='22' fill='#6b4f2a'/><rect x='255' y='203' width='6' height='22' fill='#6b4f2a'/>" +
        "<ellipse cx='150' cy='235' rx='38' ry='9' fill='#7cc8ee'/></svg>",

        // 5 · Ville au crépuscule
        HEAD +
        "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#24135f'/><stop offset='1' stop-color='#ff9a6b'/></linearGradient></defs>" +
        "<rect width='300' height='300' fill='url(#g)'/><circle cx='235' cy='55' r='22' fill='#fff7c2'/>" +
        "<rect x='15' y='130' width='60' height='170' fill='#2d3561'/><rect x='85' y='90' width='55' height='210' fill='#3b4a8a'/>" +
        "<rect x='150' y='140' width='60' height='160' fill='#2d3561'/><rect x='220' y='110' width='65' height='190' fill='#3b4a8a'/>" +
        windowsOf([25, 45, 55], [145, 175, 205, 235]) + windowsOf([95, 115], [105, 135, 165, 195, 225]) +
        windowsOf([160, 180], [155, 185, 215, 245]) + windowsOf([230, 255], [125, 155, 185, 215, 245]) + "</svg>"
    ];

    const sceneUrl = (i) =>
        'url("data:image/svg+xml,' + encodeURIComponent(SCENES[i % SCENES.length]) + '")';

    // Montre le modèle (l'image terminée) pendant 3 secondes
    function showModel(sceneIndex) {
        board.style.position = "relative";
        const old = board.querySelector(".model");
        if (old) { old.remove(); return; }

        const model = document.createElement("div");
        model.className = "model";
        model.style.backgroundImage = sceneUrl(sceneIndex);
        model.addEventListener("click", () => model.remove());
        board.appendChild(model);
        later(() => model.remove(), 3000);
    }


    /* ==========================================
       PUZZLE : on touche une pièce, puis une autre,
       elles échangent leur place.
    ========================================== */

    const PUZZLE_TIERS = [[2, 3], [3, 4], [4, 5]];   // [colonnes, lignes]

    let pScene = 0;
    let order = [];
    let picked = -1;

    const puzzleSolved = () => order.every((v, i) => v === i);

    STARTERS.puzzle = function startPuzzle() {

        begin("puzzle");

        const [cols, rows] = PUZZLE_TIERS[tierOf("puzzle") - 1];

        order = [...Array(cols * rows).keys()];
        do { shuffle(order); } while (puzzleSolved());
        picked = -1;

        sizeBoard(cols, rows);
        renderPuzzle();

        hintFn = puzzleHint;
        viewFn = () => showModel(pScene);
        armHelp();
    };

    function renderPuzzle() {

        const [cols, rows] = PUZZLE_TIERS[tierOf("puzzle") - 1];
        const model = board.querySelector(".model");

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

        if (model) board.appendChild(model);
    }

    function onTile(position) {

        if (done) return;

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

        board.classList.add("won");
        pScene = (pScene + 1) % SCENES.length;     // la prochaine partie : une autre image
        win("puzzle");
    }

    function puzzleHint() {

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

    const EMOJIS = ["🏔️", "🎡", "🍕", "🎬", "🖼️", "☀️", "🥾", "🍦", "🎠", "🌳", "🚌", "🎈", "🏛️", "🍰", "📷", "🚲"];
    const MEMORY_TIERS = [[3, 4], [4, 4], [4, 5]];            // [colonnes, lignes]
    const MEMORY_DELAY = [1300, 1100, 900];

    let cards = [];
    let firstCard = -1;
    let lock = false;

    STARTERS.memory = function startMemory() {

        begin("memory");

        const t = tierOf("memory");
        const [cols, rows] = MEMORY_TIERS[t - 1];
        const chosen = shuffle([...EMOJIS]).slice(0, (cols * rows) / 2);

        cards = shuffle([...chosen, ...chosen]).map(e => ({ emoji: e, up: false, matched: false }));
        firstCard = -1;
        lock = false;

        sizeBoard(cols, rows, 8);
        renderMemory();

        hintFn = memoryHint;
        armHelp();
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

        if (lock || done || card.up || card.matched) return;

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
                win("memory");
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
        }, MEMORY_DELAY[tierOf("memory") - 1]);
    }

    // 💡 : on éclaire une paire à retrouver
    function memoryHint() {

        if (lock) return;

        const free = cards.map((c, i) => ({ c, i })).filter(x => !x.c.matched && !x.c.up);
        const first = free[0];
        if (!first) return;

        const twin = free.find(x => x.i !== first.i && x.c.emoji === first.c.emoji);
        const buttons = board.children;

        glow(buttons[first.i]);
        if (twin) glow(buttons[twin.i]);
    }


    /* ==========================================
       BULLES : on éclate les bulles qui montent.
       Plus le niveau est haut, plus elles sont
       petites et rapides.
    ========================================== */

    const BUBBLE_TIERS = [
        { size: [90, 130], dur: [10, 13], every: 1300 },
        { size: [76, 120], dur: [8, 11],  every: 1000 },
        { size: [56, 90],  dur: [6, 9],   every: 700 }
    ];

    let popped = 0;
    let starsEl = null;

    STARTERS.bubbles = function startBubbles() {

        begin("bubbles");

        const t = BUBBLE_TIERS[tierOf("bubbles") - 1];

        board.classList.add("sky");
        board.innerHTML = "<div class='stars'></div>";
        starsEl = board.firstChild;
        popped = 0;

        say("Éclate les bulles !");

        spawnBubble();
        bubbleTimer = setInterval(spawnBubble, t.every * speed);
    };

    function spawnBubble() {

        if (current !== "bubbles") return;

        const t = BUBBLE_TIERS[tierOf("bubbles") - 1];
        const size = t.size[0] + rand(t.size[1] - t.size[0]);
        const dur = t.dur[0] + rand(t.dur[1] - t.dur[0]);

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
            win("bubbles", true);            // le jeu continue, sans fin
            later(() => { popped = 0; starsEl.textContent = ""; }, 2600);
        }
    }


    /* ==========================================
       MUSIQUE : 8 grosses touches de couleur.
       ⏺️ enregistre une mélodie, ▶️ la rejoue.
    ========================================== */

    const NOTES = [
        { f: 261.63, c: "#e63946" }, { f: 293.66, c: "#ff9f1c" },
        { f: 329.63, c: "#ffd23f" }, { f: 349.23, c: "#2ee59d" },
        { f: 392.00, c: "#00b4d8" }, { f: 440.00, c: "#625aff" },
        { f: 493.88, c: "#c77dff" }, { f: 523.25, c: "#ff6b9d" }
    ];

    const MELODY_KEY = "nhova-melody";
    let melody = [];
    let recording = null;          // { t0, notes }
    let padEls = [];
    let recBtn = null;
    let playBtn = null;

    try {
        const saved = JSON.parse(localStorage.getItem(MELODY_KEY) || "[]");
        if (Array.isArray(saved)) melody = saved.filter(n => n && Number.isInteger(n.i) && n.i >= 0 && n.i < 8 && Number.isFinite(n.t));
    } catch (e) { /* pas de mélodie gardée */ }

    function playNote(i) {
        tone(NOTES[i].f, 0.7);
        const pad = padEls[i];
        if (pad) {
            pad.classList.add("lit");
            later(() => pad.classList.remove("lit"), 220);
        }
    }

    STARTERS.piano = function startPiano() {

        begin("piano");
        hideTop();
        recording = null;

        board.style.display = "flex";
        board.style.flexDirection = "column";
        board.style.alignItems = "center";
        board.style.gap = "14px";
        board.style.width = "min(94vw, 600px)";

        const grid = document.createElement("div");
        grid.className = "padgrid8";

        padEls = NOTES.map((note, i) => {
            const pad = document.createElement("button");
            pad.type = "button";
            pad.className = "pad";
            pad.style.background = note.c;
            pad.addEventListener("click", () => {
                playNote(i);
                if (recording) {
                    recording.notes.push({ i, t: Date.now() - recording.t0 });
                    if (recording.notes.length >= 60) stopRecording();
                }
            });
            grid.appendChild(pad);
            return pad;
        });

        const bar = document.createElement("div");
        bar.className = "recbar";

        recBtn = document.createElement("button");
        recBtn.type = "button";
        recBtn.className = "round-btn";
        recBtn.textContent = "⏺️";
        recBtn.setAttribute("aria-label", "Enregistrer une mélodie");
        recBtn.addEventListener("click", () => recording ? stopRecording() : startRecording());

        playBtn = document.createElement("button");
        playBtn.type = "button";
        playBtn.className = "round-btn";
        playBtn.textContent = "▶️";
        playBtn.setAttribute("aria-label", "Rejouer ma mélodie");
        playBtn.addEventListener("click", playMelody);

        bar.appendChild(recBtn);
        bar.appendChild(playBtn);

        board.appendChild(grid);
        board.appendChild(bar);

        say("Touche les couleurs pour faire de la musique. Le rond rouge enregistre, la flèche rejoue.");
    };

    function startRecording() {
        recording = { t0: Date.now(), notes: [] };
        recBtn.textContent = "⏹️";
        recBtn.classList.add("rec");
        say("Je t'enregistre. Joue ta mélodie !");
        // le départ de l'enregistrement se compte après la phrase de Nhova
        recording.t0 = Date.now();
        later(() => { if (recording) stopRecording(); }, 30000);
    }

    function stopRecording() {

        if (!recording) return;

        const notes = recording.notes;
        recording = null;
        recBtn.textContent = "⏺️";
        recBtn.classList.remove("rec");

        if (!notes.length) {
            say("Je n'ai rien entendu. Essaie encore.");
            return;
        }

        const t0 = notes[0].t;
        melody = notes.map(n => ({ i: n.i, t: n.t - t0 }));

        try { localStorage.setItem(MELODY_KEY, JSON.stringify(melody)); } catch (e) { /* ignoré */ }

        say("C'est enregistré, " + nameOf() + " ! Touche la flèche pour l'écouter.");
    }

    function playMelody() {

        if (recording) stopRecording();

        if (!melody.length) {
            say("Enregistre d'abord une mélodie avec le rond rouge.");
            return;
        }

        melody.forEach(n => later(() => playNote(n.i), n.t + 250));
    }


    /* ==========================================
       SUITE : Nhova joue une suite de couleurs,
       Elisa la répète. Une erreur ? On rejoue la
       même suite, sans punition.
    ========================================== */

    const SIMON = [
        { f: 329.63, c: "#e63946" }, { f: 261.63, c: "#2ee59d" },
        { f: 392.00, c: "#00b4d8" }, { f: 440.00, c: "#ffd23f" }
    ];
    const SIMON_TIERS = [{ max: 5, step: 800 }, { max: 7, step: 650 }, { max: 10, step: 500 }];

    let seq = [];
    let phase = "idle";
    let pos = 0;
    let simonPads = [];
    let cueEl = null;

    STARTERS.simon = function startSimon() {

        begin("simon");

        board.classList.add("simon");
        board.innerHTML = "<div class='cue'>👀</div><div class='padgrid'></div>";
        cueEl = board.firstChild;

        simonPads = SIMON.map((s, i) => {
            const pad = document.createElement("button");
            pad.type = "button";
            pad.className = "pad";
            pad.style.background = s.c;
            pad.addEventListener("click", () => onSimon(i));
            board.lastChild.appendChild(pad);
            return pad;
        });

        seq = [rand(4), rand(4)];
        phase = "idle";

        hintFn = () => { if (phase === "input") simonRound(); };      // 💡 : on rejoue la suite

        say("Regarde bien, puis répète.");
        later(simonRound, 2600);
        armHelp();
    };

    const setCue = (text) => { if (cueEl) cueEl.textContent = text; };

    function flashPad(n) {
        const pad = simonPads[n];
        if (!pad) return;
        pad.classList.add("lit");
        tone(SIMON[n].f, 0.45);
        later(() => pad.classList.remove("lit"), 450);
    }

    function simonRound() {

        if (current !== "simon") return;

        const step = SIMON_TIERS[tierOf("simon") - 1].step;

        phase = "show";
        pos = 0;
        setCue("👀");

        seq.forEach((n, i) => later(() => flashPad(n), 600 + i * step));
        later(() => { phase = "input"; pos = 0; setCue("👆"); }, 600 + seq.length * step);
    }

    function onSimon(n) {

        if (phase !== "input" || done) return;

        flashPad(n);

        if (n !== seq[pos]) {
            phase = "wait";
            badSound();
            setCue("🔁");
            say(pick("retry"));
            later(simonRound, 1800);
            return;
        }

        pos++;

        if (pos < seq.length) return;

        phase = "wait";

        if (seq.length >= SIMON_TIERS[tierOf("simon") - 1].max) {
            setCue("🎉");
            board.classList.add("won");
            win("simon");
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
        { e: "🏔️", n: "la montagne" },   { e: "🎡", n: "la grande roue" },  { e: "🎠", n: "le manège" },
        { e: "🎬", n: "le cinéma" },      { e: "🖼️", n: "le tableau" },       { e: "🏛️", n: "le musée" },
        { e: "⛺", n: "la tente" },        { e: "🏖️", n: "la plage" },         { e: "🏰", n: "le château" },
        { e: "⛪", n: "l'église" },        { e: "🌉", n: "le pont" },          { e: "🗼", n: "la tour" },
        { e: "🏠", n: "la maison" },       { e: "🚌", n: "le bus" },           { e: "🚆", n: "le train" },
        { e: "✈️", n: "l'avion" },         { e: "🚲", n: "le vélo" },          { e: "🚗", n: "la voiture" },
        { e: "⛵", n: "le bateau" },
        { e: "🍕", n: "la pizza" },        { e: "🍦", n: "la glace" },         { e: "🍰", n: "le gâteau" },
        { e: "🍎", n: "la pomme" },        { e: "🍌", n: "la banane" },        { e: "🍇", n: "le raisin" },
        { e: "🍓", n: "la fraise" },       { e: "🥖", n: "la baguette" },      { e: "🧀", n: "le fromage" },
        { e: "🍔", n: "le hamburger" },    { e: "🍟", n: "les frites" },       { e: "☕", n: "le café" },
        { e: "🍫", n: "le chocolat" },     { e: "🥕", n: "la carotte" },       { e: "🍅", n: "la tomate" },
        { e: "🥐", n: "le croissant" },    { e: "🍽️", n: "l'assiette" },       { e: "🍊", n: "l'orange" },
        { e: "🍋", n: "le citron" },       { e: "🥚", n: "l'œuf" },
        { e: "☂️", n: "le parapluie" },    { e: "📷", n: "l'appareil photo" }, { e: "🎟️", n: "le billet" },
        { e: "🎈", n: "le ballon" },       { e: "🎁", n: "le cadeau" },        { e: "🔑", n: "la clé" },
        { e: "👓", n: "les lunettes" },    { e: "👜", n: "le sac" },           { e: "⌚", n: "la montre" },
        { e: "📱", n: "le téléphone" },    { e: "🎒", n: "le sac à dos" },      { e: "🕯️", n: "la bougie" },
        { e: "🛏️", n: "le lit" },          { e: "✏️", n: "le crayon" },         { e: "📚", n: "les livres" },
        { e: "🎸", n: "la guitare" },      { e: "🎹", n: "le piano" },          { e: "🎤", n: "le micro" },
        { e: "⚽", n: "le ballon de foot" }, { e: "🥾", n: "la chaussure de randonnée" }, { e: "🧢", n: "la casquette" },
        { e: "🧣", n: "l'écharpe" },       { e: "🧦", n: "la chaussette" },
        { e: "☀️", n: "le soleil" },       { e: "🌙", n: "la lune" },          { e: "⭐", n: "l'étoile" },
        { e: "🌈", n: "l'arc-en-ciel" },   { e: "🌹", n: "la rose" },          { e: "🌻", n: "le tournesol" },
        { e: "🌳", n: "l'arbre" },         { e: "🌵", n: "le cactus" },        { e: "🍄", n: "le champignon" },
        { e: "❄️", n: "la neige" },
        { e: "🐶", n: "le chien" },        { e: "🐱", n: "le chat" },          { e: "🐴", n: "le cheval" },
        { e: "🐄", n: "la vache" },        { e: "🐑", n: "le mouton" },        { e: "🐔", n: "la poule" },
        { e: "🦆", n: "le canard" },       { e: "🐟", n: "le poisson" },       { e: "🐢", n: "la tortue" },
        { e: "🐘", n: "l'éléphant" },      { e: "🦁", n: "le lion" },          { e: "🐝", n: "l'abeille" },
        { e: "🦋", n: "le papillon" },     { e: "🐰", n: "le lapin" },         { e: "🐷", n: "le cochon" },
        { e: "🐸", n: "la grenouille" }
    ];

    const LISTEN_GRIDS = [[2, 2], [2, 3], [3, 3]];
    const LISTEN_ROUNDS = 5;

    let picks = [];
    let target = null;
    let listenGood = 0;
    let listenLock = false;

    STARTERS.listen = function startListen() {

        begin("listen");
        listenGood = 0;
        hintFn = listenHint;
        listenRound();
        armHelp();
    };

    function listenRound() {

        if (current !== "listen") return;

        const [cols, rows] = LISTEN_GRIDS[tierOf("listen") - 1];

        listenLock = false;
        picks = shuffle([...VOCAB]).slice(0, cols * rows);
        target = picks[rand(picks.length)];

        board.classList.remove("won");
        sizeBoard(cols, rows, 12);
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
        if (target && current === "listen") say("Touche " + target.n + ".");
    }

    function listenHint() {
        glow(board.children[picks.indexOf(target)]);
        askTarget();
    }

    function onListen(i, card) {

        if (listenLock || done || current !== "listen") return;

        if (picks[i] !== target) {
            badSound();
            card.classList.add("wrong");
            later(() => card.classList.remove("wrong"), 600);
            say(pick("retry") + " Touche " + target.n + ".");
            return;
        }

        listenLock = true;
        card.classList.add("matched");
        okSound();
        listenGood++;

        if (listenGood >= LISTEN_ROUNDS) {
            board.classList.add("won");
            win("listen");
            return;
        }

        say(pick("ok") + " C'est " + target.n + ".");
        later(listenRound, 2400);
    }


    /* ==========================================
       LE DIFFÉRENT : toutes les images sont pareilles
       sauf une. On la touche.
    ========================================== */

    const PAIRS_ODD = [
        ["🍎", "🍅"], ["🐶", "🐱"], ["🌲", "🌴"], ["🚗", "🚕"], ["🌹", "🌷"], ["🏠", "🏢"],
        ["⭐", "🌟"], ["🍋", "🍊"], ["⚽", "🏀"], ["☀️", "🌙"], ["🐻", "🐼"], ["🍓", "🍒"],
        ["🚌", "🚎"], ["🐸", "🐢"], ["🐔", "🐥"], ["🍩", "🍪"], ["🎈", "🎁"], ["🌸", "🌼"],
        ["🐟", "🐠"], ["🍇", "🍆"]
    ];
    const ODD_GRIDS = [[2, 3], [3, 3], [4, 4]];
    const ODD_SERIES = 4;

    let oStreak = 0;
    let oIdx = -1;
    let oLock = false;

    STARTERS.odd = function startOdd() {

        begin("odd");
        oStreak = 0;
        hintFn = () => glow(board.children[oIdx]);

        say("Touche celui qui est différent.");
        later(oddRound, 1800);
        armHelp();
    };

    function oddRound() {

        if (current !== "odd") return;

        const [cols, rows] = ODD_GRIDS[tierOf("odd") - 1];
        const n = cols * rows;
        const [same, odd] = shuffle([...PAIRS_ODD[rand(PAIRS_ODD.length)]]);

        oLock = false;
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

        if (oLock || done || current !== "odd") return;

        if (i !== oIdx) {
            badSound();
            card.classList.add("wrong");
            later(() => card.classList.remove("wrong"), 600);
            return;
        }

        oLock = true;
        card.classList.add("matched");
        okSound();
        oStreak++;

        if (oStreak >= ODD_SERIES) {
            board.classList.add("won");
            win("odd");
            return;
        }

        later(oddRound, 1000);
    }


    /* ==========================================
       COLORIAGE : 24 couleurs, 6 dessins.
       On choisit une couleur, puis on touche une zone.
       On peut toujours changer une couleur.
    ========================================== */

    const COLORS = [
        "#e63946", "#9d0208", "#ff6b9d", "#ffc2d1", "#ff9f1c", "#ffd23f",
        "#fff3a0", "#b7e4c7", "#2ee59d", "#2d9d5b", "#1b5e20", "#9ac400",
        "#7dd3fc", "#00b4d8", "#1e6fd9", "#0b2a6f", "#c9a7ff", "#7b2ff7",
        "#5a189a", "#d2a679", "#8d6e63", "#4e342e", "#9aa0a6", "#1b1b1b"
    ];

    const COLOR_SCENES = [

        // 0 · Montagne et randonnée
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

        // 1 · Foire
        "<rect class='zone' x='0' y='0' width='300' height='300'/>" +
        "<rect class='zone' x='0' y='250' width='300' height='50'/>" +
        "<circle class='zone' cx='40' cy='45' r='22'/>" +
        "<circle class='zone' cx='150' cy='130' r='80'/>" +
        "<circle class='zone' cx='150' cy='130' r='35'/>" +
        "<polygon class='zone' points='10,255 55,185 100,255'/>" +
        "<polygon class='zone' points='205,255 255,190 295,255'/>" +
        "<circle class='zone' cx='255' cy='80' r='16'/>" +
        "<circle class='zone' cx='280' cy='115' r='16'/>" +
        "<circle class='zone' cx='232' cy='110' r='16'/>",

        // 2 · Plage
        "<rect class='zone' x='0' y='0' width='300' height='300'/>" +
        "<circle class='zone' cx='60' cy='60' r='30'/>" +
        "<rect class='zone' x='0' y='150' width='300' height='70'/>" +
        "<path class='zone' d='M0 220 Q150 195 300 225 L300 300 L0 300 Z'/>" +
        "<path class='zone' d='M170 235 A60 60 0 0 1 290 235 Z'/>" +
        "<rect class='zone' x='222' y='195' width='18' height='85'/>" +
        "<polygon class='zone' points='70,170 130,170 118,200 82,200'/>" +
        "<polygon class='zone' points='100,165 100,110 130,165'/>" +
        "<circle class='zone' cx='60' cy='265' r='16'/>",

        // 3 · Maison et jardin
        "<rect class='zone' x='0' y='0' width='300' height='300'/>" +
        "<circle class='zone' cx='45' cy='45' r='26'/>" +
        "<ellipse class='zone' cx='200' cy='50' rx='45' ry='20'/>" +
        "<rect class='zone' x='0' y='230' width='300' height='70'/>" +
        "<rect class='zone' x='90' y='150' width='120' height='80'/>" +
        "<polygon class='zone' points='80,150 150,95 220,150'/>" +
        "<rect class='zone' x='135' y='185' width='30' height='45'/>" +
        "<rect class='zone' x='100' y='165' width='28' height='28'/>" +
        "<rect class='zone' x='172' y='165' width='28' height='28'/>" +
        "<rect class='zone' x='240' y='190' width='18' height='45'/>" +
        "<circle class='zone' cx='249' cy='170' r='32'/>",

        // 4 · Port et bateaux
        "<rect class='zone' x='0' y='0' width='300' height='300'/>" +
        "<circle class='zone' cx='235' cy='55' r='28'/>" +
        "<rect class='zone' x='0' y='170' width='300' height='130'/>" +
        "<polygon class='zone' points='90,200 210,200 190,240 110,240'/>" +
        "<polygon class='zone' points='150,195 150,100 100,195'/>" +
        "<polygon class='zone' points='160,195 160,120 205,195'/>" +
        "<ellipse class='zone' cx='55' cy='235' rx='40' ry='14'/>" +
        "<ellipse class='zone' cx='250' cy='262' rx='40' ry='14'/>",

        // 5 · Fleurs et papillon
        "<rect class='zone' x='0' y='0' width='300' height='300'/>" +
        "<circle class='zone' cx='40' cy='40' r='24'/>" +
        "<rect class='zone' x='0' y='205' width='300' height='95'/>" +
        "<circle class='zone' cx='70' cy='160' r='30'/><circle class='zone' cx='70' cy='160' r='11'/>" +
        "<circle class='zone' cx='150' cy='125' r='34'/><circle class='zone' cx='150' cy='125' r='12'/>" +
        "<circle class='zone' cx='230' cy='165' r='28'/><circle class='zone' cx='230' cy='165' r='10'/>" +
        "<ellipse class='zone' cx='210' cy='70' rx='24' ry='18'/><ellipse class='zone' cx='252' cy='70' rx='24' ry='18'/>" +
        "<ellipse class='zone' cx='231' cy='72' rx='8' ry='24'/>"
    ];

    let cScene = 0;
    let cColor = COLORS[0];
    let cWon = false;

    STARTERS.color = function startColor() {

        begin("color");

        cColor = COLORS[0];
        cWon = false;

        board.classList.add("paintboard");

        board.innerHTML =
            "<svg viewBox='0 0 300 300' class='paint'>" +
            "<g fill='#ffffff' stroke='#1b2a41' stroke-width='3' stroke-linejoin='round'>" +
            COLOR_SCENES[cScene % COLOR_SCENES.length] +
            "</g></svg>" +
            "<div class='palwrap'>" +
            "<button type='button' class='pal-arrow' data-dir='-1' aria-label='Couleurs précédentes'>◀️</button>" +
            "<div class='palette'>" +
            COLORS.map((c, i) =>
                "<button type='button' class='swatch" + (i === 0 ? " on" : "") +
                "' data-c='" + c + "' style='background:" + c + "' aria-label='Couleur'></button>"
            ).join("") +
            "</div>" +
            "<button type='button' class='pal-arrow' data-dir='1' aria-label='Couleurs suivantes'>▶️</button>" +
            "</div>";

        board.onclick = onPaint;

        say("Choisis une couleur, puis touche le dessin.");
    };

    function onPaint(event) {

        const target = event.target;

        const arrow = target.closest && target.closest(".pal-arrow");
        if (arrow) {
            const palette = board.querySelector(".palette");
            if (palette && palette.scrollBy) palette.scrollBy({ left: Number(arrow.dataset.dir) * 190, behavior: "smooth" });
            return;
        }

        const swatch = target.closest && target.closest(".swatch");
        if (swatch) {
            cColor = swatch.dataset.c;
            board.querySelectorAll(".swatch").forEach(s => s.classList.toggle("on", s === swatch));
            tone(520, 0.08);
            return;
        }

        const zone = target.closest && target.closest(".zone");
        if (!zone) return;

        // On peut toujours changer une couleur, même quand le dessin est fini
        zone.setAttribute("fill", cColor);
        tone(380 + rand(300), 0.15);

        if (!cWon && [...board.querySelectorAll(".zone")].every(z => z.hasAttribute("fill"))) {
            cWon = true;
            win("color", true);
            cScene = (cScene + 1) % COLOR_SCENES.length;
            newBtn.classList.add("pulse");
        }
    }


    /* ==========================================
       TAQUIN : une image coupée en pièces, avec une
       case vide. On touche une pièce pour la glisser.
       (Toucher une pièce de la même ligne ou colonne
       que la case vide pousse toute la rangée.)
    ========================================== */

    const SLIDE_TIERS = [[2, 3], [3, 3], [4, 4]];
    const SLIDE_SCRAMBLE = [14, 60, 120];

    let sScene = 1;
    let sOrder = [];

    const slideN = () => { const [c, r] = SLIDE_TIERS[tierOf("slide") - 1]; return c * r; };
    const slideSolved = () => sOrder.every((v, i) => v === i);

    STARTERS.slide = function startSlide() {

        begin("slide");

        const t = tierOf("slide");
        const [cols, rows] = SLIDE_TIERS[t - 1];
        const n = cols * rows;

        sOrder = [...Array(n).keys()];

        // On mélange en jouant des coups autorisés : la partie a toujours une solution
        let blank = n - 1;
        let last = -1;
        for (let k = 0; k < SLIDE_SCRAMBLE[t - 1] || slideSolved(); k++) {
            const options = slideNeighbors(blank, cols, rows).filter(p => p !== last);
            const m = options[rand(options.length)];
            [sOrder[blank], sOrder[m]] = [sOrder[m], sOrder[blank]];
            last = blank;
            blank = m;
        }

        sizeBoard(cols, rows);
        renderSlide(false);

        hintFn = slideHint;
        viewFn = () => showModel(sScene);
        armHelp();
    };

    function slideNeighbors(p, cols, rows) {
        const r = Math.floor(p / cols), c = p % cols, out = [];
        if (r > 0) out.push(p - cols);
        if (r < rows - 1) out.push(p + cols);
        if (c > 0) out.push(p - 1);
        if (c < cols - 1) out.push(p + 1);
        return out;
    }

    function renderSlide(showAll) {

        const [cols, rows] = SLIDE_TIERS[tierOf("slide") - 1];
        const n = cols * rows;
        const model = board.querySelector(".model");

        board.innerHTML = "";

        sOrder.forEach((piece, position) => {

            const tile = document.createElement("div");
            tile.className = "tile";

            if (piece === n - 1 && !showAll) {
                tile.classList.add("blank");
            } else {
                if (piece === position) tile.classList.add("right");
                tile.style.backgroundImage = sceneUrl(sScene);
                tile.style.backgroundSize = (cols * 100) + "% " + (rows * 100) + "%";
                tile.style.backgroundPosition =
                    ((piece % cols) / (cols - 1) * 100) + "% " +
                    (Math.floor(piece / cols) / (rows - 1) * 100) + "%";
            }

            tile.addEventListener("click", () => onSlide(position));
            board.appendChild(tile);
        });

        if (model) board.appendChild(model);
    }

    function onSlide(p) {

        if (done) return;

        const [cols] = SLIDE_TIERS[tierOf("slide") - 1];
        const n = slideN();
        const b = sOrder.indexOf(n - 1);

        if (p === b) return;

        const sameRow = Math.floor(p / cols) === Math.floor(b / cols);
        const sameCol = p % cols === b % cols;

        if (!sameRow && !sameCol) {
            badSound();
            return;
        }

        // On pousse toute la rangée vers la case vide
        const d = sameRow ? (p > b ? 1 : -1) : (p > b ? cols : -cols);
        let at = b;
        while (at !== p) {
            sOrder[at] = sOrder[at + d];
            at += d;
        }
        sOrder[p] = n - 1;

        tone(330, 0.06);

        if (slideSolved()) {
            renderSlide(true);
            board.classList.add("won");
            sScene = (sScene + 1) % SCENES.length;
            win("slide");
            return;
        }

        renderSlide(false);
    }

    // 💡 : on éclaire une pièce qui se rapproche de sa place
    function slideHint() {

        const [cols, rows] = SLIDE_TIERS[tierOf("slide") - 1];
        const n = slideN();
        const b = sOrder.indexOf(n - 1);
        const dist = (piece, p) =>
            Math.abs(Math.floor(p / cols) - Math.floor(piece / cols)) + Math.abs((p % cols) - (piece % cols));

        const options = slideNeighbors(b, cols, rows);
        const best = options.find(p => dist(sOrder[p], b) < dist(sOrder[p], p)) || options[0];

        glow(board.children[best]);
    }


    /* ==========================================
       QUI VA AVEC QUI : on touche deux images qui
       vont ensemble (parapluie et pluie…).
    ========================================== */

    const LINKS = [
        ["☂️", "🌧️"], ["🍦", "☀️"], ["🥾", "🏔️"], ["🔑", "🚪"], ["🐝", "🌻"], ["🐶", "🦴"],
        ["🐒", "🍌"], ["🐰", "🥕"], ["🎣", "🐟"], ["🚗", "⛽"], ["✏️", "📓"], ["🎬", "🍿"],
        ["🧦", "👟"], ["🛏️", "🌙"], ["📷", "🖼️"], ["☕", "🥐"], ["🧣", "❄️"], ["🍳", "🥚"]
    ];
    const LINK_PAIRS = [3, 6, 8];
    const LINK_GRIDS = [[2, 3], [3, 4], [4, 4]];

    let linkCards = [];
    let linkSel = -1;
    let linkLock = false;

    STARTERS.link = function startLink() {

        begin("link");

        const t = tierOf("link");
        const [cols, rows] = LINK_GRIDS[t - 1];
        const chosen = shuffle([...LINKS]).slice(0, LINK_PAIRS[t - 1]);

        linkCards = shuffle(chosen.flatMap((pair, k) => [
            { e: pair[0], k, matched: false }, { e: pair[1], k, matched: false }
        ]));
        linkSel = -1;
        linkLock = false;

        sizeBoard(cols, rows, 8);
        renderLink();

        hintFn = linkHint;

        say("Touche deux images qui vont ensemble.");
        armHelp();
    };

    function renderLink(wrongPair) {

        board.innerHTML = "";

        linkCards.forEach((card, i) => {

            const button = document.createElement("button");
            button.type = "button";
            button.className = "card up pic";
            button.textContent = card.e;

            if (card.matched) button.classList.add("matched");
            if (i === linkSel) button.classList.add("picked");
            if (wrongPair && wrongPair.includes(i)) button.classList.add("wrong");

            button.addEventListener("click", () => onLink(i));
            board.appendChild(button);
        });
    }

    function onLink(i) {

        if (linkLock || done || linkCards[i].matched) return;

        if (linkSel === -1) {
            linkSel = i;
            tone(440, 0.08);
            renderLink();
            return;
        }

        if (linkSel === i) {
            linkSel = -1;
            renderLink();
            return;
        }

        const a = linkSel;
        linkSel = -1;

        if (linkCards[a].k === linkCards[i].k) {

            linkCards[a].matched = true;
            linkCards[i].matched = true;
            okSound();
            renderLink();

            if (linkCards.every(c => c.matched)) {
                board.classList.add("won");
                win("link");
            } else {
                say(pick("ok"));
            }
            return;
        }

        badSound();
        linkLock = true;
        renderLink([a, i]);
        say(pick("retry"));

        later(() => { linkLock = false; if (current === "link") renderLink(); }, 700);
    }

    // 💡 : on éclaire une paire qui va ensemble
    function linkHint() {

        const free = linkCards.map((c, i) => ({ c, i })).filter(x => !x.c.matched);
        if (!free.length) return;

        const first = free[0];
        const twin = free.find(x => x.i !== first.i && x.c.k === first.c.k);

        glow(board.children[first.i]);
        if (twin) glow(board.children[twin.i]);
    }


    /* ==========================================
       DISPARU : on regarde des objets, l'un d'eux
       disparaît. Quel est-il ?
    ========================================== */

    const GONE_ITEMS = [3, 5, 8];
    const GONE_CHOICES = [3, 3, 4];
    const GONE_MEMO = [4000, 5000, 6000];
    const GONE_ROUNDS = 4;

    let gItems = [];
    let gMissing = -1;
    let gChoices = [];
    let gPhase = "idle";
    let gGood = 0;

    STARTERS.gone = function startGone() {

        begin("gone");
        gGood = 0;
        hintFn = () => glow(board.querySelector(".choice.right-choice"));
        goneRound();
    };

    function drawGone(showChoices, solvedCell) {

        const n = gItems.length;
        const cols = n <= 3 ? 3 : n <= 6 ? 3 : 4;
        const rows = Math.ceil(n / cols);

        board.classList.add("gone");
        board.innerHTML = "";

        const cue = document.createElement("div");
        cue.className = "cue";
        cue.textContent = showChoices ? "❓" : "👀";
        board.appendChild(cue);

        const grid = document.createElement("div");
        grid.className = "gone-grid";
        grid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
        grid.style.gridTemplateRows = "repeat(" + rows + ", 1fr)";
        grid.style.aspectRatio = cols + " / " + rows;

        gItems.forEach((e, i) => {
            const cell = document.createElement("div");
            cell.className = "card up pic";
            if (showChoices && i === gMissing && !solvedCell) {
                cell.classList.add("gap");
                cell.textContent = "";
            } else {
                cell.textContent = e;
                if (solvedCell && i === gMissing) cell.classList.add("matched");
            }
            grid.appendChild(cell);
        });
        board.appendChild(grid);

        if (showChoices) {
            const row = document.createElement("div");
            row.className = "choices";
            gChoices.forEach(e => {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "card up pic choice" + (e === gItems[gMissing] ? " right-choice" : "");
                b.textContent = e;
                b.addEventListener("click", () => onGone(e, b));
                row.appendChild(b);
            });
            board.appendChild(row);
        }
    }

    function goneRound() {

        if (current !== "gone") return;

        const t = tierOf("gone");
        const pool = shuffle(VOCAB.map(v => v.e));

        gItems = pool.slice(0, GONE_ITEMS[t - 1]);
        gMissing = rand(gItems.length);
        gChoices = shuffle([gItems[gMissing], ...pool.slice(GONE_ITEMS[t - 1], GONE_ITEMS[t - 1] + GONE_CHOICES[t - 1] - 1)]);
        gPhase = "memo";

        drawGone(false);
        say("Regarde bien.");

        later(() => {
            gPhase = "ask";
            drawGone(true);
            say("Qu'est-ce qui a disparu ?");
            armHelp();
        }, GONE_MEMO[t - 1]);
    }

    function onGone(e, button) {

        if (gPhase !== "ask" || done || current !== "gone") return;

        if (e !== gItems[gMissing]) {
            badSound();
            button.classList.add("wrong");
            later(() => button.classList.remove("wrong"), 600);
            say(pick("retry"));
            return;
        }

        gPhase = "wait";
        okSound();
        gGood++;
        drawGone(true, true);

        if (gGood >= GONE_ROUNDS) {
            board.classList.add("won");
            win("gone");
            return;
        }

        say(pick("ok"));
        later(goneRound, 2200);
    }


    /* ==========================================
       MATCH-3 : on touche un bonbon, puis son voisin,
       pour aligner 3 bonbons identiques ou plus.
       Pas de limite de coups : on joue tranquillement.
    ========================================== */

    const CANDIES = ["🍎", "🍊", "🍋", "🍇", "🍏", "🍬"];
    const M3_TIERS = [
        { n: 5, kinds: 4, target: 15 },
        { n: 6, kinds: 5, target: 25 },
        { n: 7, kinds: 6, target: 40 }
    ];

    let m3 = null;

    STARTERS.match3 = function startMatch3() {

        begin("match3");

        const t = M3_TIERS[tierOf("match3") - 1];
        m3 = { n: t.n, kinds: t.kinds, target: t.target, grid: [], sel: null, busy: false, cleared: 0 };
        m3NewGrid();

        board.style.display = "flex";
        board.style.flexDirection = "column";
        board.style.alignItems = "center";
        board.style.gap = "10px";
        board.style.width = "min(94vw, 54dvh)";

        renderM3();

        hintFn = m3Hint;

        say("Touche un bonbon, puis son voisin, pour aligner trois bonbons pareils.");
        armHelp();
    };

    function m3Matches(grid) {

        const n = grid.length;
        const found = new Set();

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const v = grid[r][c];
                if (v === null) continue;
                if (c + 2 < n && grid[r][c + 1] === v && grid[r][c + 2] === v) {
                    found.add(r + "," + c); found.add(r + "," + (c + 1)); found.add(r + "," + (c + 2));
                }
                if (r + 2 < n && grid[r + 1][c] === v && grid[r + 2][c] === v) {
                    found.add(r + "," + c); found.add((r + 1) + "," + c); found.add((r + 2) + "," + c);
                }
            }
        }

        return found;
    }

    function m3FindMove() {

        const g = m3.grid, n = m3.n;

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                for (const [dr, dc] of [[0, 1], [1, 0]]) {
                    const r2 = r + dr, c2 = c + dc;
                    if (r2 >= n || c2 >= n) continue;
                    [g[r][c], g[r2][c2]] = [g[r2][c2], g[r][c]];
                    const ok = m3Matches(g).size > 0;
                    [g[r][c], g[r2][c2]] = [g[r2][c2], g[r][c]];
                    if (ok) return [{ r, c }, { r: r2, c: c2 }];
                }
            }
        }

        return null;
    }

    // Une grille de départ sans alignement, mais avec au moins un coup possible
    function m3NewGrid() {

        const n = m3.n;

        do {
            m3.grid = [];
            for (let r = 0; r < n; r++) {
                m3.grid.push([]);
                for (let c = 0; c < n; c++) {
                    let v;
                    do {
                        v = rand(m3.kinds);
                    } while (
                        (c >= 2 && m3.grid[r][c - 1] === v && m3.grid[r][c - 2] === v) ||
                        (r >= 2 && m3.grid[r - 1][c] === v && m3.grid[r - 2][c] === v)
                    );
                    m3.grid[r].push(v);
                }
            }
        } while (!m3FindMove());
    }

    function renderM3(popping) {

        const n = m3.n;
        const lit = Math.min(10, Math.floor(10 * m3.cleared / m3.target));

        board.innerHTML = "";

        const bar = document.createElement("div");
        bar.className = "m3bar";
        bar.textContent = "⭐".repeat(lit) + "☆".repeat(10 - lit);
        board.appendChild(bar);

        const grid = document.createElement("div");
        grid.className = "m3grid";
        grid.style.gridTemplateColumns = "repeat(" + n + ", 1fr)";

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {

                const button = document.createElement("button");
                button.type = "button";
                button.className = "card up candy";
                button.textContent = m3.grid[r][c] === null ? "" : CANDIES[m3.grid[r][c]];
                button.dataset.r = r;
                button.dataset.c = c;

                if (m3.sel && m3.sel.r === r && m3.sel.c === c) button.classList.add("picked");
                if (popping && popping.has(r + "," + c)) button.classList.add("popping");

                button.addEventListener("click", () => onM3(r, c));
                grid.appendChild(button);
            }
        }

        board.appendChild(grid);
    }

    function onM3(r, c) {

        if (!m3 || m3.busy || done) return;

        if (!m3.sel) {
            m3.sel = { r, c };
            tone(440, 0.06);
            renderM3();
            return;
        }

        const a = m3.sel;
        m3.sel = null;

        if (a.r === r && a.c === c) { renderM3(); return; }

        if (Math.abs(a.r - r) + Math.abs(a.c - c) !== 1) {
            m3.sel = { r, c };
            renderM3();
            return;
        }

        m3Swap(a, { r, c });
    }

    function m3Swap(a, b) {

        const g = m3.grid;
        const flip = () => { [g[a.r][a.c], g[b.r][b.c]] = [g[b.r][b.c], g[a.r][a.c]]; };

        m3.busy = true;
        flip();
        renderM3();

        if (!m3Matches(g).size) {
            // Aucun alignement : les bonbons reprennent leur place
            badSound();
            later(() => { flip(); renderM3(); m3.busy = false; }, 350);
            return;
        }

        later(m3Resolve, 250);
    }

    function m3Resolve() {

        if (current !== "match3") return;

        const found = m3Matches(m3.grid);

        if (!found.size) {
            m3.busy = false;
            m3After();
            return;
        }

        m3.cleared += found.size;
        tone(600 + rand(300), 0.15, "sine");
        renderM3(found);

        later(() => {
            found.forEach(k => {
                const [r, c] = k.split(",").map(Number);
                m3.grid[r][c] = null;
            });
            m3Gravity();
            renderM3();
            later(m3Resolve, 300);
        }, 280);
    }

    function m3Gravity() {

        const n = m3.n;

        for (let c = 0; c < n; c++) {
            const col = [];
            for (let r = n - 1; r >= 0; r--) if (m3.grid[r][c] !== null) col.push(m3.grid[r][c]);
            while (col.length < n) col.push(rand(m3.kinds));
            for (let r = n - 1, i = 0; r >= 0; r--, i++) m3.grid[r][c] = col[i];
        }
    }

    function m3After() {

        renderM3();

        if (m3.cleared >= m3.target) {
            board.classList.add("won");
            win("match3");
            return;
        }

        // Plus aucun coup possible : on mélange
        if (!m3FindMove()) {
            m3NewGrid();
            renderM3();
            say("Je mélange les bonbons.");
        }
    }

    // 💡 : on éclaire deux bonbons à échanger
    function m3Hint() {

        if (m3.busy) return;

        const move = m3FindMove();
        if (!move) return;

        const cells = board.querySelectorAll(".candy");
        move.forEach(p => glow(cells[p.r * m3.n + p.c]));
    }


    /* ==========================================
       CARNET DE RÉCOMPENSES 🏆
       Une médaille par jeu : 🥉 1re victoire,
       🥈 5 victoires, 🥇 15 victoires.
    ========================================== */

    const MENU_ORDER = ["puzzle", "slide", "memory", "link", "gone", "match3",
                        "bubbles", "piano", "simon", "listen", "odd", "color"];

    function peek(id) {
        return store.games[id] || { tier: 1, wins: 0, winsAtTier: 0, stars: 0, last: 0 };
    }

    function showTrophies() {

        current = "trophy";
        hintFn = null;
        viewFn = null;
        resetBoard();
        hideTop();

        menu.hidden = true;
        wrap.hidden = true;
        trophyView.hidden = false;
        bottom.hidden = false;
        trophyBtn.hidden = true;
        resetBtn.hidden = true;
        newBtn.hidden = true;

        let totalStars = 0;
        let medals = 0;

        const cells = MENU_ORDER.map(id => {

            const g = GAMES[id];
            const p = peek(id);
            const m = medalOf(p.wins);

            totalStars += p.stars || 0;
            if (m) medals++;

            return "<div class='tcell'>" +
                "<div class='temoji'>" + g.emoji + "</div>" +
                "<div class='tmedal'>" + (m ? MEDALS[m].emoji : (g.progress ? "⚪" : "🎶")) + "</div>" +
                "<div class='tstars'>" + (p.stars ? "⭐ " + p.stars : "&nbsp;") + "</div>" +
                "</div>";
        }).join("");

        trophyView.innerHTML =
            "<div class='ttotal'>⭐ " + totalStars + " &nbsp; 🏅 " + medals + "</div>" +
            "<div class='tgrid'>" + cells + "</div>";

        say("Regarde tout ce que tu as gagné, " + nameOf() + " !");
    }

    // Résumé pour l'accompagnant (réglages 🔧)
    function summary() {

        let totalStars = 0;
        let totalWins = 0;

        const rows = MENU_ORDER.map(id => {
            const g = GAMES[id];
            const p = peek(id);
            totalStars += p.stars || 0;
            totalWins += p.wins || 0;
            return {
                id, emoji: g.emoji, label: g.label, tiers: g.tiers, progress: g.progress,
                tier: p.tier || 1, wins: p.wins || 0, stars: p.stars || 0,
                medal: medalOf(p.wins || 0), last: p.last || 0
            };
        });

        return { rows, totalStars, totalWins };
    }


    /* ==========================================
       REMISE À ZÉRO 🗑️ (avec confirmation parlée)
    ========================================== */

    resetBtn.addEventListener("click", () => {

        if (!current || !GAMES[current]) return;

        resetOne.textContent = "✔️ " + GAMES[current].emoji;
        resetAll.textContent = "✔️ 🎮";
        resetNo.textContent = "❌";

        resetPanel.classList.add("visible");
        say("Tu veux recommencer quoi ? Touche ce jeu, ou tous les jeux, ou la croix pour annuler.");
    });

    resetOne.addEventListener("click", () => {
        const id = current;
        resetPanel.classList.remove("visible");
        if (!id) return;
        resetProgress(id);
        STARTERS[id]();
        say("C'est fait. On recommence ce jeu à zéro.");
    });

    resetAll.addEventListener("click", () => {
        const id = current;
        resetPanel.classList.remove("visible");
        resetProgress("all");
        if (id && STARTERS[id]) STARTERS[id]();
        say("C'est fait. On recommence tous les jeux à zéro.");
    });

    resetNo.addEventListener("click", () => {
        resetPanel.classList.remove("visible");
        say("D'accord, on continue.");
    });


    /* ---------- Boutons ---------- */

    menu.querySelectorAll(".menu-card").forEach(card => {
        card.addEventListener("click", () => open(card.dataset.game));
    });

    homeBtn.addEventListener("click", close);
    menuBtn.addEventListener("click", showMenu);
    trophyBtn.addEventListener("click", showTrophies);

    newBtn.addEventListener("click", () => {
        if (current && STARTERS[current]) STARTERS[current]();
    });

    // ⭐ : on choisit le niveau (facile, moyen, difficile)
    levelBtn.addEventListener("click", () => {

        if (!current || !GAMES[current] || !GAMES[current].tiers) return;

        const id = current;
        const p = prog(id);

        p.tier = (p.tier % 3) + 1;
        p.winsAtTier = 0;
        saveStore();

        STARTERS[id]();
        say("Niveau " + LEVEL_WORDS[p.tier - 1] + ".");
    });

    return {
        open,
        close,
        isOpen: () => isOpen,
        games: () => Object.keys(STARTERS),
        summary,
        resetProgress,
        // Réservé aux tests automatiques
        _debug: () => ({ current, seq, phase, pos, target, picks, oIdx, popped, speed, done, sOrder, linkCards, gItems, gMissing, gPhase, m3, melody, cards, order, cScene }),
        _setSpeed: (s) => { speed = s; },
        _setGrid: (g) => { if (m3) { m3.grid = g; renderM3(); } },
        _store: () => store
    };

})();
