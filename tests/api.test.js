import { test } from "node:test";
import assert from "node:assert/strict";
import { regrouper } from "../js/api.js";

const dpe = (numero, etiquette, { ban = "63113_2240_00003", remplace, date = "2026-01-01", type = "appartement" } = {}) => ({
  numero_dpe: numero,
  numero_dpe_remplace: remplace,
  date_etablissement_dpe: date,
  etiquette_dpe: etiquette,
  type_batiment: type,
  adresse_ban: "3 rue Gregoire de Tours 63000 Clermont-Ferrand",
  identifiant_ban: ban,
  _geopoint: "45.7774,3.0873",
});

test("regrouper : un bâtiment par identifiant d'adresse, répartition, médiane et pire étiquette", () => {
  const [b, ...autres] = regrouper([dpe("1", "C"), dpe("2", "G"), dpe("3", "D"), dpe("4", "E", { ban: "autre" })]);
  assert.equal(autres.length, 1);
  assert.equal(b.dpe.length, 3);
  assert.equal(b.repartition.C + b.repartition.D + b.repartition.G, 3);
  assert.equal(b.mediane.lettre, "D");
  assert.equal(b.pire.lettre, "G");
});

test("regrouper : un DPE remplacé par un plus récent est écarté", () => {
  const [b] = regrouper([dpe("ancien", "G", { date: "2022-01-01" }), dpe("nouveau", "E", { remplace: "ancien", date: "2026-01-01" })]);
  assert.deepEqual(b.dpe.map((d) => d.id), ["nouveau"]);
});

test("regrouper : du plus récent au plus ancien ; ignore étiquette ou position inutilisable", () => {
  const [b] = regrouper([
    dpe("a", "C", { date: "2023-05-01" }),
    dpe("b", "D", { date: "2025-05-01" }),
    { ...dpe("c", "Z") },
    { ...dpe("d", "B"), _geopoint: "" },
  ]);
  assert.deepEqual(b.dpe.map((d) => d.id), ["b", "a"]);
});
