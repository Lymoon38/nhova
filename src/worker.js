/* ==========================================
   NHOVA — Serveur Cloudflare Workers
   Sert le site (dossier public) et relaie les
   messages vers l'API Claude (clé secrète),
   avec trois pouvoirs :
   - météo réelle (Open-Meteo, gratuit)
   - recherche web (sorties, événements…)
   - ouvrir un jeu sur l'écran d'Elisa
========================================== */

let ENV = {};   // variables et secrets Cloudflare, mises à jour à chaque requête

const MODEL = "claude-sonnet-5-5";
const MAX_MESSAGES = 20;
const MAX_LOOPS = 6;

const BASE_PROMPT =
    "Tu es Nhova, une assistante vocale en français, douce, patiente et chaleureuse. " +
    "Tu parles avec Elisa. Elisa ne sait ni lire ni écrire et a des difficultés de " +
    "motricité fine : elle communique uniquement à voix haute. " +
    "Tes réponses sont lues à voix haute par une synthèse vocale. " +
    "Utilise des mots très simples et des phrases courtes. Fais 1 à 3 phrases au maximum. " +
    "Ne lui demande jamais de lire, d'écrire, de taper, de cliquer à un endroit précis " +
    "ni de faire un geste précis. " +
    "Pose une seule question à la fois, de préférence une question à laquelle on répond " +
    "par oui ou non, ou par un choix entre deux choses. " +
    "Si tu n'as pas bien compris ce qu'elle dit, dis-le gentiment et demande-lui de " +
    "répéter, sans jamais la corriger sur sa façon de parler. " +
    "Elisa a 21 ans : c'est une adulte. Parle-lui comme à une jeune femme adulte, avec respect, " +
    "sans ton enfantin, sans mots de bébé ni diminutifs, tout en restant très simple et très clair. " +
    "Tutoie-la. Encourage-la avec naturel. " +
    "Si elle semble triste, malade ou en danger, écoute avec douceur et propose-lui " +
    "d'en parler à une personne de confiance. " +
    "N'utilise ni liste, ni markdown, ni emoji, ni aucun formatage, et ne dis jamais d'adresse internet. " +
    "Réponds toujours en français. " +

    "Elisa adore sortir : foires, événements, musées, restaurants, cinéma, balades et randonnées. " +
    "Elle aime aussi savoir la météo, jouer et faire des puzzles. " +
    "Quand elle veut une idée de sortie (événement, foire, musée, restaurant, cinéma, randonnée), " +
    "utilise la recherche web pour trouver des informations réelles et récentes près d'elle, " +
    "puis propose UNE ou DEUX idées au maximum : dis le nom du lieu, la ville et le moment, " +
    "puis demande-lui si ça lui plaît. N'invente jamais un lieu, un horaire ou un prix : " +
    "si tu n'es pas sûre, dis-le simplement. " +
    "Pour la météo, utilise l'outil get_weather, puis dis en une ou deux phrases le temps et la " +
    "température, et ce qu'il faut emporter (parapluie, veste, crème solaire) ou si c'est une belle " +
    "journée pour sortir. " +
    "Pour une randonnée, pense à la météo et à la sécurité : de l'eau, de bonnes chaussures, " +
    "prévenir quelqu'un de sa sortie. " +
    "Si elle veut jouer ou faire un puzzle, utilise l'outil ouvrir_jeu, puis dis-lui simplement " +
    "de bien s'amuser.";


/* ---------- Météo (Open-Meteo, sans clé) ---------- */

const WMO = {
    0: "ciel dégagé", 1: "plutôt dégagé", 2: "partiellement nuageux", 3: "couvert",
    45: "brouillard", 48: "brouillard givrant",
    51: "bruine légère", 53: "bruine", 55: "bruine forte",
    56: "bruine verglaçante", 57: "bruine verglaçante",
    61: "pluie faible", 63: "pluie", 65: "forte pluie",
    66: "pluie verglaçante", 67: "pluie verglaçante",
    71: "neige faible", 73: "neige", 75: "forte neige", 77: "grains de neige",
    80: "averses faibles", 81: "averses", 82: "fortes averses",
    85: "averses de neige", 86: "fortes averses de neige",
    95: "orage", 96: "orage avec grêle", 99: "orage violent avec grêle"
};

const wmo = code => WMO[code] || "temps variable";

async function resolvePlace(place) {

    const out = { lat: null, lon: null, city: "" };

    if (place && typeof place === "object") {
        if (typeof place.city === "string") out.city = place.city.trim().slice(0, 80);
        if (Number.isFinite(place.lat) && Number.isFinite(place.lon) &&
            Math.abs(place.lat) <= 90 && Math.abs(place.lon) <= 180) {
            out.lat = place.lat;
            out.lon = place.lon;
        }
    }

    // Pas de GPS : on retrouve la ville indiquée dans les réglages
    if (out.lat === null && out.city) {
        for (const suffix of ["&countryCode=FR", ""]) {
            try {
                const r = await fetch(
                    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=" +
                    encodeURIComponent(out.city) + suffix
                );
                if (!r.ok) continue;
                const d = await r.json();
                const g = d.results && d.results[0];
                if (g) {
                    out.lat = g.latitude;
                    out.lon = g.longitude;
                    out.city = g.name || out.city;
                    break;
                }
            } catch (e) {
                console.error("Géocodage :", e);
            }
        }
    }

    return out;
}

async function getWeather(loc, days) {

    if (loc.lat === null) {
        return "Je ne connais pas la position d'Elisa. Demande-lui dans quelle ville elle se trouve.";
    }

    const n = Math.min(7, Math.max(1, parseInt(days, 10) || 1));

    const url =
        "https://api.open-meteo.com/v1/forecast?latitude=" + loc.lat +
        "&longitude=" + loc.lon +
        "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
        "&timezone=auto&forecast_days=" + Math.max(n, 2);

    const r = await fetch(url);
    if (!r.ok) throw new Error("meteo " + r.status);

    const d = await r.json();
    const c = d.current || {};
    const dl = d.daily || {};

    let text =
        "Maintenant" + (loc.city ? " à " + loc.city : "") + " : " +
        Math.round(c.temperature_2m) + " degrés (ressenti " + Math.round(c.apparent_temperature) + "), " +
        wmo(c.weather_code) + ", vent " + Math.round(c.wind_speed_10m) + " kilomètres par heure.\n";

    for (let i = 0; i < n; i++) {

        const label =
            i === 0 ? "Aujourd'hui" :
            i === 1 ? "Demain" :
            new Date(dl.time[i] + "T12:00:00").toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long"
            });

        text +=
            label + " : " + wmo(dl.weather_code[i]) +
            ", de " + Math.round(dl.temperature_2m_min[i]) +
            " à " + Math.round(dl.temperature_2m_max[i]) + " degrés" +
            ", risque de pluie " + (dl.precipitation_probability_max[i] ?? "inconnu") + " pour cent.\n";
    }

    return text;
}


/* ---------- Appel à Claude ---------- */

async function callClaude(body) {

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": ENV.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = new Error("Anthropic " + response.status);
        err.status = response.status;
        err.body = await response.text();
        throw err;
    }

    return response.json();
}

function buildTools(loc, useSearch) {

    const tools = [
        {
            name: "get_weather",
            description:
                "Donne la météo réelle à l'endroit où se trouve Elisa : maintenant et pour les " +
                "prochains jours. À utiliser pour toute question sur le temps, la pluie, la " +
                "température, ou pour savoir si c'est une bonne journée pour sortir ou randonner.",
            input_schema: {
                type: "object",
                properties: {
                    jours: {
                        type: "integer",
                        description: "Nombre de jours de prévision : 1 pour aujourd'hui, 2 pour aujourd'hui et demain, jusqu'à 7."
                    }
                }
            }
        },
        {
            name: "ouvrir_jeu",
            description:
                "Ouvre un jeu sur l'écran d'Elisa quand elle veut jouer ou faire un puzzle. " +
                "'puzzle' : puzzle d'images. 'memoire' : jeu des paires à retrouver.",
            input_schema: {
                type: "object",
                properties: { jeu: { type: "string", enum: ["puzzle", "memoire"] } },
                required: ["jeu"]
            }
        }
    ];

    if (useSearch) {
        const search = { type: "web_search_20250305", name: "web_search", max_uses: 3 };
        if (loc.city) {
            search.user_location = {
                type: "approximate",
                city: loc.city,
                country: "FR",
                timezone: "Europe/Paris"
            };
        }
        tools.push(search);
    }

    return tools;
}

async function converse(messages, loc, useSearch) {

    const now = new Date().toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    const system =
        BASE_PROMPT +
        " Nous sommes le " + now + " (heure de Paris)." +
        (loc.city ? " Elisa se trouve près de " + loc.city + "." : "");

    const tools = buildTools(loc, useSearch);
    const msgs = [...messages];

    let action = null;

    for (let i = 0; i < MAX_LOOPS; i++) {

        const data = await callClaude({
            model: MODEL,
            max_tokens: 500,
            system,
            tools,
            messages: msgs
        });

        // Claude demande un de nos outils
        if (data.stop_reason === "tool_use") {

            msgs.push({ role: "assistant", content: data.content });

            const results = [];

            for (const block of data.content) {

                if (block.type !== "tool_use") continue;

                let out;

                try {
                    if (block.name === "get_weather") {
                        out = await getWeather(loc, block.input && block.input.jours);
                    } else if (block.name === "ouvrir_jeu") {
                        const jeu = block.input && block.input.jeu;
                        if (jeu === "puzzle" || jeu === "memoire") {
                            action = { type: "open_game", game: jeu === "memoire" ? "memory" : "puzzle" };
                            out = "Le jeu s'ouvrira dès que tu auras fini de parler.";
                        } else {
                            out = "Jeu inconnu.";
                        }
                    } else {
                        out = "Outil inconnu.";
                    }
                } catch (e) {
                    console.error("Outil", block.name, e);
                    out = "Impossible d'obtenir cette information pour le moment.";
                }

                results.push({ type: "tool_result", tool_use_id: block.id, content: out });
            }

            msgs.push({ role: "user", content: results });
            continue;
        }

        // La recherche web a pris du temps : on laisse Claude continuer
        if (data.stop_reason === "pause_turn") {
            msgs.push({ role: "assistant", content: data.content });
            continue;
        }

        const text = (data.content || [])
            .filter(block => block.type === "text")
            .map(block => block.text)
            .join("");

        return { text, action };
    }

    return { text: "", action };
}

// Nettoie le texte pour la lecture à voix haute
function cleanForSpeech(text) {
    return text
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[*_#`>]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}


/* ---------- Point d'entrée ---------- */

const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
    });

async function chat(request, env) {

    ENV = env;

    if (request.method !== "POST") {
        return json({ error: "Méthode non autorisée" }, 405);
    }

    let body;

    try {
        body = await request.json();
    } catch (e) {
        body = {};
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return json({ error: "Le champ 'messages' est manquant ou vide." }, 400);
    }

    const messages = body.messages
        .filter(m => m && (m.role === "user" || m.role === "assistant") &&
                     typeof m.content === "string" && m.content.trim())
        .slice(-MAX_MESSAGES)
        .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

    while (messages.length && messages[0].role !== "user") messages.shift();

    if (messages.length === 0) {
        return json({ error: "Aucun message valide." }, 400);
    }

    if (!env.ANTHROPIC_API_KEY) {
        console.error("ANTHROPIC_API_KEY n'est pas définie (secret Cloudflare).");
        return json({ error: "Clé API non configurée sur le serveur." }, 500);
    }

    try {

        const loc = await resolvePlace(body.place);

        const searchWanted = env.ENABLE_WEB_SEARCH !== "false";

        let result;

        try {
            result = await converse(messages, loc, searchWanted);
        } catch (error) {
            // Si la recherche web n'est pas activée sur le compte, on réessaie sans
            if (searchWanted && error.status === 400) {
                console.error("Recherche web refusée, nouvel essai sans :", error.body);
                result = await converse(messages, loc, false);
            } else {
                throw error;
            }
        }

        return json({
            reply: cleanForSpeech(result.text) || "Je n'ai pas de réponse. Tu peux répéter ?",
            action: result.action
        });

    } catch (error) {

        if (error.status) {
            console.error("Erreur API Anthropic:", error.status, error.body);
            return json({ error: "Erreur lors de l'appel à Claude." }, 502);
        }

        console.error("Erreur serveur /api/chat :", error);
        return json({ error: "Erreur interne du serveur." }, 500);
    }
}

export default {

    async fetch(request, env) {

        const url = new URL(request.url);

        // L'API de Nhova
        if (url.pathname === "/api/chat") {
            return chat(request, env);
        }

        // Tout le reste : le site (dossier public)
        return env.ASSETS.fetch(request);
    }

};
