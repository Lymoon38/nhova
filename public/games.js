/* ==========================================
   NHOVA — Jeux pour Elisa
   Puzzle et paires : tout se joue d'un appui,
   sans glisser et sans lire.
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
    let current = null;               // "puzzle" | "memory" | null

    const say = (text) => { if (window.nhovaSay) window.nhovaSay(text); };

    function cheer() {
        if (typeof beep === "function") {
            beep(523, 120);
            setTimeout(() => beep(659, 120), 150);
            setTimeout(() => beep(784, 240), 300);
        }
        if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]);

        celebrate.hidden = false;
        celebrate.style.animation = "none";
        void celebrate.offsetWidth;
        celebrate.style.animation = "";
        setTimeout(() => { celebrate.hidden = true; }, 2500);
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function sizeBoard(cols, rows) {
        board.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
        board.style.gridTemplateRows = "repeat(" + rows + ", 1fr)";
        board.style.aspectRatio = cols + " / " + rows;
        board.style.width = "min(94vw, " + (58 * cols / rows).toFixed(1) + "dvh)";
        board.classList.remove("won");
    }


    /* ---------- Affichage des écrans ---------- */

    function showMenu() {
        current = null;
        menu.hidden = false;
        wrap.hidden = true;
        bottom.hidden = true;
        hintBtn.hidden = true;
        say("Choisis un jeu. Le puzzle, ou les paires.");
    }

    function open(game) {
        isOpen = true;
        overlay.classList.add("visible");

        if (game === "puzzle") startPuzzle();
        else if (game === "memory") startMemory();
        else showMenu();
    }

    function close() {
        isOpen = false;
        current = null;
        overlay.classList.remove("visible");
        celebrate.hidden = true;
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

    function startPuzzle() {

        current = "puzzle";
        menu.hidden = true;
        wrap.hidden = false;
        bottom.hidden = false;
        hintBtn.hidden = false;
        newBtn.classList.remove("pulse");

        const [cols, rows] = PUZZLE_LEVELS[pLevel];

        order = [...Array(cols * rows).keys()];
        do { shuffle(order); } while (puzzleSolved());

        picked = -1;
        solved = false;

        sizeBoard(cols, rows);
        renderPuzzle();
    }

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

    function startMemory() {

        current = "memory";
        menu.hidden = true;
        wrap.hidden = false;
        bottom.hidden = false;
        hintBtn.hidden = true;
        newBtn.classList.remove("pulse");

        const [cols, rows] = MEMORY_LEVELS[mLevel];
        const pairs = (cols * rows) / 2;

        const chosen = shuffle([...EMOJIS]).slice(0, pairs);

        cards = shuffle([...chosen, ...chosen]).map(e => ({
            emoji: e, up: false, matched: false
        }));

        firstCard = -1;
        lock = false;

        sizeBoard(cols, rows);
        board.style.gap = "8px";
        renderMemory();
    }

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

        if (typeof beep === "function") beep(440, 60);

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

            if (typeof beep === "function") beep(784, 140);

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

        setTimeout(() => {
            cards[a].up = false;
            card.up = false;
            lock = false;
            if (current === "memory") renderMemory();
        }, 1300);
    }


    /* ---------- Boutons ---------- */

    $("playPuzzle").addEventListener("click", startPuzzle);
    $("playMemory").addEventListener("click", startMemory);
    homeBtn.addEventListener("click", close);
    menuBtn.addEventListener("click", showMenu);
    hintBtn.addEventListener("click", puzzleHint);

    newBtn.addEventListener("click", () => {
        if (current === "puzzle") startPuzzle();
        else if (current === "memory") startMemory();
    });

    return { open, close, isOpen: () => isOpen };

})();
