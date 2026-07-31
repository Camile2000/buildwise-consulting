# BookSeed Learning & Co — Site web

Site vitrine de BookSeed Learning & Co (entreprise sociale camerounaise dédiée à la littératie des enfants, active à travers l'Afrique). Ce document explique comment reprendre le projet.

## Stack technique

Site **statique** : HTML + CSS + JavaScript vanilla, sans framework, sans étape de build, sans backend ni base de données. Chaque page est un fichier `.html` autonome. Aucune installation n'est nécessaire pour l'éditer (pas de `npm install`).

Hébergé sur **Vercel**, déployé automatiquement depuis ce dépôt Git.

## Structure du projet

```
index.html                 Accueil
programmes.html            Programmes et formules (ateliers)
entreprises.html           Offre entreprises / RSE
histoire.html              Notre histoire
blog.html                  Liste des articles de blog
blog-*.html                8 articles de blog individuels

assets/
  css/site.css             Toute la feuille de style du site
  js/site.js                Toutes les interactions JS (menu, animations au scroll,
                             filtre du blog, partage d'articles, etc.)
  img/                      Images (chaque photo existe en deux tailles et deux
                             formats : .jpg et .webp, pour l'optimisation)

vercel.json                 Configuration de déploiement (cache, en-têtes de sécurité)
robots.txt / sitemap.xml    SEO technique
```

Il n'y a qu'un seul fichier CSS et un seul fichier JS pour tout le site — ils sont chargés par chaque page HTML.

## Lancer le site en local

Aucun build requis. Deux options :
- Ouvrir directement un fichier `.html` dans un navigateur.
- Ou, pour un rendu plus fidèle à la production (chemins relatifs, cache), servir le dossier avec un petit serveur local, par exemple :
  ```
  npx http-server -p 8080
  ```
  puis ouvrir `http://localhost:8080`.

## ⚠️ Point important : le cache-buster CSS/JS

Dans `vercel.json`, les fichiers CSS/JS sont mis en cache **24h** par les navigateurs et les réseaux (`Cache-Control: max-age=86400`). Pour que les visiteurs reçoivent toujours la bonne version après une modification, chaque page charge ces fichiers avec un numéro de version en suffixe :

```html
<link rel="stylesheet" href="assets/css/site.css?v=2">
<script src="assets/js/site.js?v=2" defer></script>
```

**Règle à respecter impérativement :** à chaque modification de `assets/css/site.css` ou `assets/js/site.js`, il faut incrémenter ce numéro (`?v=2` → `?v=3`) sur **toutes** les pages HTML qui les référencent. Sans ça, certains visiteurs (nouveaux appareils, réseaux mobiles, navigateurs jamais venus sur le site) peuvent recevoir une combinaison HTML neuf + CSS/JS périmé, ce qui casse l'affichage. C'est exactement ce qui s'est produit avant l'ajout de ce système — voir l'historique git pour le détail du correctif.

## Déploiement (`vercel.json`)

- `/assets/img/*` : cache 1 an, `immutable` (les images ne changent jamais de nom, donc c'est sûr).
- `/assets/css/*` et `/assets/js/*` : cache 24h, d'où l'importance du `?v=` ci-dessus.
- Toutes les pages : en-têtes de sécurité standards (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

## Boutons de partage d'articles (blog)

Chaque article propose 4 boutons de partage :
- **WhatsApp / Facebook / LinkedIn** : liens officiels de partage de chaque réseau (`wa.me`, `facebook.com/sharer`, `linkedin.com/sharing/share-offsite`) — ce sont des redirections réelles, pas de simples icônes décoratives.
- **Transférer** (icône flèche) : utilise l'API native `navigator.share()` du navigateur/téléphone (ouvre le menu de partage du système, qui propose Instagram, Messages, etc. si disponibles) ; si cette API n'existe pas (certains navigateurs desktop), le bouton copie simplement le lien de l'article dans le presse-papiers. Cette logique est dans `assets/js/site.js`, recherche `.share-copy`.

Instagram n'a volontairement pas de bouton dédié : cette plateforme ne fournit aucune URL de partage officielle (contrairement à WhatsApp/Facebook/LinkedIn), c'est pour ça que le bouton "Transférer" existe.

## Réseaux sociaux (footer)

Le footer de chaque page contient 3 icônes : Instagram, LinkedIn, WhatsApp. Les liens sont en dur dans chaque fichier HTML (recherche `class="social"`) — il n'y a pas de configuration centralisée, donc si une URL change, il faut la remplacer dans les 13 fichiers.

## SEO / données structurées

Chaque page contient des données structurées `schema.org` (blocs `<script type="application/ld+json">`) : `EducationalOrganization` sur `index.html`, `WebPage` + `BreadcrumbList` sur les pages principales, `BlogPosting` + `BreadcrumbList` sur les articles. Le champ `areaServed` de l'organisation est volontairement `"Afrique"` (et non des villes précises) : c'est un choix de positionnement de la marque, à ne pas modifier sans validation de la cliente.

## Points d'attention pour toute évolution future

- Le champ d'action de la marque est présenté comme **l'Afrique**, pas seulement le Cameroun ou des villes précises — seule l'adresse physique du Kfé Littéraire (Akwa Nord, Douala) reste associée à une ville. C'est un choix business explicite de la cliente, à respecter dans tout nouveau contenu.
- Le design utilise un système d'animation "reveal on scroll" (classes `.rv` / `.rv-img` dans `site.css`, pilotées par `site.js`) : les éléments sont invisibles par défaut (`opacity:0`) tant que le JS ne leur ajoute pas la classe `.in` au scroll. Toute page qui charge du contenu avec ces classes dépend donc de `site.js` pour s'afficher correctement.
