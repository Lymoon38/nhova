/* ==========================================
   NHOVA — assistante vocale pour Elisa
   Tout passe par la voix : pas de lecture,
   pas d'écriture, un seul gros bouton.
========================================== */

"use strict";

const CHAT_ENDPOINT = "/api/chat";
const MAX_HISTORY = 20;

/* ---------- Éléments ---------- */

const app = document.getElementById("app");
const face = document.getElementById("face");
const statusText = document.getElementById("statusText");
const caption = document.getElementById("caption");
const bigButton = document.getElementById("bigButton");
const bigIcon = document.getElementById("bigIcon");
const replayButton = document.getElementById("replayButton");
const gamesButton = document.getElementById("gamesButton");
const optCity = document.getElementById("optCity");

const adultButton = document.getElementById("adultButton");
const adultModal = document.getElementById("adultModal");
const closeAdult = document.getElementById("closeAdult");
const optAuto = document.getElementById("optAuto");
const rateDown = document.getElementById("rateDown");
const rateUp = document.getElementById("rateUp");
const rateValue = document.getElementById("rateValue");
const testVoice = document.getElementById("testVoice");
const resetConv = document.getElementById("resetConv");
const diagReco = document.getElementById("diagReco");
const diagSpeech = document.getElementById("diagSpeech");
const diagSecure = document.getElementById("diagSecure");


/* ---------- Réglages (gardés sur l'appareil) ---------- */

const settings = { auto: true, rate: 0.9, city: "" };

try {
    const saved = JSON.parse(localStorage.getItem("nhova-settings") || "{}");
    if (typeof saved.auto === "boolean") settings.auto = saved.auto;
    if (typeof saved.rate === "number") settings.rate = saved.rate;
    if (typeof saved.city === "string") settings.city = saved.city;
} catch (e) { /* on garde les valeurs par défaut */ }

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
let history = [];
let lastReply = "";
let started = false;
let lastTap = 0;
let gotResult = false;
let lastError = "";
let noSpeechCount = 0;
let recognition = null;
let recognitionRunning = false;
let voice = null;
let speechToken = 0;
let audioCtx = null;
let wakeLock = null;
let place = { lat: null, lon: null, city: "" };
let pendingAction = null;
let waitTimer = null;

const LOOKS = {
    idle:      { face: "😊", icon: "🎤", text: "Touche le gros bouton" },
    listening: { face: "👂", icon: "🎤", text: "Nhova écoute…" },
    thinking:  { face: "🤔", icon: "⏳", text: "Nhova réfléchit…" },
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


/* ---------- Petits retours : son et vibration ---------- */

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

function pickVoice() {
    if (!synth) return;

    const french = synth.getVoices().filter(
        v => v.lang && v.lang.toLowerCase().startsWith("fr")
    );

    voice =
        french.find(v => /google|natural|online|premium/i.test(v.name)) ||
        french[0] ||
        null;
}

if (synth) {
    pickVoice();
    synth.onvoiceschanged = pickVoice;
}

function stopSpeaking() {
    speechToken++;               // invalide les "fin de phrase" en attente
    if (synth) synth.cancel();
}

function speak(text, onDone) {

    if (!synth) {
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

    // Sécurité : certains navigateurs n'envoient jamais "onend"
    const guard = setTimeout(finish, 4000 + text.length * 120);

    utterance.onstart = () => {
        if (myToken === speechToken && state !== "error") setState("speaking");
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    synth.speak(utterance);
}

function gameIsOpen() {
    return typeof NhovaGames !== "undefined" && NhovaGames.isOpen();
}

function afterSpeaking() {
    if (state !== "speaking" && state !== "thinking") return;

    // Nhova a demandé d'ouvrir un jeu : on l'ouvre après sa phrase
    if (pendingAction) {
        const action = pendingAction;
        pendingAction = null;
        setState("idle");
        runAction(action);
        return;
    }

    // Pendant un jeu, on n'écoute pas en arrière-plan
    if (gameIsOpen()) {
        setState("idle");
        return;
    }

    if (settings.auto) {
        setTimeout(() => {
            if (state === "speaking" || state === "thinking") startListening();
        }, 400);
    } else {
        setState("idle");
    }
}


/* ---------- Écoute ---------- */

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
            if (event.results[i].isFinal) {
                text += event.results[i][0].transcript;
            }
        }

        text = text.trim();

        if (text) {
            gotResult = true;
            noSpeechCount = 0;
            caption.textContent = "« " + text + " »";
            askNhova(text);
        }
    };

    recognition.onerror = (event) => { lastError = event.error || ""; };

    recognition.onend = () => {

        recognitionRunning = false;

        // Si on n'écoute plus (réponse reçue, arrêt voulu…), rien à faire
        if (state !== "listening" || gotResult) return;

        if (lastError === "aborted") {
            setState("idle");
            return;
        }

        if (lastError === "not-allowed" || lastError === "service-not-allowed") {
            fail("Le micro est bloqué : il faut l'autoriser dans les réglages du navigateur.",
                 "Je ne peux pas utiliser le micro. Demande à quelqu'un de m'aider.");
            return;
        }

        if (lastError === "audio-capture") {
            fail("Micro introuvable.",
                 "Je ne trouve pas le micro. Demande à quelqu'un de m'aider.");
            return;
        }

        if (lastError === "network") {
            fail("Pas de connexion pour la reconnaissance vocale.",
                 "Je n'ai pas internet. Demande à quelqu'un de m'aider.");
            return;
        }

        // Silence : on réessaie une fois avec douceur, puis on attend
        noSpeechCount++;

        if (settings.auto && noSpeechCount < 2) {
            speak("Je t'écoute. Vas-y, parle.", () => startListening());
        } else {
            noSpeechCount = 0;
            speak("Touche le gros bouton quand tu veux me parler.",
                  () => setState("idle"));
        }
    };
}

function fail(captionText, spokenText) {
    setState("error");
    caption.textContent = captionText;
    speak(spokenText, () => setState("idle"));
}

function startListening() {

    if (!recognition) {
        fail("Ce navigateur ne sait pas écouter. Utiliser Chrome ou Edge.",
             "Je ne peux pas t'entendre avec ce navigateur. Demande à quelqu'un de m'aider.");
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


/* ---------- Conversation avec Claude ---------- */

async function askNhova(text) {

    history.push({ role: "user", content: text });
    setState("thinking");

    // Les recherches peuvent durer : Nhova prévient pour que le silence ne fasse pas peur
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
        if (state === "thinking") {
            speak("Un instant, je cherche.", () => {
                if (state === "speaking") setState("thinking");
            });
        }
    }, 6000);

    try {

        const messages = history.slice(-MAX_HISTORY);
        while (messages.length && messages[0].role !== "user") messages.shift();

        const response = await fetch(CHAT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages, place: currentPlace() })
        });

        if (!response.ok) {

            let detail = "";

            try {
                const err = await response.json();
                detail = err.error || "";
            } catch (e) { /* ignoré */ }

            throw new Error(
                "Serveur " + response.status + (detail ? " : " + detail : "")
            );
        }

        const data = await response.json();
        clearTimeout(waitTimer);
        pendingAction = data.action || null;

        const reply =
            (data.reply || "").trim() ||
            "Je n'ai pas compris. Tu peux répéter ?";

        history.push({ role: "assistant", content: reply });
        lastReply = reply;
        caption.textContent = reply;

        speak(reply, afterSpeaking);

    } catch (error) {

        console.error("Erreur askNhova :", error);

        clearTimeout(waitTimer);
        pendingAction = null;

        history.pop();

        fail("Erreur : " + error.message,
             "Oups, je n'arrive pas à te répondre. Touche le gros bouton pour réessayer.");
    }
}


/* ---------- Gros bouton ---------- */

function greet() {
    locate();
    setState("speaking");
    speak(
        "Bonjour Elisa ! Je suis Nhova. " +
        "Quand tu veux me parler, touche le gros bouton. " +
        "Vas-y, je t'écoute.",
        () => startListening()
    );
}

bigButton.addEventListener("click", () => {

    // Anti-double-tap : les appuis trop rapprochés sont ignorés
    const now = Date.now();
    if (now - lastTap < 500) return;
    lastTap = now;

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

replayButton.addEventListener("click", () => {

    const now = Date.now();
    if (now - lastTap < 500) return;
    lastTap = now;

    buzz(20);
    keepAwake();

    if (!lastReply) {
        speak("Je n'ai encore rien dit. Touche le gros bouton pour me parler.",
              () => setState("idle"));
        return;
    }

    if (recognitionRunning) {
        try { recognition.abort(); } catch (e) { /* ignoré */ }
    }

    started = true;
    setState("speaking");
    speak(lastReply, afterSpeaking);
});


/* ---------- Réglages accompagnant (appui long) ---------- */

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
    optAuto.textContent = settings.auto ? "Oui" : "Non";
    rateValue.textContent = settings.rate.toFixed(1);
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

optAuto.addEventListener("click", () => {
    settings.auto = !settings.auto;
    saveSettings();
    refreshAdult();
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

testVoice.addEventListener("click", () => {
    speak("Bonjour ! Je suis Nhova. Ma voix fonctionne bien.", () => setState("idle"));
});

resetConv.addEventListener("click", () => {
    history = [];
    lastReply = "";
    caption.textContent = "";
    stopSpeaking();
    if (recognitionRunning) {
        try { recognition.abort(); } catch (e) { /* ignoré */ }
    }
    setState("idle");
    closeAdultModal();
});


/* ---------- Position (météo, sorties) ---------- */

function locate() {

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {

        place.lat = pos.coords.latitude;
        place.lon = pos.coords.longitude;

        try {
            const r = await fetch(
                "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=fr" +
                "&lat=" + place.lat + "&lon=" + place.lon
            );

            if (r.ok) {
                const d = await r.json();
                const a = d.address || {};
                place.city = a.city || a.town || a.village || a.municipality || "";
            }
        } catch (e) { /* le nom de la ville est facultatif */ }

    }, () => { /* refusée : on utilisera la ville des réglages */ },
    { timeout: 8000, maximumAge: 600000 });
}

function currentPlace() {
    return {
        lat: place.lat,
        lon: place.lon,
        city: place.city || settings.city || ""
    };
}


/* ---------- Actions demandées par Nhova ---------- */

function runAction(action) {
    if (action && action.type === "open_game" && typeof NhovaGames !== "undefined") {
        NhovaGames.open(action.game);
    }
}

// Utilisé par les jeux pour que Nhova encourage Elisa
window.nhovaSay = (text) => {
    speak(text, () => { if (state === "speaking") setState("idle"); });
};

gamesButton.addEventListener("click", () => {

    const now = Date.now();
    if (now - lastTap < 500) return;
    lastTap = now;

    buzz(20);
    keepAwake();

    if (recognitionRunning) {
        try { recognition.abort(); } catch (e) { /* ignoré */ }
    }

    started = true;
    setState("idle");
    NhovaGames.open();
});

optCity.addEventListener("input", () => {
    settings.city = optCity.value.trim();
    saveSettings();
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
    });
}


/* ---------- Démarrage ---------- */

setState("idle");

console.log("Nhova — reconnaissance :", Boolean(recognition),
            "synthèse :", Boolean(synth));
