# ClimaBien

Ton futur appart est-il une passoire ? Les diagnostics de performance énergétique (DPE) officiels de chaque immeuble autour de n'importe quelle adresse en France, avec la facture d'énergie estimée et les logements que la loi interdit (ou interdira) à la location.

**Site : https://kiyonix.github.io/ClimaBien/**

- Les données viennent de l'[ADEME](https://data.ademe.fr/datasets/dpe03existant) : tous les DPE de logements existants depuis juillet 2021 (16 millions), avec l'étiquette énergie de A à G, l'étiquette climat, la surface, la précision du logement (étage, type) et la facture d'énergie estimée.
- La page les lit **en direct depuis le navigateur** : pas de serveur, pas de base de données.
- Les DPE sont **regroupés par adresse** (identifiant BAN). Un DPE remplacé par un plus récent est écarté. La couleur d'un immeuble est son étiquette médiane ; une barre montre la répartition A → G de ses logements.
- Les logements concernés par la loi Climat et résilience sont signalés : **G** interdits à la location depuis 2025, **F** à partir de 2028, **E** à partir de 2034.
- Filtres : type de logement, étiquette (avec le nombre de DPE de chaque lettre), recherche par rue ou numéro, trois ordres (les plus proches, les pires d'abord, les meilleurs d'abord).
- Le rayon se règle **en mètres** (50 m à 1 km) : les DPE sont très denses en ville (~1 000 à 200 m du centre de Clermont, ~26 000 à 1 km du centre de Paris).
- La zone, le type, l'étiquette et l'ordre sont dans l'adresse de la page (`#type=tout&lettre=G&tri=distance&lat=45.777&lon=3.087&rayon=0.5`), pour partager un lien direct.
- Sur mobile, on bascule entre la liste et la carte avec un bouton flottant.

Construit à partir de [PlatsNets](https://github.com/KiyoniX/PlatsNets), mais indépendant.

## Structure

Pas de framework ni d'étape de build : du HTML, du CSS et des modules JavaScript.

| Fichier | Rôle |
|---|---|
| `js/config.js` | **Tous les réglages** : identité, zone par défaut, rayon, étiquettes (couleurs officielles, échéances de location), types, ordres, tampon réseau |
| `js/api.js` | Lit l'API de l'ADEME (pages de 10 000 DPE, cache par zone), écarte les DPE remplacés et regroupe par bâtiment |
| `js/selection.js` | Logique pure : filtre (type, étiquette, adresse) et trie les bâtiments (aucun accès au DOM) |
| `js/classement.js` | Contenu des fiches : répartition des étiquettes, alertes de location, détail des logements |
| `js/marqueurs.js` | Ce que la carte montre pour chaque bâtiment, légende des étiquettes |
| `js/main.js` | Point d'entrée : état (zone, type, étiquette, ordre), adresse de la page, liaison des morceaux |
| `js/base/` | Briques génériques : carte, zone (rayon en mètres), chargement, mémoire, vue mobile, réseau, formats, structure des fiches |
| `css/base.css` | Styles de base : mise en page, thème sombre automatique, mobile en bas du fichier |
| `css/site.css` | **Identité et styles propres au site** : couleurs, boutons des étiquettes, barre de répartition |
| `logo.svg` | Logo, aussi utilisé comme icône d'onglet |
| `tests/` | Tests de la logique (`npm test`) |

## Modifier

**Changer la zone affichée à la première visite** : `zoneParDefaut` dans `js/config.js` (`rayonKm: 0.2` = 200 m).

**Changer les échéances ou les textes de location** : le champ `location` de chaque étiquette dans `js/config.js`, et l'encart « Ce que dit la loi » dans `index.html`.

**Changer les polices** : le lien Bunny Fonts dans `index.html`, puis `--police` et `--police-titre` dans `css/base.css`.

## Bon à savoir sur les données

- Seuls les DPE réalisés **depuis juillet 2021** sont lus : les plus anciens ne sont plus valables. Un logement sans DPE récent n'apparaît pas.
- La facture d'énergie est **l'estimation du diagnostic**, pas une facture réelle.
- L'étiquette d'un immeuble sur la carte est la **médiane** de ses logements : un immeuble « D » peut contenir des logements G (voir la barre de répartition et les alertes).
- Au-delà de `CONFIG.pagesMax` pages de 10 000 DPE, la zone est marquée incomplète et la page invite à réduire le rayon.
- Les règles de location sont une **information générale** (métropole), pas un conseil juridique.

## Développer

Aucune dépendance à installer : il suffit de Node.js 20 ou plus récent (pour les tests) et de Python (pour le serveur local).

```sh
npm run local      # serveur local sur http://localhost:8000 (les modules JS ne marchent pas en ouvrant index.html directement)
npm test           # tests de la logique (regroupement, DPE remplacés, filtres, tris, formats, zone), aussi lancés par GitHub Actions
```

### Organisation du code

`js/base/` contient les briques génériques : carte, zone, chargement, mémoire du navigateur, vue mobile, réseau, formats et structure des fiches. Le reste est propre au site : `config.js`, `api.js` (lecture des données), `selection.js` (filtres et tri), `classement.js` (contenu des fiches), `marqueurs.js` (contenu de la carte) et `main.js` (état et liaison).
Les modules de `js/base/` lisent dans `config.js` les clés `zoneParDefaut`, `rayon`, `reseau`, `geocodage` et `tuiles`.

## Mettre en ligne

GitHub → **Settings → Pages → Build and deployment** : *Deploy from a branch*, branche `main`, dossier `/ (root)`. Chaque push sur `main` met le site à jour en une minute environ.

## Forker

Un fork marche tel quel : active GitHub Pages sur ton dépôt (voir « Mettre en ligne ») et le site sera sur `https://<ton-pseudo>.github.io/<nom-du-dépôt>/`. Tous les chemins sont relatifs.

| Quoi | Où |
|---|---|
| Nom, slogan, description, couleur de la barre du navigateur | `index.html` : `<title>`, `<meta name="description">`, `<meta name="theme-color">`, `<h1>` et le `<p>` qui le suit |
| Couleurs | `css/site.css` |
| Logo et icône d'onglet | `logo.svg` |
| Lien « Code source » et clé de stockage du navigateur | `site` dans `js/config.js` (change `cleMemoire` pour ne pas mélanger tes réglages avec ceux du site d'origine) |
| Zone de la première visite | `zoneParDefaut` dans `js/config.js` |

## Licence

Code sous licence MIT (voir `LICENSE`). Données : ADEME, [Licence Ouverte](https://www.etalab.gouv.fr/licence-ouverte-open-licence/). Adresses : IGN Géoplateforme. Fond de carte : © contributeurs OpenStreetMap.
