# Hektars Terrain

Outil terrain des représentants Hektars : Aujourd'hui (journée et actions urgentes), Appels et SL (sessions, lancements SL, courriels), Dégustations, Produits (type SAQ, statut SL, pitch, photos) et Brief du lundi. Les ventes et courbes restent dans EZFocus.

- `index.html` : l'application (page statique, aucune compilation).
- `config.js` : adresse du projet Supabase et clé publique (publishable).
- `sync.js` : extraction EZFocus, lancée par le favori « Synchroniser Hektars » depuis un onglet EZFocus connecté.
- `supabase/schema.sql` : tables et règles d'accès (chaque rep voit seulement son territoire).

Hébergement : site statique (Netlify), relié à ce dépôt. Chaque modification poussée sur `main` est mise en ligne automatiquement.
