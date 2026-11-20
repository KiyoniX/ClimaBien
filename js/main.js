// Point d'entrée de DPEClair : état (zone, type, étiquette, tri), chargement et affichage.
// Les briques génériques (carte, zone, chargement, mémoire, vue mobile) sont dans js/base/.
import { CONFIG } from "./config.js";
import { chargerBatiments } from "./api.js";
import { selectionner } from "./selection.js";
import { afficherClassement } from "./classement.js";
import { legende, pointsCarte } from "./marqueurs.js";
import { creerCarte } from "./base/carte.js";
import { creerChargeur } from "./base/chargeur.js";
import { creerControlesZone } from "./base/controles-zone.js";
import { el, heure, kilometres } from "./base/format.js";
import { nommerPoint } from "./base/geocodage.js";
import { surligner } from "./base/liste.js";
import { creerMemoire, ecrireParametresPage, lireParametresPage } from "./base/memoire.js";
import { creerVueMobile } from "./base/vue-mobile.js";
import { parametresDeZone, zoneDepuisParametres, zoneValide } from "./base/zone.js";

const $ = (id) => document.getElementById(id);
const memoire = creerMemoire(CONFIG.site.cleMemoire);

const etat = {
  ...etatInitial(), // zone {lat, lon, rayonKm, nom}, type, lettre, tri
  texte: "", // recherche par adresse dans la zone (pas gardée dans l'adresse de la page)
  nombre: CONFIG.parPage, // fiches affichées dans la liste
  batiments: [], // bâtiments de la zone, avec leurs DPE
  incomplet: false, // zone trop dense : tous les DPE n'ont pas été lus
  luA: null, // heure de lecture des données
};

const carte = creerCarte($("carte"), {
  surClicPoint: (id) => surligner($("classement"), id),
  surDeplacerCentre: ({ lat, lon }) => changerZone({ lat, lon, nom: null }, { ajuster: false }),
  legende: legende(),
});

const controles = creerControlesZone({
  surRayonProvisoire: (km) => carte.apercuRayon(km),
  surRayon: (km) => changerZone({ rayonKm: km }),
  surLieu: (lieu) => changerZone(lieu),
  surErreur: message,
});

const chargeur = creerChargeur({
  charger: (signal, { ageMaxMs } = {}) => chargerBatiments({ centre: etat.zone, rayonKm: etat.zone.rayonKm, signal, ageMaxMs }),
  surResultat: ({ batiments, luA, incomplet }) => {
    Object.assign(etat, { batiments, luA, incomplet, nombre: CONFIG.parPage });
    afficher({ carteAussi: true });
    if (etat.zone.nom == null) nommerZone();
  },
  surMessage: message,
});

const vue = creerVueMobile({ bouton: $("bascule"), carte, surCarteAffichee: () => carte.afficherZone(etat.zone) });

// ---------- État : adresse de la page et mémoire du navigateur ----------

function valide(liste, cle) {
  return liste.some((x) => x.cle === cle);
}

/** Filtres lus dans l'adresse (#type=…&lettre=…&tri=…) ou la mémoire ; ignore ce qui n'existe pas. */
function filtresDepuis(source) {
  return {
    type: valide(CONFIG.types, source.type) ? source.type : null,
    lettre: CONFIG.etiquettes.some((e) => e.lettre === source.lettre) ? source.lettre : null,
    tri: valide(CONFIG.tris, source.tri) ? source.tri : null,
  };
}

/** Priorité : adresse de la page, puis dernière visite, puis réglages par défaut. */
function etatInitial() {
  const p = lireParametresPage();
  const m = memoire.lire();
  const adresse = filtresDepuis(Object.fromEntries(p));
  const souvenir = filtresDepuis(m);
  return {
    zone: zoneDepuisParametres(p) ?? zoneValide(m.zone) ?? { ...CONFIG.zoneParDefaut },
    type: adresse.type ?? souvenir.type ?? CONFIG.typeParDefaut,
    lettre: adresse.lettre, // seulement depuis un lien partagé : une nouvelle visite montre toutes les étiquettes
    tri: adresse.tri ?? souvenir.tri ?? CONFIG.triParDefaut,
  };
}

function memoriser() {
  const { type, lettre, tri, zone } = etat;
  ecrireParametresPage({ type, ...(lettre && { lettre }), tri, ...parametresDeZone(zone) });
  memoire.ecrire({ zone, type, tri });
}

// ---------- Actions ----------

function changerZone(partiel, { ajuster = true } = {}) {
  etat.zone = { ...etat.zone, ...partiel };
  memoriser();
  carte.afficherZone(etat.zone, { ajuster });
  controles.majRayon(etat.zone.rayonKm);
  chargeur.lancerBientot(); // tampon : on attend que la zone ne bouge plus
}

/** Changement de type, d'étiquette, de tri ou de recherche : tout est déjà chargé, rien à demander à l'API. */
function changerFiltre(partiel) {
  Object.assign(etat, partiel, { nombre: CONFIG.parPage });
  memoriser();
  afficher({ carteAussi: true });
}

/** Donne un nom lisible à une zone placée à la main (« rue Blatin, Clermont-Ferrand »). */
async function nommerZone() {
  const zone = etat.zone;
  const nom = await nommerPoint(zone).catch(() => null);
  if (etat.zone !== zone) return; // la zone a encore bougé entre-temps
  zone.nom = nom ?? "ce point";
  memoriser();
  afficherResume(selectionCourante());
}

// ---------- Affichage ----------

function message(texte) {
  $("resume").textContent = texte;
}

const selectionCourante = () => selectionner(etat.batiments, etat);

function afficher({ carteAussi = false } = {}) {
  const selection = selectionCourante();
  afficherFiltres(selection);
  afficherResume(selection);
  afficherClassement($("classement"), $("plus"), selection.batiments, {
    nombre: etat.nombre,
    surVoir: vue.montrerSurCarte,
    surPlus: () => {
      etat.nombre += CONFIG.parPage;
      afficher();
    },
  });
  if (carteAussi) carte.afficherPoints(pointsCarte(selection.batiments));
}

function bouton(contenu, actif, surClic, titre, style) {
  return el("button", { type: "button", class: "onglet", "aria-pressed": String(actif), title: titre, style, onclick: surClic }, contenu);
}

/** Onglets des types, boutons des étiquettes (avec leur nombre) et liste des tris. */
function afficherFiltres({ parLettre }) {
  $("types").replaceChildren(...CONFIG.types.map((t) => bouton(t.nom, t.cle === etat.type, () => changerFiltre({ type: t.cle }))));

  const total = Object.values(parLettre).reduce((a, b) => a + b, 0);
  $("etiquettes").replaceChildren(
    bouton(["Toutes", el("span", { class: "compte" }, total)], etat.lettre == null, () => changerFiltre({ lettre: null }), "Toutes les étiquettes"),
    ...CONFIG.etiquettes.map((e) =>
      bouton(
        [e.lettre, el("span", { class: "compte" }, parLettre[e.lettre])],
        e.lettre === etat.lettre,
        () => changerFiltre({ lettre: e.lettre === etat.lettre ? null : e.lettre }),
        `Étiquette ${e.lettre}`,
        `--couleur-etiquette: ${e.couleur}; --texte-etiquette: ${e.texte}`,
      ),
    ),
  );

  const tri = $("tri");
  if (!tri.options.length) {
    tri.replaceChildren(...CONFIG.tris.map((t) => el("option", { value: t.cle }, t.nom)));
    tri.addEventListener("change", () => changerFiltre({ tri: tri.value }));
  }
  tri.value = etat.tri;
}

function afficherResume({ batiments, parLettre, nombreDpe }) {
  const { rayonKm, nom } = etat.zone;
  const contexte = `${kilometres(rayonKm)} autour de ${nom ?? "ce point"} · DPE depuis juillet 2021 · lus à ${heure(etat.luA)}`;
  const total = Object.values(parLettre).reduce((a, b) => a + b, 0);
  const passoires = parLettre.F + parLettre.G;

  const chiffres =
    nombreDpe === 0
      ? ["Aucun DPE ne correspond ici."]
      : [
          el("strong", {}, `${nombreDpe} DPE`),
          ` dans ${batiments.length} bâtiment${batiments.length > 1 ? "s" : ""}`,
          etat.lettre == null && total > 0 && ` · ${Math.round((100 * passoires) / total)} % classés F ou G`,
        ];
  const avertissement = etat.incomplet && el("span", { class: "contexte alerte" }, "Zone très dense : seule une partie des DPE est affichée. Réduis le rayon.");
  $("resume").replaceChildren(...[el("span", { class: "chiffres" }, chiffres), el("span", { class: "contexte" }, contexte), avertissement].filter(Boolean));
}

// ---------- Démarrage ----------

function demarrer() {
  $("lien-depot").href = CONFIG.site.depot;
  $("actualiser").addEventListener("click", () => chargeur.lancer({ ageMaxMs: CONFIG.reseau.actualiserApresSecondes * 1000 }));

  let minuterie = null;
  $("filtre-adresse").addEventListener("input", (e) => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => changerFiltre({ texte: e.target.value }), 150);
  });

  window.addEventListener("hashchange", () => {
    const p = lireParametresPage();
    const f = filtresDepuis(Object.fromEntries(p));
    Object.assign(etat, { type: f.type ?? etat.type, lettre: f.lettre, tri: f.tri ?? etat.tri });
    const zone = zoneDepuisParametres(p);
    if (zone) changerZone(zone);
    else afficher({ carteAussi: true });
  });

  carte.afficherZone(etat.zone);
  controles.majRayon(etat.zone.rayonKm);
  memoriser();
  chargeur.lancer();
}

demarrer();
