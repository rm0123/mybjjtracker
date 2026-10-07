# MyBJJ Tracker

PWA locale pour suivre les séances de JJB.

## Fonctionnalités
- 76 séances importées depuis le fichier Excel initial (100,5 h)
- ajout / modification / suppression de séances
- dashboard mensuel et objectif configurable
- statistiques par type, professeur et académie
- calendrier dynamique avec 🥋
- IndexedDB : données stockées localement sur l'appareil
- export / import d'un backup JSON
- mode hors ligne via Service Worker

## Publication sur GitHub Pages
1. Copier tout le contenu de ce dossier à la racine de la branche `main`.
2. Dans GitHub : **Settings → Pages**.
3. Sous **Build and deployment**, choisir **Deploy from a branch**.
4. Branch : `main`, dossier : `/ (root)`, puis **Save**.
5. Ouvrir l'URL GitHub Pages depuis Safari sur iPhone.
6. Safari → Partager → **Sur l'écran d'accueil**.

Le dépôt héberge uniquement le code et les données initiales. Les nouvelles données saisies dans l'application restent dans IndexedDB sur l'appareil. Utiliser régulièrement **Exporter le backup JSON** pour conserver une sauvegarde.
