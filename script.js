/* ==========================================
   NHOVA — version simple
   Aucun serveur, aucune clé : le site fonctionne
   tout seul depuis GitHub Pages.

   - Gros bouton : Elisa dit « météo », « jeux »,
     « musée »… et Nhova ouvre la bonne chose.
   - Les images (🌦️ 🗺️ 🎮) font la même chose
     sans micro.
========================================== */

"use strict";

/* ---------- Éléments ---------- */

const app = document.getElementById("app");
const face = document.getElementById("face");
const statusText = document.getElementById("statusText");
const caption = document.getElementById("caption");
const bigButton = document.getElementById("bigButton");
const bigIcon = document.getElementById("bigIcon");
const replayButton = document.getElementById("replayButton");
const weatherButton = document.getElementById("weatherButton");
const outingsButton = document.getElementById("outingsButton");
const gamesButton = document.getElementById("gamesButton");

const weatherOverlay = document.getElementById("weatherOverlay");
const weatherBody = document.getElementById("weatherBody");
const outingsOverlay = document.getElementById("outingsOverlay");

const adultButton = document.getElementById("adultButton");
const adultModal = document.getElementById("adultModal");
const closeAdult = document.getElementById("closeAdult");
const rateDown = document.getElementById("rateDown");
const rateUp = document.getElementById("rateUp");
const rateValue = document.getElementById("rateValue");
const voicePrev = document.getElementById("voicePrev");
const voiceNext = document.getElementById("voiceNext");
const voiceName = document.getElementById("voiceName");
const optCity = document.getElementById("optCity");
const testVoice = document.getElementById("testVoice");
const diagReco = document.getElementById("diagReco");
const diagSpeech = document.getElementById("diagSpeech");
const diagSecure = document.getElementById("diagSecure");


/* ---------- Réglages (gardés sur l'appareil) ---------- */

const settings = { rate: 0.9, city: "", voice: "" };

try {
    const saved = JSON.parse(localStorage.getItem("nhova-settings") || "{}");
    if (typeof saved.rate === "number") settings.rate = saved.rate;
    if (typeof saved.city === "string") settings.city = saved.city;
    if (typeof saved.voice === "string") settings.voice = saved.voice;
} catch (e) { /* valeurs par défaut */ }

function saveSettings() {
    try {
        localStorage.setItem("nhova-settings", JSON.stringify(settings));
    } catch (e) { /* ignoré */ }
}


/* ---------- État ---------- */

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

const synth = window.speechSynthesis || null;

let state = "idle";          // idle | listening | thinking | speaking | error
let lastReply = "";
let started = false;
let lastTap = 0;
let gotResult = false;
let lastError = "";
let recognition = null;
let recognitionRunning = false;
let voice = null;
let speechToken = 0;
let audioCtx = null;
let wakeLock = null;

const LOOKS = {
    idle:      { face: "😊", icon: "🎤", text: "Touche le gros bouton" },
    listening: { face: "👂", icon: "🎤", text: "Nhova écoute…" },
    thinking:  { face: "🤔", icon: "⏳", text: "Nhova cherche…" },
    speaking:  { face: "😃", icon: "🎤", text: "Nhova parle…" },
    error:     { face: "😕", icon: "🎤", text: "Oups…" }
};

function setState(next) {
    state = next;
    app.dataset.state = next;
    face.textContent = LOOKS[next].face;
    bigIcon.textContent = LOOKS[next].icon;
    statusText.textContent = LOOKS[next].text;
}

const backToIdle = () => {
    if (state === "speaking" || state === "thinking" || state === "error") setState("idle");
};


/* ---------- Petits retours : son, vibration, écran allumé ---------- */

function beep(freq, ms) {
    try {
        audioCtx = audioCtx ||
            new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = freq || 660;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + (ms || 120) / 1000);
    } catch (e) { /* pas grave */ }
}

function buzz(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

async function keepAwake() {
    try {
        if ("wakeLock" in navigator && !wakeLock) {
            wakeLock = await navigator.wakeLock.request("screen");
            wakeLock.addEventListener("release", () => { wakeLock = null; });
        }
    } catch (e) { /* ignoré */ }
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && started) keepAwake();
});

document.addEventListener("contextmenu", e => e.preventDefault());


/* ---------- Voix de Nhova ---------- */

function frenchVoices() {
    if (!synth) return [];
    return synth.getVoices().filter(
        v => v.lang && v.lang.toLowerCase().startsWith("fr")
    );
}

function pickVoice() {
    if (!synth) return;

    const french = frenchVoices();

    // Voix choisie par l'accompagnant, sinon la meilleure voix française trouvée
    voice =
        french.find(v => settings.voice && v.voiceURI === settings.voice) ||
        french.find(v => /google|natural|online|premium/i.test(v.name)) ||
        french[0] ||
        null;
}

if (synth) {
    pickVoice();
    synth.onvoiceschanged = pickVoice;
}

function stopSpeaking() {
    speechToken++;               // invalide les « fin de phrase » en attente
    if (synth) synth.cancel();
}

function speak(text, onDone) {

    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
        if (onDone) onDone();
        return;
    }

    stopSpeaking();

    const myToken = speechToken;
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "fr-FR";
    if (voice) utterance.voice = voice;
    utterance.rate = settings.rate;
    utterance.pitch = 1;

    let done = false;

    const finish = () => {
        if (done || myToken !== speechToken) return;
        done = true;
        clearTimeout(guard);
        if (onDone) onDone();
    };

    // Sécurité : certains navigateurs n'envoient jamais « onend »
    const guard = setTimeout(finish, 4000 + text.length * 120);

    // L'écran passe tout de suite sur « Nhova parle », sans attendre le navigateur
    if (state !== "error") setState("speaking");

    utterance.onstart = () => {
        if (myToken === speechToken && state !== "error") setState("speaking");
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    synth.speak(utterance);
}

// Nhova dit une phrase, qu'on pourra répéter avec 🔁
function tell(text, onDone) {
    lastReply = text;
    caption.textContent = text;
    speak(text, onDone || backToIdle);
}

// Utilisé par les jeux pour encourager Elisa
window.nhovaSay = (text) => speak(text, backToIdle);

function fail(captionText, spokenText) {
    setState("error");
    caption.textContent = captionText;
    speak(spokenText, () => setState("idle"));
}


/* ==========================================
   COMPRENDRE CE QUE DIT ELISA
   (quelques mots-clés : pas d'IA, pas de serveur)
========================================== */

const OUTINGS = {
    musee:      { label: "un musée",                    q: "musées près de moi" },
    restaurant: { label: "un restaurant",               q: "restaurants près de moi" },
    cinema:     { label: "un cinéma",                   q: "cinéma près de moi" },
    rando:      { label: "une randonnée",               q: "randonnées près de moi" },
    foire:      { label: "une foire ou une fête foraine", q: "fête foraine près de moi" },
    balade:     { label: "un parc pour se balader",     q: "parcs et jardins près de moi" }
};

// Du plus précis au plus général
const RULES = [
    { re: /\bpuzzle/,                                  intent: { type: "game", game: "puzzle" } },
    { re: /\bpaire|\bmemoire|\bmemory/,                intent: { type: "game", game: "memory" } },
    { re: /\bbulle/,                                   intent: { type: "game", game: "bubbles" } },
    { re: /\bmusique|\bpiano|\bchanson|\bchanter/,     intent: { type: "game", game: "piano" } },
    { re: /\bsimon|\bsuite/,                           intent: { type: "game", game: "simon" } },
    { re: /\becoute|\becouter/,                        intent: { type: "game", game: "listen" } },
    { re: /\bdifferent|\bintrus/,                      intent: { type: "game", game: "odd" } },
    { re: /\bcolori|\bdessin|\bpeinture|\bpeindre/,    intent: { type: "game", game: "color" } },

    { re: /\bmeteo|\btemps\b|\bpluie|\bpleu|\bparapluie|\bsoleil|\bchaud|\bfroid|\bneige|\bnuage|\bvent\b/,
                                                       intent: { type: "weather" } },

    { re: /\bmusee|\bexposition|\bexpo\b/,             intent: { type: "outing", key: "musee" } },
    { re: /\brestaurant|\bresto|\bmanger|\bdejeuner|\bdiner|\bfaim/,
                                                       intent: { type: "outing", key: "restaurant" } },
    { re: /\bcinema|\bfilm/,                           intent: { type: "outing", key: "cinema" } },
    { re: /\brando|\bmarche\b|\bmontagne|\bsentier/,   intent: { type: "outing", key: "rando" } },
    { re: /\bfoire|\bfete|\bevenement|\bmanege|\bgrande roue/,
                                                       intent: { type: "outing", key: "foire" } },
    { re: /\bbalade|\bpromenade|\bparc\b|\bjardin|\bpromener/,
                                                       intent: { type: "outing", key: "balade" } },

    { re: /\bjeu|\bjouer|\bjoue\b|\bjoues\b/,          intent: { type: "games" } },
    { re: /\bsortie|\bsortir|\bidee/,                  intent: { type: "outings" } },
    { re: /\brepete|\bencore|\bpardon/,                intent: { type: "repeat" } },
    { re: /\bbonjour|\bsalut|\bcoucou|\bhello/,        intent: { type: "hello" } }
];

function normalize(text) {
    return String(text)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9' ]/g, " ");
}

function parseIntent(text) {
    const t = normalize(text);
    const rule = RULES.find(r => r.re.test(t));
    return rule ? rule.intent : { type: "unknown" };
}

const HELP =
    "Tu peux me demander la météo, une idée de sortie, ou un jeu. " +
    "Tu peux aussi toucher une image.";

function handleCommand(text) {

    const intent = parseIntent(text);

    switch (intent.type) {
        case "weather": showWeather(); break;
        case "outing":  openMaps(intent.key); break;
        case "outings": openOutings(); break;
        case "game":    openGame(intent.game); break;
        case "games":   openGame(); break;
        case "repeat":  replay(); break;
        case "hello":   tell("Bonjour Elisa ! " + HELP); break;
        default:
            tell("Je n'ai pas compris. " + HELP);
    }
}


/* ---------- Écoute (une seule fois par appui, sans boucle) ---------- */

if (SpeechRecognition) {

    recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { recognitionRunning = true; };

    recognition.onresult = (event) => {

        let text = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) text += event.results[i][0].transcript;
        }

        text = text.trim();

        if (text) {
            gotResult = true;
            caption.textContent = "« " + text + " »";
            handleCommand(text);
        }
    };

    recognition.onerror = (event) => { lastError = event.error || ""; };

    recognition.onend = () => {

        recognitionRunning = false;

        if (state !== "listening" || gotResult) return;

        if (lastError === "aborted") { setState("idle"); return; }

        if (lastError === "not-allowed" || lastError === "service-not-allowed") {
            fail("Le micro est bloqué : il faut l'autoriser dans les réglages du navigateur. Les images fonctionnent sans micro.",
                 "Je ne peux pas utiliser le micro. Touche les images à la place.");
            return;
        }

        if (lastError === "audio-capture") {
            fail("Micro introuvable. Les images fonctionnent sans micro.",
                 "Je ne trouve pas le micro. Touche les images à la place.");
            return;
        }

        if (lastError === "network") {
            fail("Pas de connexion pour la reconnaissance vocale. Les images fonctionnent sans micro.",
                 "Je n'ai pas internet pour t'écouter. Touche les images à la place.");
            return;
        }

        // Silence : on le dit gentiment, sans réessayer en boucle
        tell("Je n'ai rien entendu. Touche le gros bouton, puis dis météo, sorties ou jeux.");
    };
}

function startListening() {

    if (!recognition) {
        fail("Ce navigateur ne sait pas écouter. Utiliser Chrome. Les images fonctionnent sans micro.",
             "Je ne peux pas t'entendre avec ce navigateur. Touche les images à la place.");
        return;
    }

    stopSpeaking();

    gotResult = false;
    lastError = "";

    setState("listening");
    beep(660, 120);
    buzz(30);

    // Petit délai : le bip ne doit pas être entendu par le micro
    setTimeout(() => {
        if (state !== "listening") return;
        try {
            recognition.start();
        } catch (e) {
            console.warn("Reconnaissance :", e);
        }
    }, 250);
}


/* ==========================================
   MÉTÉO (Open-Meteo : gratuit, sans clé)
========================================== */

const WEATHER = {
    0:  ["☀️", "grand soleil"],           1:  ["🌤️", "plutôt beau"],
    2:  ["⛅", "quelques nuages"],         3:  ["☁️", "ciel couvert"],
    45: ["🌫️", "du brouillard"],          48: ["🌫️", "du brouillard"],
    51: ["🌦️", "un peu de bruine"],       53: ["🌦️", "de la bruine"],      55: ["🌧️", "de la bruine"],
    56: ["🌧️", "de la bruine"],           57: ["🌧️", "de la bruine"],
    61: ["🌧️", "un peu de pluie"],        63: ["🌧️", "de la pluie"],       65: ["🌧️", "beaucoup de pluie"],
    66: ["🌧️", "de la pluie"],            67: ["🌧️", "de la pluie"],
    71: ["❄️", "un peu de neige"],         73: ["❄️", "de la neige"],        75: ["❄️", "beaucoup de neige"],
    77: ["❄️", "de la neige"],
    80: ["🌦️", "quelques averses"],       81: ["🌧️", "des averses"],        82: ["🌧️", "de fortes averses"],
    85: ["🌨️", "des averses de neige"],   86: ["🌨️", "des averses de neige"],
    95: ["⛈️", "de l'orage"],             96: ["⛈️", "de l'orage"],        99: ["⛈️", "de l'orage"]
};

const weatherLook = code => WEATHER[code] || ["🌡️", "temps variable"];

let place = null;            // { lat, lon, at }
let weatherText = "";

function getPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error("pas de géolocalisation")); return; }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            err => reject(err),
            { timeout: 8000, maximumAge: 600000 }
        );
    });
}

async function getJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const r = await fetch(url, { signal: controller.signal });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.json();
    } finally {
        clearTimeout(timer);
    }
}

async function geocodeCity(city) {
    for (const suffix of ["&countryCode=FR", ""]) {
        const d = await getJson(
            "https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=" +
            encodeURIComponent(city) + suffix
        );
        const g = d.results && d.results[0];
        if (g) return { lat: g.latitude, lon: g.longitude };
    }
    return null;
}

async function getPlace() {

    // On garde la position 15 minutes
    if (place && Date.now() - place.at < 15 * 60 * 1000) return place;

    let found = null;

    try {
        found = await getPosition();
    } catch (e) {
        if (settings.city) found = await geocodeCity(settings.city);
    }

    if (!found) throw new Error("no-place");

    place = { ...found, at: Date.now() };
    return place;
}

function weatherSentence(w) {

    const parts = [];
    const [, descToday] = weatherLook(w.today.code);
    const [, descTomorrow] = weatherLook(w.tomorrow.code);

    parts.push(
        "Maintenant, il fait " + w.now + " degrés. " +
        "Aujourd'hui, " + descToday + ", avec " + w.today.max + " degrés au maximum."
    );

    if (w.today.rain >= 60) parts.push("Il va pleuvoir, prends un parapluie.");
    else if (w.today.rain >= 30) parts.push("Il peut pleuvoir, prends un parapluie au cas où.");

    parts.push(
        "Demain, " + descTomorrow + ", de " + w.tomorrow.min + " à " + w.tomorrow.max + " degrés."
    );

    if (w.today.max >= 26) parts.push("Il fait chaud : bois de l'eau et mets de la crème solaire.");
    else if (w.today.max <= 12) parts.push("Il fait froid : mets une veste bien chaude.");

    return parts.join(" ");
}

function weatherAdvice(w) {
    const icons = [];
    if (Math.max(w.today.rain, w.tomorrow.rain) >= 40) icons.push("☂️");
    if (w.today.max >= 26) icons.push("🧴", "💧");
    if (w.today.max <= 12) icons.push("🧥");
    if (!icons.length) icons.push("😎");
    return icons.join(" ");
}

function renderWeather(w) {

    const card = (label, day, extra) => {
        const [emoji] = weatherLook(day.code);
        return "<div class='wcard'><div class='wicon'>" + emoji + "</div><div>" +
            "<div class='wlabel'>" + label + "</div>" +
            "<div class='wtemp'>" + day.max + "° <small>" + day.min + "°</small></div>" +
            "<div class='wrain'>☂️ " + day.rain + " %</div>" +
            (extra || "") + "</div></div>";
    };

    weatherBody.innerHTML =
        card("Aujourd'hui", w.today, "<div class='wnow'>Maintenant : " + w.now + "°</div>") +
        card("Demain", w.tomorrow) +
        "<div class='advice'>" + weatherAdvice(w) + "</div>";
}

async function fetchWeather() {

    const p = await getPlace();

    const d = await getJson(
        "https://api.open-meteo.com/v1/forecast?latitude=" + p.lat + "&longitude=" + p.lon +
        "&current=temperature_2m,weather_code" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
        "&timezone=auto&forecast_days=2"
    );

    const day = i => ({
        code: d.daily.weather_code[i],
        max: Math.round(d.daily.temperature_2m_max[i]),
        min: Math.round(d.daily.temperature_2m_min[i]),
        rain: Math.round(d.daily.precipitation_probability_max[i] || 0)
    });

    return { now: Math.round(d.current.temperature_2m), today: day(0), tomorrow: day(1) };
}

async function showWeather() {

    closeOverlays();
    weatherOverlay.classList.add("visible");
    weatherBody.innerHTML = "<div class='wloading'>⏳</div>";
    setState("thinking");

    try {

        const w = await fetchWeather();

        renderWeather(w);
        weatherText = weatherSentence(w);

        tell(weatherText);

    } catch (error) {

        console.warn("Météo :", error);

        const noPlace = error && error.message === "no-place";

        weatherBody.innerHTML =
            "<div class='wloading'>😕</div><p class='wmessage'>" +
            (noPlace
                ? "Position introuvable : autoriser la localisation, ou indiquer une ville dans les réglages (🔧, appui long)."
                : "Impossible d'obtenir la météo. Vérifier la connexion internet.") +
            "</p>";

        weatherText = "";

        setState("error");
        speak(noPlace
            ? "Je ne sais pas où tu es. Demande à quelqu'un de régler ma position."
            : "Je n'arrive pas à avoir la météo. Essaie encore dans un moment.",
            () => setState("idle"));
    }
}


/* ==========================================
   SORTIES : Google Maps « près de moi »
========================================== */

// Réservé aux tests : permet d'intercepter l'ouverture de la carte
window.nhovaGo = (url) => { window.location.href = url; };

function openOutings() {
    closeOverlays();
    outingsOverlay.classList.add("visible");
    setState("idle");
    tell("Choisis une sortie en touchant une image.");
}

function openMaps(key) {

    const o = OUTINGS[key];
    if (!o) return;

    const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(o.q);

    caption.textContent =
        "J'ouvre Google Maps : " + o.q + ". Pour revenir à Nhova, utiliser la flèche retour du téléphone.";
    lastReply = "J'ouvre la carte pour trouver " + o.label + " près de toi.";

    // On parle d'abord (court), puis on ouvre la carte
    speak(lastReply, () => { backToIdle(); window.nhovaGo(url); });
}


/* ==========================================
   JEUX
========================================== */

function gameIsOpen() {
    return typeof NhovaGames !== "undefined" && NhovaGames.isOpen();
}

function openGame(game) {
    closeOverlays();
    stopSpeaking();
    setState("idle");
    NhovaGames.open(game);
}

function closeOverlays() {
    weatherOverlay.classList.remove("visible");
    outingsOverlay.classList.remove("visible");
    if (gameIsOpen()) NhovaGames.close();
}


/* ---------- Boutons ---------- */

function debounced() {
    const now = Date.now();
    if (now - lastTap < 500) return true;
    lastTap = now;
    return false;
}

function greet() {
    setState("speaking");
    tell(
        "Bonjour Elisa ! Je suis Nhova. " +
        "Touche le gros bouton, puis dis météo, sorties ou jeux. " +
        "Tu peux aussi toucher les images. Vas-y, je t'écoute.",
        () => startListening()
    );
}

bigButton.addEventListener("click", () => {

    if (debounced()) return;

    buzz(20);
    keepAwake();

    if (!started) {
        started = true;
        greet();
        return;
    }

    if (state === "thinking") return;

    if (state === "listening") {
        try { recognition.abort(); } catch (e) { /* ignoré */ }
        setState("idle");
        return;
    }

    // idle, speaking ou error : on coupe la voix et on écoute
    startListening();
});

function replay() {

    started = true;

    if (recognitionRunning) {
        try { recognition.abort(); } catch (e) { /* ignoré */ }
    }

    if (!lastReply) {
        tell("Je n'ai encore rien dit. " + HELP);
        return;
    }

    setState("speaking");
    speak(lastReply, backToIdle);
}

replayButton.addEventListener("click", () => {
    if (debounced()) return;
    buzz(20);
    keepAwake();
    replay();
});

weatherButton.addEventListener("click", () => {
    if (debounced()) return;
    buzz(20);
    keepAwake();
    started = true;
    if (recognitionRunning) { try { recognition.abort(); } catch (e) { /* ignoré */ } }
    showWeather();
});

outingsButton.addEventListener("click", () => {
    if (debounced()) return;
    buzz(20);
    keepAwake();
    started = true;
    if (recognitionRunning) { try { recognition.abort(); } catch (e) { /* ignoré */ } }
    openOutings();
});

gamesButton.addEventListener("click", () => {
    if (debounced()) return;
    buzz(20);
    keepAwake();
    started = true;
    if (recognitionRunning) { try { recognition.abort(); } catch (e) { /* ignoré */ } }
    openGame();
});

document.getElementById("weatherHome").addEventListener("click", () => {
    weatherOverlay.classList.remove("visible");
    stopSpeaking();
    setState("idle");
});

document.getElementById("weatherRepeat").addEventListener("click", () => {
    if (debounced()) return;
    if (weatherText) { setState("speaking"); lastReply = weatherText; speak(weatherText, backToIdle); }
    else showWeather();
});

document.getElementById("outingsHome").addEventListener("click", () => {
    outingsOverlay.classList.remove("visible");
    stopSpeaking();
    setState("idle");
});

outingsOverlay.querySelectorAll(".menu-card").forEach(card => {
    card.addEventListener("click", () => {
        // Le menu se ferme au premier appui : un deuxième appui rapproché est ignoré
        if (!outingsOverlay.classList.contains("visible")) return;
        buzz(20);
        outingsOverlay.classList.remove("visible");
        openMaps(card.dataset.out);
    });
});


/* ---------- Réglages accompagnant (appui long de 1,5 s) ---------- */

let holdTimer = null;

adultButton.addEventListener("pointerdown", () => {
    holdTimer = setTimeout(openAdult, 1500);
});

["pointerup", "pointerleave", "pointercancel"].forEach(name => {
    adultButton.addEventListener(name, () => clearTimeout(holdTimer));
});

function refreshAdult() {
    diagReco.textContent = recognition ? "✅ Disponible" : "❌ Indisponible";
    diagSpeech.textContent = synth ? "✅ Disponible" : "❌ Indisponible";
    diagSecure.textContent = window.isSecureContext ? "✅ Oui" : "❌ Non";
    rateValue.textContent = settings.rate.toFixed(1);
    voiceName.textContent = voice ? voice.name : "Auto";
    optCity.value = settings.city;
}

function openAdult() {
    refreshAdult();
    adultModal.classList.add("visible");
}

function closeAdultModal() {
    adultModal.classList.remove("visible");
}

closeAdult.addEventListener("click", closeAdultModal);

adultModal.addEventListener("click", (event) => {
    if (event.target === adultModal) closeAdultModal();
});

rateDown.addEventListener("click", () => {
    settings.rate = Math.max(0.5, Math.round((settings.rate - 0.1) * 10) / 10);
    saveSettings();
    refreshAdult();
});

rateUp.addEventListener("click", () => {
    settings.rate = Math.min(1.4, Math.round((settings.rate + 0.1) * 10) / 10);
    saveSettings();
    refreshAdult();
});

function changeVoice(step) {

    const list = frenchVoices();

    if (!list.length) {
        voiceName.textContent = "Aucune voix";
        return;
    }

    const index = Math.max(0, list.findIndex(v => v === voice));
    const next = list[(index + step + list.length) % list.length];

    settings.voice = next.voiceURI;
    saveSettings();
    pickVoice();
    refreshAdult();

    speak("Bonjour Elisa, voici ma voix. Elle te plaît ?", () => setState("idle"));
}

voicePrev.addEventListener("click", () => changeVoice(-1));
voiceNext.addEventListener("click", () => changeVoice(1));

optCity.addEventListener("input", () => {
    settings.city = optCity.value.trim();
    place = null;                      // on recalcule la position
    saveSettings();
});

testVoice.addEventListener("click", () => {
    speak("Bonjour ! Je suis Nhova. Ma voix fonctionne bien.", () => setState("idle"));
});


/* ---------- Démarrage ---------- */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
    });
}

setState("idle");
