// Ce que la carte montre pour chaque bâtiment : couleur, taille, infobulle, bulle (voir js/base/carte.js).
import { CONFIG } from "./config.js";
import { alertes, barreRepartition, lettre, ligneDpe } from "./classement.js";
import { el, lienGoogleMapsRecherche } from "./base/format.js";

const DPE_DANS_LA_BULLE = 6;

/** Points de la carte : les meilleurs d'abord, pour que les passoires soient dessinées par-dessus. */
export function pointsCarte(batiments) {
  return [...batiments]
    .sort((a, b) => a.mediane.rang - b.mediane.rang)
    .map((b) => ({
      id: b.id,
      lat: b.lat,
      lon: b.lon,
      couleur: b.mediane.couleur,
      taille: Math.min(12, 5 + Math.log2(b.dpe.length) * 1.5), // un immeuble aux nombreux DPE se voit mieux
      infobulle: `${b.mediane.lettre} · ${b.adresse} (${b.dpe.length} DPE)`,
      bulle: () => bulle(b),
    }));
}

function bulle(b) {
  const reste = b.dpe.length - DPE_DANS_LA_BULLE;
  return el(
    "div",
    { class: "bulle" },
    el("strong", {}, b.adresse),
    b.dpe.length > 1 && [el("br"), barreRepartition(b)],
    el("div", { class: "badges" }, alertes(b)),
    el("ul", { class: "liste-dpe" }, b.dpe.slice(0, DPE_DANS_LA_BULLE).map(ligneDpe)),
    reste > 0 && el("small", {}, `… et ${reste} autres dans la liste`),
    el("br"),
    el("a", { href: lienGoogleMapsRecherche(b.adresse), target: "_blank", rel: "noopener" }, "Google Maps ↗"),
  );
}

/** Légende de la carte : les sept étiquettes. */
export function legende() {
  return [el("span", {}, "Étiquette médiane :"), ...CONFIG.etiquettes.map(lettre)];
}
