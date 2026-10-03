# Nhova

**Nhova** est une assistante vocale en français, conçue pour **Elisa**, qui ne sait ni lire ni écrire et a des difficultés de motricité fine. Tout se fait à la voix, avec un seul gros bouton à toucher.

Elle repose sur [Claude](https://www.anthropic.com) (Anthropic) et tourne gratuitement sur [Cloudflare Workers](https://workers.cloudflare.com).

## Ce que sait faire Nhova

- **Discuter** avec des mots simples et des phrases courtes, sur un ton adapté à une jeune adulte.
- **Donner la météo** réelle (via [Open-Meteo](https://open-meteo.com), sans clé) et conseiller quoi emporter.
- **Proposer des sorties** : événements, foires, musées, restaurants, cinéma, randonnées, grâce à la recherche web de Claude.
- **Jouer** : un puzzle et un jeu de paires, jouables d'un seul appui (sans glisser, sans lire).
- **S'installer sur l'écran d'accueil** du téléphone comme une vraie application (PWA).

### Pensé pour l'accessibilité

- Un énorme bouton central, un bouton « répéter » et un bouton « jeux » : rien d'autre à viser.
- Aucune lecture nécessaire : l'état de Nhova se voit par une couleur et un visage (vert prêt, rouge écoute, orange réfléchit, bleu parle), avec un bip et une vibration.
- Écoute automatique après chaque réponse, anti-double-appui, messages d'erreur dits à voix haute.
- Réglages réservés à l'accompagnant : appui long de 1,5 s sur le bouton 🔧 (vitesse de la voix, écoute automatique, ville).
