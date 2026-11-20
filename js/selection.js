// Logique pure : quels bâtiments et quels DPE afficher, dans quel ordre. Aucun accès au DOM (tests/selection.test.js).
import { CONFIG } from "./config.js";
import { completer } from "./api.js";
import { normaliser } from "./base/format.js";

const typeDe = (cle) => CONFIG.types.find((t) => t.cle === cle) ?? CONFIG.types[0];

const ORDRES = {
  distance: (a, b) => a.distance - b.distance,
  // Les pires d'abord : pire étiquette, puis médiane, puis le plus proche.
  pire: (a, b) => b.pire.rang - a.pire.rang || b.mediane.rang - a.mediane.rang || a.distance - b.distance,
  meilleur: (a, b) => a.mediane.rang - b.mediane.rang || a.pire.rang - b.pire.rang || a.distance - b.distance,
};

/**
 * @param filtres { type, lettre (A…G ou null = toutes), texte (adresse), tri }
 * @returns {{ batiments, parLettre, nombreDpe }}
 *   batiments : ceux qui ont au moins un DPE retenu ; leurs statistiques ne portent que sur ces DPE
 *   parLettre : nombre de DPE par étiquette avant le filtre d'étiquette (pour les boutons)
 */
export function selectionner(batiments, { type, lettre = null, texte = "", tri = "distance" }) {
  const { types } = typeDe(type);
  const recherche = normaliser(texte.trim());

  const parLettre = Object.fromEntries(CONFIG.etiquettes.map((e) => [e.lettre, 0]));
  const retenus = [];
  for (const b of batiments) {
    if (recherche && !normaliser(b.adresse).includes(recherche)) continue;
    const duType = types ? b.dpe.filter((d) => types.includes(d.type)) : b.dpe;
    for (const d of duType) parLettre[d.etiquette.lettre]++;
    const choisis = lettre ? duType.filter((d) => d.etiquette.lettre === lettre) : duType;
    if (choisis.length) retenus.push(choisis.length === b.dpe.length ? b : completer({ ...b, dpe: choisis }));
  }

  const nombreDpe = retenus.reduce((n, b) => n + b.dpe.length, 0);
  return { batiments: retenus.sort(ORDRES[tri] ?? ORDRES.distance), parLettre, nombreDpe };
}
