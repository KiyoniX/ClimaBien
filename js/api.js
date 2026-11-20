// Lecture des DPE de l'ADEME (data.ademe.fr), directement depuis le navigateur.
import { CONFIG } from "./config.js";
import { distanceKm } from "./base/format.js";
import { requeteJson } from "./base/reseau.js";

// Seulement les champs utiles : réponses bien plus légères.
const CHAMPS = [
  "numero_dpe",
  "numero_dpe_remplace",
  "date_etablissement_dpe",
  "etiquette_dpe",
  "etiquette_ges",
  "type_batiment",
  "periode_construction",
  "surface_habitable_logement",
  "adresse_ban",
  "identifiant_ban",
  "complement_adresse_logement",
  "cout_total_5_usages",
  "conso_5_usages_par_m2_ep",
  "_geopoint",
].join(",");

const PAR_PAGE = 10000; // maximum accepté par l'API

// Zones déjà téléchargées : { centre, rayonKm, batiments, lu }.
const cache = [];
const TAILLE_CACHE = 10;

/**
 * DPE du cercle (centre, rayonKm), regroupés par bâtiment, avec la distance au centre.
 * Si une zone récente du cache contient tout le cercle, aucune requête n'est faite.
 * @returns {Promise<{ batiments, luA: Date, incomplet: boolean }>}
 */
export async function chargerBatiments({ centre, rayonKm, signal, ageMaxMs = CONFIG.reseau.cacheMinutes * 60000 }) {
  const maintenant = Date.now();
  let zone = cache.find((z) => maintenant - z.lu < ageMaxMs && distanceKm(z.centre, centre) + rayonKm <= z.rayonKm + 0.001);

  if (!zone) {
    const { lignes, incomplet } = await telecharger(centre, rayonKm, signal);
    zone = { centre: { lat: centre.lat, lon: centre.lon }, rayonKm, batiments: regrouper(lignes), incomplet, lu: Date.now() };
    cache.unshift(zone);
    cache.length = Math.min(cache.length, TAILLE_CACHE);
  }

  const batiments = zone.batiments
    .map((b) => ({ ...b, distance: distanceKm(centre, b) }))
    .filter((b) => b.distance <= rayonKm);
  return { batiments, luA: new Date(zone.lu), incomplet: zone.incomplet };
}

/** Tous les DPE du cercle, page après page (lien `next` de l'API), dans la limite de CONFIG.pagesMax. */
async function telecharger(centre, rayonKm, signal) {
  const url = new URL(CONFIG.api);
  url.search = new URLSearchParams({
    geo_distance: `${centre.lon},${centre.lat},${Math.round(rayonKm * 1000)}m`,
    select: CHAMPS,
    size: PAR_PAGE,
  });
  const lignes = [];
  let suivante = url;
  for (let page = 0; suivante && page < CONFIG.pagesMax; page++) {
    const reponse = await requeteJson(suivante, { signal, ecartMs: CONFIG.reseau.ecartDpeMs });
    lignes.push(...reponse.results);
    suivante = reponse.next ?? null;
  }
  return { lignes, incomplet: Boolean(suivante) };
}

const PAR_LETTRE = new Map(CONFIG.etiquettes.map((e, i) => [e.lettre, { ...e, rang: i }]));

/** Un DPE de l'API → objet de la page, ou null s'il est inutilisable. */
function dpe(brut) {
  const etiquette = PAR_LETTRE.get(brut.etiquette_dpe);
  const [lat, lon] = (brut._geopoint ?? "").split(",").map(Number);
  if (!etiquette || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id: brut.numero_dpe,
    date: brut.date_etablissement_dpe ? new Date(brut.date_etablissement_dpe) : null,
    etiquette,
    ges: brut.etiquette_ges ?? null,
    type: brut.type_batiment ?? null,
    periode: brut.periode_construction ?? null,
    surface: brut.surface_habitable_logement ?? null,
    complement: brut.complement_adresse_logement?.trim() || null,
    cout: brut.cout_total_5_usages ?? null, // facture d'énergie estimée, €/an
    conso: brut.conso_5_usages_par_m2_ep ?? null, // kWh d'énergie primaire par m² et par an
    adresse: brut.adresse_ban ?? "Adresse inconnue",
    cleBatiment: brut.identifiant_ban || brut.adresse_ban || `${lat},${lon}`,
    lat,
    lon,
  };
}

/** Étiquette du milieu d'une liste triée (la plus représentative du bâtiment). */
const mediane = (etiquettes) => etiquettes[Math.floor((etiquettes.length - 1) / 2)];

/**
 * Regroupe les DPE par bâtiment (identifiant d'adresse BAN) et écarte les DPE remplacés par un plus récent.
 * Chaque bâtiment : { id, adresse, lat, lon, dpe (du plus récent au plus ancien), repartition, mediane, pire }.
 */
export function regrouper(bruts) {
  const remplaces = new Set(bruts.map((b) => b.numero_dpe_remplace).filter(Boolean));
  const parBatiment = new Map();
  for (const brut of bruts) {
    if (remplaces.has(brut.numero_dpe)) continue;
    const d = dpe(brut);
    if (!d) continue;
    let b = parBatiment.get(d.cleBatiment);
    if (!b) parBatiment.set(d.cleBatiment, (b = { id: d.cleBatiment, adresse: d.adresse, lat: d.lat, lon: d.lon, dpe: [] }));
    b.dpe.push(d);
  }
  return [...parBatiment.values()].map(completer);
}

/** Ajoute à un bâtiment ses statistiques (répartition, médiane, pire étiquette), à partir de ses DPE. */
export function completer(b) {
  const dpe = [...b.dpe].sort((x, y) => (y.date ?? 0) - (x.date ?? 0));
  const etiquettes = dpe.map((d) => d.etiquette).sort((x, y) => x.rang - y.rang);
  const repartition = Object.fromEntries(CONFIG.etiquettes.map((e) => [e.lettre, 0]));
  for (const e of etiquettes) repartition[e.lettre]++;
  return { ...b, dpe, repartition, mediane: mediane(etiquettes), pire: etiquettes.at(-1) };
}
