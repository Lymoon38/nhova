# Nhova

**Nhova** est une assistante pour **Elisa**, qui ne sait ni lire ni écrire et a des difficultés de motricité fine. Tout se fait avec un gros bouton, des images et la voix.

C'est un **site tout simple** : aucun serveur, aucune clé, aucun compte payant. Il suffit de le publier sur GitHub Pages.

## Ce que sait faire Nhova

| Elisa dit… ou touche… | Nhova fait |
|---|---|
| « la météo » ou 🌦️ | Affiche aujourd'hui et demain en images (soleil, pluie, températures, ☂️ 🧥 🧴 💧) et les dit à voix haute. |
| « un musée », « j'ai faim », « le cinéma », « une randonnée », « une fête foraine » ou 🗺️ | Ouvre **Google Maps** avec la recherche « … près de moi ». |
| « un jeu », « un puzzle », « un taquin », « un coloriage »… ou 🎮 | Ouvre l'un des **12 jeux**. |
| « mes médailles » ou 🏆 (dans les jeux) | Ouvre le **carnet de récompenses**. |
| « mets de la musique douce » ou 🎵 (en haut) | Lance une **ambiance** : 🎹 piano doux, 🌧️ pluie douce, 🌊 vagues. |
| 🔁 | Répète la dernière chose dite. |

Le gros bouton 🎤 écoute **une seule fois** : Elisa dit ce qu'elle veut, Nhova ouvre la bonne chose. Si le micro pose problème, **tout fonctionne aussi en touchant les images**.

## Les 12 jeux

Tous se jouent **d'un seul appui**, sans glisser et sans lire. Nhova donne les consignes et félicite à voix haute.

| | Jeu | Principe |
|---|---|---|
| 🧩 | Puzzle | Toucher deux pièces pour les échanger. 6 images (plage, montagne, foire, musée, forêt, ville). 👁️ montre le modèle. |
| 🔀 | Taquin | Une image coupée avec une case vide : toucher une pièce la fait glisser (toucher une pièce de la même rangée pousse toute la rangée). |
| 🃏 | Paires | Retrouver les cartes identiques. |
| 🔗 | Qui va avec qui | Toucher deux images qui vont ensemble (parapluie et pluie, glace et soleil…). |
| 🎩 | Disparu | Mémoriser des objets : l'un disparaît, lequel ? |
| 🍬 | Match-3 | Style Candy Crush : toucher un bonbon puis son voisin pour aligner 3 bonbons. Sans limite de coups. |
| 🎈 | Bulles | Éclater les bulles qui montent. |
| 🎹 | Musique | 8 touches de couleur. ⏺️ enregistre une mélodie, ▶️ la rejoue (elle est gardée sur le téléphone). |
| 🧠 | Suite de couleurs | Répéter une suite de sons et de couleurs. En cas d'erreur, la même suite est rejouée, sans punition. |
| 👂 | Écoute | Nhova dit « Touche le restaurant », Elisa touche la bonne image (plus de 80 mots et images). |
| 🔍 | Le différent | Toucher l'image qui n'est pas comme les autres. |
| 🎨 | Coloriage | 24 couleurs (palette qui défile avec ◀️ ▶️), 6 dessins. On peut toujours changer une couleur. |

### Niveaux : ⭐ ⭐⭐ ⭐⭐⭐

- Chaque jeu a trois niveaux (facile, moyen, difficile).
- **Le niveau monte tout seul** après 3 victoires.
- On peut aussi **le choisir** en touchant les étoiles en haut du jeu.
- La **progression est gardée sur le téléphone** : Elisa reprend à son niveau.

### Recommencer à zéro 🗑️

En bas de chaque jeu : **🎮 · 🗑️ · 🔄**. Le 🔄 lance une nouvelle partie. Le 🗑️ demande une **confirmation parlée** avec trois choix : ✔️ ce jeu, ✔️ 🎮 tous les jeux, ❌ annuler.

### Récompenses 🏆

Une médaille par jeu : 🥉 à la 1re victoire, 🥈 à 5 victoires, 🥇 à 15 victoires. Le carnet 🏆 (en haut du menu des jeux) montre les 12 jeux avec leurs médailles et leurs étoiles.

### Aide et félicitations

- **💡 Aide** : si Elisa reste bloquée environ 25 secondes, Nhova propose l'ampoule 💡, qui éclaire la bonne réponse ou le bon coup.
- **Félicitations variées** : phrases différentes à chaque fois, avec le prénom d'Elisa.

## Réglages accompagnant (appui long de 1,5 s sur 🔧)

Vitesse et choix de la voix, **prénom** utilisé dans les félicitations, **volume de la musique**, ville de secours pour la météo, et un **suivi des jeux** (niveau atteint, victoires, médaille et date de la dernière partie).

## Mise en ligne sur GitHub Pages (gratuit)

1. Crée un dépôt GitHub public (par exemple `nhova`).
2. Envoie les **10 fichiers** à la **racine** du dépôt (**Add file → Upload files**), sans sous-dossier :
   `index.html`, `style.css`, `script.js`, `games.js`, `music.js`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`, `README.md`.
3. **Settings → Pages → Build and deployment → Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Après une ou deux minutes : `https://TON-PSEUDO.github.io/nhova/`.

**Mettre à jour** : remplace les fichiers sur GitHub (les fichiers de même nom sont remplacés). N'oublie pas `music.js` s'il est nouveau. Puis, sur le téléphone, ferme complètement l'application et rouvre-la (ou recharge la page en forçant : Ctrl + F5 sur ordinateur).

## Installation sur le téléphone (Android / Samsung)

1. Ouvre l'adresse du site dans **Chrome** (plus fiable que Samsung Internet pour le micro).
2. Menu ⋮ → **Ajouter à l'écran d'accueil**.
3. Au premier lancement, accepte **le micro** et **la localisation**. Si la localisation est refusée, indique une ville dans les réglages accompagnant.
4. Le son de la musique et des jeux démarre seulement après un appui (règle des téléphones).

## Ce qui sort de l'appareil

- **Micro** : la reconnaissance vocale est celle du navigateur (Chrome envoie l'audio à Google pour le transcrire).
- **Météo** : les coordonnées (ou la ville) sont envoyées à [Open-Meteo](https://open-meteo.com), gratuit et sans clé (usage non commercial).
- **Sorties** : le bouton ouvre simplement Google Maps.
- **Sur le téléphone seulement** : réglages, progression, médailles et mélodie sont gardés dans le navigateur (`localStorage`). Rien n'est envoyé ni enregistré ailleurs.
- Il n'y a **aucune clé secrète** dans le dépôt : il peut être public sans risque.

## Limites

- Nhova ne **discute plus librement** et ne cherche pas d'événements sur internet : elle comprend des mots-clés (météo, sorties, jeux, musique…).
- La météo demande une connexion internet.
- Pour les sorties, l'application quitte Nhova pour ouvrir Google Maps : on revient avec la flèche retour du téléphone.
- Reconnaissance vocale : surtout Chrome et Edge (Android, ordinateur).
- Vider les données du navigateur efface la progression.

## Structure

```
index.html     L'écran
style.css      L'apparence
script.js      Voix, micro, météo, sorties, réglages
games.js       Les 12 jeux, niveaux, progression, carnet, aide
music.js       La musique douce 🎵 (piano, pluie, vagues)
manifest.json  Installation sur l'écran d'accueil
sw.js          (nécessaire à l'installation)
icon-192.png, icon-512.png
```
