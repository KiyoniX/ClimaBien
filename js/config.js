// Tout ce qu'on peut vouloir changer se trouve ici.
// Les modules de js/base/ lisent aussi : zoneParDefaut, rayon, reseau, geocodage, tuiles.
export const CONFIG = {
  // Identité du site (le nom affiché et les couleurs sont dans index.html et css/site.css).
  site: {
    cleMemoire: "dpeclair", // clé du stockage du navigateur : à changer dans un fork
    depot: "https://github.com/KiyoniX/DPEClair", // lien « Code source » du pied de page
  },

  // Zone affichée à la première visite (ensuite : celle de l'adresse de la page, ou la dernière utilisée).
  zoneParDefaut: { lat: 45.7772, lon: 3.087, rayonKm: 0.2, nom: "la place de Jaude, Clermont-Ferrand" },
  // En mètres : les DPE sont très denses en ville (~360 à 100 m du centre de Clermont, ~18 000 à 1 km).
  rayon: { minKm: 0.05, maxKm: 1, pasKm: 0.05 },

  // Étiquettes énergie, de la meilleure à la pire, avec leurs couleurs officielles.
  // `location` : ce que la loi Climat et résilience prévoit pour la location (métropole).
  etiquettes: [
    { lettre: "A", couleur: "#009c6d", texte: "#fff" },
    { lettre: "B", couleur: "#52b153", texte: "#fff" },
    { lettre: "C", couleur: "#a3cf6e", texte: "#1b1b1b" },
    { lettre: "D", couleur: "#f6e04b", texte: "#1b1b1b" },
    { lettre: "E", couleur: "#f2a33a", texte: "#1b1b1b", location: "Location interdite à partir de 2034" },
    { lettre: "F", couleur: "#eb6b36", texte: "#fff", location: "Location interdite à partir de 2028", loyerGele: true },
    { lettre: "G", couleur: "#d7221f", texte: "#fff", location: "Location interdite depuis 2025", loyerGele: true, interditeMaintenant: true },
  ],

  // Types de logement (onglets). `types` = valeurs du champ type_batiment ; null = tout.
  types: [
    { cle: "tout", nom: "Tout", types: null },
    { cle: "appartements", nom: "Appartements", types: ["appartement"] },
    { cle: "maisons", nom: "Maisons", types: ["maison"] },
  ],
  typeParDefaut: "tout",

  // Ordres de la liste des bâtiments.
  tris: [
    { cle: "distance", nom: "Les plus proches" },
    { cle: "pire", nom: "Les pires d'abord" },
    { cle: "meilleur", nom: "Les meilleurs d'abord" },
  ],
  triParDefaut: "distance",

  parPage: 100, // bâtiments affichés d'un coup dans la liste (bouton « Voir plus » ensuite)
  pagesMax: 5, // pages de 10 000 DPE au plus par zone (1 km au centre d'une grande ville ≈ 2 pages)

  // Tampon contre les limites des API.
  reseau: {
    cacheMinutes: 30, // les DPE changent peu : une zone chargée est réutilisée pendant ce temps
    actualiserApresSecondes: 60, // « Actualiser » réutilise les données si elles ont moins de 60 s
    attenteDeplacementMs: 500, // délai après le dernier déplacement de la zone avant de charger
    attenteSaisieMs: 350, // délai après la dernière frappe avant de chercher une adresse
    ecartDpeMs: 200, // écart minimal entre deux requêtes à l'API de l'ADEME
    ecartAdresseMs: 150, // écart minimal entre deux requêtes à l'API des adresses
    tentatives: 3, // essais en cas de réponse 429 (trop de requêtes)
  },

  // DPE des logements existants depuis juillet 2021 (les plus anciens ne sont plus valables).
  api: "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines",
  geocodage: "https://data.geopf.fr/geocodage", // API Adresse de l'IGN (Géoplateforme)
  tuiles: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};
