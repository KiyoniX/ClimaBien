// Affichage de la liste des bâtiments (la structure d'une fiche est dans js/base/liste.js).
import { CONFIG } from "./config.js";
import { fiche } from "./base/liste.js";
import { date, el, kilometres, lienGoogleMapsRecherche, montant } from "./base/format.js";

const nombre = (n) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/**
 * Remplit la liste <ol> avec les `nombre` premiers bâtiments ; le bouton `plus` affiche les suivants.
 * @param surVoir(id)  montre le bâtiment sur la carte
 * @param surPlus()    demande d'afficher plus de fiches
 */
export function afficherClassement(liste, plus, batiments, { nombre: n, surVoir, surPlus }) {
  liste.replaceChildren(...batiments.slice(0, n).map((b) => ficheBatiment(b, surVoir)));
  const reste = batiments.length - n;
  plus.hidden = reste <= 0;
  if (reste > 0) plus.textContent = `Voir ${Math.min(reste, CONFIG.parPage)} de plus (${reste} restants)`;
  plus.onclick = surPlus;
}

/** Petite lettre de couleur, comme sur l'étiquette officielle. */
export const lettre = (e) => el("b", { class: "lettre", style: `background: ${e.couleur}; color: ${e.texte}` }, e.lettre);

/** Barre de répartition des étiquettes d'un bâtiment (une couleur par étiquette, largeur = part des DPE). */
export function barreRepartition(b) {
  return el(
    "span",
    { class: "repartition", role: "img", "aria-label": texteRepartition(b) },
    CONFIG.etiquettes
      .filter((e) => b.repartition[e.lettre] > 0)
      .map((e) => el("i", { style: `flex: ${b.repartition[e.lettre]}; background: ${e.couleur}`, title: `${e.lettre} : ${b.repartition[e.lettre]}` })),
  );
}

const texteRepartition = (b) =>
  CONFIG.etiquettes
    .filter((e) => b.repartition[e.lettre] > 0)
    .map((e) => `${b.repartition[e.lettre]} ${e.lettre}`)
    .join(", ");

/** Avertissements légaux du bâtiment : nombre de logements concernés par l'interdiction de location. */
export function alertes(b) {
  return CONFIG.etiquettes
    .filter((e) => e.location && b.repartition[e.lettre] > 0)
    .reverse()
    .map((e) => {
      const n = b.repartition[e.lettre];
      const qui = b.dpe.length === 1 ? "" : `${n} logement${n > 1 ? "s" : ""} ${e.lettre} : `;
      return el("span", { class: e.interditeMaintenant ? "badge alerte" : "badge" }, `${e.interditeMaintenant ? "⚠️ " : ""}${qui}${e.location.toLowerCase()}`);
    });
}

/** Une ligne de détail pour un DPE : étiquette, surface, précision du logement, facture estimée, date. */
export function ligneDpe(d) {
  return el(
    "li",
    {},
    lettre(d.etiquette),
    " ",
    [
      d.surface && `${nombre(d.surface)} m²`,
      d.complement,
      d.cout && `≈ ${montant(Math.round(d.cout))}/an d'énergie`,
      d.conso && `${nombre(Math.round(d.conso))} kWh/m²/an`,
      d.date && `DPE du ${date(d.date)}`,
    ]
      .filter(Boolean)
      .join(" · "),
  );
}

function ficheBatiment(b, surVoir) {
  const seul = b.dpe.length === 1 ? b.dpe[0] : null;
  return fiche({
    id: b.id,
    surVoir,
    lienMaps: lienGoogleMapsRecherche(b.adresse),
    pastille: { texte: b.mediane.lettre, couleur: b.mediane.couleur, titre: seul ? `Étiquette ${b.mediane.lettre}` : `Étiquette médiane ${b.mediane.lettre}` },
    infos: [
      el("strong", { class: "nom" }, b.adresse),
      el(
        "span",
        { class: "lieu" },
        [seul ? seul.type && `${seul.type[0].toUpperCase()}${seul.type.slice(1)}` : `${b.dpe.length} DPE`, b.dpe[0].periode && `construit ${b.dpe[0].periode}`, kilometres(b.distance)]
          .filter(Boolean)
          .join(" · "),
      ),
      seul ? el("ul", { class: "liste-dpe" }, ligneDpe(seul)) : barreRepartition(b),
      el("span", { class: "badges" }, alertes(b)),
      !seul &&
        el("details", { class: "details-dpe" }, el("summary", {}, `Voir les ${b.dpe.length} logements`), el("ul", { class: "liste-dpe" }, b.dpe.map(ligneDpe))),
    ],
    // À droite : la facture estimée pour un logement seul, le nombre de logements pour un immeuble.
    cote: seul
      ? [
          el("span", { class: "prix-principal" }, seul.cout ? montant(Math.round(seul.cout)) : "—"),
          el("span", { class: "ecart" }, seul.cout ? "d'énergie par an" : "facture inconnue"),
        ]
      : [el("span", { class: "prix-principal" }, b.dpe.length), el("span", { class: "ecart" }, "logements")],
  });
}
