# Nhova (version simple)

**Nhova** est une assistante pour **Elisa**, qui ne sait ni lire ni écrire et a des difficultés de motricité fine. Tout se fait avec un gros bouton, des images et la voix.

Cette version est un **site tout simple** : aucun serveur, aucune clé, aucun compte payant. Il suffit de le publier sur GitHub Pages.

## Ce que sait faire Nhova

| Elisa dit… ou touche… | Nhova fait |
|---|---|
| « la météo » ou 🌦️ | Affiche aujourd'hui et demain en images (soleil, pluie, températures, ☂️ 🧥 🧴 💧) et les dit à voix haute. |
| « un musée », « j'ai faim », « le cinéma », « une randonnée », « une fête foraine » ou 🗺️ | Ouvre **Google Maps** avec la recherche « … près de moi ». |
| « un jeu », « un puzzle », « de la musique », « un coloriage »… ou 🎮 | Ouvre l'un des **8 jeux**. |
| 🔁 | Répète la dernière chose dite. |

Le gros bouton 🎤 écoute **une seule fois** : Elisa dit ce qu'elle veut (« météo », « jeux », « musée »…), Nhova ouvre la bonne chose. Si le micro pose problème, **tout fonctionne aussi en touchant les images**.

### Les 8 jeux

Puzzle, paires, bulles à éclater, musique, suite de couleurs à répéter, jeu d'écoute (« touche le restaurant »), trouver le différent, coloriage. Tous se jouent d'un seul appui, sans glisser et sans lire.

### Accessibilité

- Un énorme bouton central et quatre boutons ronds : rien d'autre à viser.
- Couleur et visage selon l'état (vert prêt, rouge écoute, orange cherche, bleu parle), avec bip et vibration.
- Anti-double-appui, erreurs dites à voix haute, écran qui reste allumé.
- Réglages accompagnant : **appui long de 1,5 s sur 🔧** (voix, vitesse, ville de secours).

## Mise en ligne sur GitHub Pages (gratuit)

1. Crée un dépôt GitHub (par exemple `nhova`).
2. Envoie **le contenu** de ce dossier à la **racine** du dépôt : `index.html`, `style.css`, `script.js`, `games.js`, `manifest.json`, `sw.js` et les deux icônes. Pas de sous-dossier.
3. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Après une ou deux minutes, le site est disponible à l'adresse `https://TON-PSEUDO.github.io/nhova/`.

Pour **mettre à jour**, remplace les fichiers sur GitHub : le site se met à jour tout seul. Sur le téléphone, ferme complètement l'application puis rouvre-la.

## Installation sur le téléphone (Android / Samsung)

1. Ouvre l'adresse du site dans **Chrome** (plus fiable que Samsung Internet pour le micro).
2. Menu ⋮ → **Ajouter à l'écran d'accueil**.
3. Au premier lancement, accepte **le micro** et **la localisation**. Si la localisation est refusée, indique une ville dans les réglages accompagnant (🔧, appui long).

## Ce qui sort de l'appareil

- **Micro** : la reconnaissance vocale est celle du navigateur (Chrome envoie l'audio à Google pour le transcrire).
- **Météo** : les coordonnées (ou la ville) sont envoyées à [Open-Meteo](https://open-meteo.com), gratuit et sans clé. Son usage gratuit est prévu pour un usage non commercial.
- **Sorties** : le bouton ouvre simplement Google Maps.
- Rien n'est enregistré par Nhova. Les réglages (voix, ville) restent sur le téléphone.
- Il n'y a **aucune clé secrète** dans le dépôt : il peut être public sans risque.

## Limites

- Nhova ne **discute plus librement** et ne cherche pas d'événements sur internet : elle comprend quelques mots-clés (météo, sorties, jeux). C'est le prix de la simplicité, sans clé ni serveur.
- La météo demande une connexion internet.
- Pour les sorties, l'application quitte Nhova pour ouvrir Google Maps : on revient avec la flèche retour du téléphone.
- Reconnaissance vocale : surtout Chrome et Edge (Android, ordinateur).

## Structure

```
index.html     L'écran
style.css      L'apparence
script.js      Voix, météo, sorties, boutons
games.js       Les 8 jeux
manifest.json  Installation sur l'écran d'accueil
sw.js          (nécessaire à l'installation)
icon-192.png, icon-512.png
```
