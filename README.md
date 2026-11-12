# Hektars Terrain

Outil terrain des représentants Hektars : Sur la route, Dashboard (actions urgentes et analyse des pertes), Produits (type SAQ, statut actif, pitch, photos) et Performances.

- `index.html` : l'application (page statique, aucune compilation).
- `config.js` : adresse du projet Supabase et clé publique (publishable).
- `sync.js` : extraction EZFocus, lancée par le favori « Synchroniser Hektars » depuis un onglet EZFocus connecté.
- `supabase/schema.sql` : tables et règles d'accès (chaque rep voit seulement son territoire).

Hébergement : site statique (Netlify), relié à ce dépôt. Chaque modification poussée sur `main` est mise en ligne automatiquement.
