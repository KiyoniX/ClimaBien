import { test } from "node:test";
import assert from "node:assert/strict";
import { regrouper } from "../js/api.js";
import { selectionner } from "../js/selection.js";

const dpe = (numero, etiquette, ban, adresse, type = "appartement") => ({
  numero_dpe: numero,
  date_etablissement_dpe: "2026-01-01",
  etiquette_dpe: etiquette,
  type_batiment: type,
  adresse_ban: adresse,
  identifiant_ban: ban,
  _geopoint: "45.7774,3.0873",
});

const distances = { proche: 0.02, moyen: 0.1, loin: 0.3 };
const batiments = regrouper([
  dpe("1", "B", "proche", "1 rue Blatin"),
  dpe("2", "G", "proche", "1 rue Blatin"),
  dpe("3", "D", "moyen", "8 avenue des Crêtes", "maison"),
  dpe("4", "F", "loin", "20 rue Blatin"),
]).map((b) => ({ ...b, distance: distances[b.id] }));

const ids = (r) => r.batiments.map((b) => b.id);

test("selectionner : tous les bâtiments, les plus proches d'abord, et le compte par étiquette", () => {
  const r = selectionner(batiments, { type: "tout" });
  assert.deepEqual(ids(r), ["proche", "moyen", "loin"]);
  assert.equal(r.nombreDpe, 4);
  assert.deepEqual(r.parLettre, { A: 0, B: 1, C: 0, D: 1, E: 0, F: 1, G: 1 });
});

test("selectionner : les pires d'abord (pire étiquette du bâtiment)", () => {
  assert.deepEqual(ids(selectionner(batiments, { type: "tout", tri: "pire" })), ["proche", "loin", "moyen"]);
});

test("selectionner : filtre d'étiquette, statistiques recalculées sur les DPE retenus", () => {
  const r = selectionner(batiments, { type: "tout", lettre: "G" });
  assert.deepEqual(ids(r), ["proche"]);
  assert.equal(r.batiments[0].dpe.length, 1);
  assert.equal(r.batiments[0].mediane.lettre, "G");
  assert.equal(r.parLettre.B, 1); // les compteurs ignorent le filtre d'étiquette
});

test("selectionner : type de logement et recherche d'adresse sans accents", () => {
  assert.deepEqual(ids(selectionner(batiments, { type: "maisons" })), ["moyen"]);
  assert.deepEqual(ids(selectionner(batiments, { type: "tout", texte: "cretes" })), ["moyen"]);
  assert.deepEqual(ids(selectionner(batiments, { type: "tout", texte: "BLATIN" })), ["proche", "loin"]);
});
