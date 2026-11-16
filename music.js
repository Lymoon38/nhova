/* ==========================================
   NHOVA — Musique douce 🎵
   Trois ambiances créées par l'appli elle-même
   (aucun fichier, aucun droit d'auteur) :
   🎹 piano doux · 🌧️ pluie douce · 🌊 vagues
   On touche 🎵 pour passer à la suivante,
   puis la musique s'arrête.
========================================== */

"use strict";

const NhovaMusic = (() => {

    const AMBIANCES = [
        { id: "piano", icon: "🎹", say: "Piano doux" },
        { id: "rain",  icon: "🌧️", say: "Pluie douce" },
        { id: "waves", icon: "🌊", say: "Vagues" }
    ];

    const SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

    const btn = document.getElementById("musicButton");

    let ctx = null;
    let master = null;
    let noise = null;
    let idx = -1;                 // -1 : musique arrêtée
    let volume = 0.5;
    let duck = 1;                 // la musique baisse quand Nhova écoute ou parle
    let stops = [];
    let lastTap = 0;

    const say = (text) => { if (window.nhovaSay) window.nhovaSay(text); };

    function ensure() {
        if (ctx) return true;

        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;

        try {
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0;
            master.connect(ctx.destination);
            return true;
        } catch (e) {
            ctx = null;
            return false;
        }
    }

    function applyGain() {
        if (!ctx || !master) return;
        const target = idx < 0 ? 0 : volume * duck * 0.7;
        try {
            master.gain.setTargetAtTime(target, ctx.currentTime, 0.35);
        } catch (e) {
            master.gain.value = target;
        }
    }

    function noiseBuffer() {
        if (noise) return noise;
        const rate = ctx.sampleRate || 44100;
        noise = ctx.createBuffer(1, rate * 2, rate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return noise;
    }

    function stopAmbiance() {
        stops.forEach(fn => { try { fn(); } catch (e) { /* ignoré */ } });
        stops = [];
    }


    /* ---------- 🎹 Piano doux : notes lentes d'une gamme tranquille ---------- */

    function startPiano() {

        const bus = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        const delay = ctx.createDelay();
        const feedback = ctx.createGain();

        bus.gain.value = 0.9;
        lp.type = "lowpass";
        lp.frequency.value = 2400;
        delay.delayTime.value = 0.5;
        feedback.gain.value = 0.38;

        bus.connect(lp);
        lp.connect(master);
        lp.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(master);

        let step = Math.floor(Math.random() * SCALE.length);

        const note = (freq, when) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = ctx.currentTime + when;

            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 3.2);

            osc.connect(gain);
            gain.connect(bus);
            osc.start(t);
            osc.stop(t + 3.3);
        };

        const phrase = () => {
            const count = 1 + Math.floor(Math.random() * 3);
            for (let k = 0; k < count; k++) {
                step = Math.max(0, Math.min(SCALE.length - 1, step + Math.floor(Math.random() * 5) - 2));
                note(SCALE[step], k * 0.7);
                if (Math.random() < 0.3) note(SCALE[step] / 2, k * 0.7);
            }
        };

        phrase();
        const timer = setInterval(phrase, 3200);

        stops.push(() => {
            clearInterval(timer);
            [bus, lp, delay, feedback].forEach(n => n.disconnect());
        });
    }


    /* ---------- 🌧️ Pluie douce : bruit filtré + petites gouttes ---------- */

    function startRain() {

        const src = ctx.createBufferSource();
        const hp = ctx.createBiquadFilter();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        src.buffer = noiseBuffer();
        src.loop = true;
        hp.type = "highpass";
        hp.frequency.value = 900;
        lp.type = "lowpass";
        lp.frequency.value = 6500;
        gain.gain.value = 0.5;

        src.connect(hp);
        hp.connect(lp);
        lp.connect(gain);
        gain.connect(master);
        src.start();

        const drops = setInterval(() => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            const t = ctx.currentTime;

            osc.type = "sine";
            osc.frequency.value = 1400 + Math.random() * 1800;
            g.gain.setValueAtTime(0.05, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            osc.connect(g);
            g.connect(gain);
            osc.start(t);
            osc.stop(t + 0.13);
        }, 350);

        stops.push(() => {
            clearInterval(drops);
            src.stop();
            [src, hp, lp, gain].forEach(n => n.disconnect());
        });
    }


    /* ---------- 🌊 Vagues : bruit grave qui monte et descend lentement ---------- */

    function startWaves() {

        const src = ctx.createBufferSource();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        const lfo1 = ctx.createOscillator();
        const amp1 = ctx.createGain();
        const lfo2 = ctx.createOscillator();
        const amp2 = ctx.createGain();

        src.buffer = noiseBuffer();
        src.loop = true;
        lp.type = "lowpass";
        lp.frequency.value = 700;
        gain.gain.value = 0.32;

        lfo1.frequency.value = 0.1;
        amp1.gain.value = 0.28;
        lfo2.frequency.value = 0.17;
        amp2.gain.value = 0.12;

        src.connect(lp);
        lp.connect(gain);
        gain.connect(master);
        lfo1.connect(amp1);
        amp1.connect(gain.gain);
        lfo2.connect(amp2);
        amp2.connect(gain.gain);

        src.start();
        lfo1.start();
        lfo2.start();

        stops.push(() => {
            src.stop();
            lfo1.stop();
            lfo2.stop();
            [src, lp, gain, lfo1, amp1, lfo2, amp2].forEach(n => n.disconnect());
        });
    }


    /* ---------- Commandes ---------- */

    function refresh() {
        btn.textContent = idx >= 0 ? AMBIANCES[idx].icon : "🎵";
        btn.classList.toggle("on", idx >= 0);
    }

    function next() {

        if (!ensure()) {
            say("Je n'arrive pas à jouer de la musique sur cet appareil.");
            return;
        }

        try { if (ctx.state === "suspended") ctx.resume(); } catch (e) { /* ignoré */ }

        stopAmbiance();

        idx = idx + 1 >= AMBIANCES.length ? -1 : idx + 1;

        if (idx >= 0) {
            const id = AMBIANCES[idx].id;
            if (id === "piano") startPiano();
            else if (id === "rain") startRain();
            else startWaves();
        }

        refresh();
        applyGain();
        say(idx >= 0 ? AMBIANCES[idx].say : "Musique arrêtée.");
    }

    // La musique baisse quand Nhova écoute (pour ne pas gêner le micro) ou parle
    function mode(state) {
        duck = state === "listening" ? 0.04 : state === "speaking" ? 0.3 : 1;
        applyGain();
    }

    function setVolume(v) {
        volume = Math.max(0.1, Math.min(1, Number(v) || 0.5));
        applyGain();
    }

    btn.addEventListener("click", () => {
        const now = Date.now();
        if (now - lastTap < 400) return;
        lastTap = now;
        next();
    });

    document.addEventListener("visibilitychange", () => {
        if (!ctx) return;
        try {
            if (document.visibilityState === "hidden") ctx.suspend();
            else if (idx >= 0) ctx.resume();
        } catch (e) { /* ignoré */ }
    });

    return {
        next,
        mode,
        setVolume,
        getVolume: () => volume,
        current: () => (idx >= 0 ? AMBIANCES[idx].id : null)
    };

})();
