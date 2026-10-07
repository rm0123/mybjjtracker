# MyBJJ Tracker

PWA locale pour suivre les séances de JJB.

## Fonctionnalités
- ajout / modification / suppression de séances
- dashboard mensuel et objectif configurable
- statistiques par type, professeur et académie
- calendrier dynamique avec 🥋
- IndexedDB : données stockées localement sur l'appareil
- export / import d'un backup JSON
- mode hors ligne via Service Worker

## Données personnelles
Le dépôt ne contient pas l'historique personnel des séances. Les données sont stockées localement dans IndexedDB sur l'appareil.

Pour migrer un historique existant, utiliser **Importer un backup JSON** depuis l'écran Données. Conserver régulièrement un export JSON dans iCloud Drive, Google Drive ou un autre emplacement de sauvegarde.

## Publication sur GitHub Pages
1. Dans GitHub : **Settings → Pages**.
2. Sous **Build and deployment**, choisir **Deploy from a branch**.
3. Branch : `main`, dossier : `/ (root)`, puis **Save**.
4. Ouvrir l'URL GitHub Pages depuis Safari sur iPhone.
5. Safari → Partager → **Sur l'écran d'accueil**.

GitHub Pages héberge uniquement le code de l'application. Les séances saisies restent sur l'appareil.
