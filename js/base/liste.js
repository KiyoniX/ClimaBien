// Briques de la liste, utilisées par js/classement.js.
import { el } from "./format.js";

/**
 * Une fiche de la liste (<li class="fiche">), cliquable en entier sauf ses boutons, liens et détails.
 * @param id
 * @param pastille   { texte, couleur, titre } : rond de couleur à gauche (même couleur que le point sur la carte)
 * @param infos      contenu de la colonne du milieu (nom, adresse, badges…)
 * @param cote       contenu de la colonne de droite
 * @param lienMaps   lien Google Maps
 * @param actions    liens en plus de « Sur la carte » et « Google Maps »
 * @param surVoir(id)
 */
export function fiche({ id, pastille, infos, cote, lienMaps, actions = [], surVoir }) {
  return el(
    "li",
    {
      class: "fiche",
      "data-id": id,
      onclick: (e) => e.target.closest("a, button, details") || surVoir(id),
    },
    el("span", { class: "rang", style: `background: ${pastille.couleur}`, title: pastille.titre, "aria-label": pastille.titre }, pastille.texte),
    el("div", { class: "infos" }, infos),
    el("div", { class: "prix" }, cote),
    el(
      "div",
      { class: "actions" },
      el("button", { type: "button", onclick: () => surVoir(id) }, "Sur la carte"),
      el("a", { href: lienMaps, target: "_blank", rel: "noopener" }, "Google Maps ↗"),
      actions,
    ),
  );
}

/** Met en évidence une fiche de la liste (clic sur la carte) et la fait défiler jusqu'à elle. */
export function surligner(liste, id) {
  for (const ligne of liste.children) ligne.classList.toggle("active", ligne.dataset.id === id);
  liste.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
