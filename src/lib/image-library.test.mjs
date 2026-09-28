import assert from "node:assert/strict";
import { test } from "node:test";
import { searchProjectImages, selectProjectImage } from "./image-library.mjs";

test("títulos distintos de plantas recuperan escenas coherentes", () => {
  assert.match(selectProjectImage({ title: "¿Cómo podemos cuidar las plantas de nuestro jardín?" })?.id ?? "",
    /^naturaleza_plantas_/);
  assert.equal(selectProjectImage({ title: "Descubrimos cómo germinan las semillas" })?.id,
    "naturaleza_plantas_germinacion_01");
});

test("títulos de áreas diferentes encuentran escenas concretas", () => {
  const cases = [
    ["Cuidamos el agua en casa y el aula", "ambiente_agua_cuidar_01"],
    ["Separamos los residuos para reciclar", "ambiente_reciclaje_clasificar_01"],
    ["Descubrimos qué flota y qué se hunde", "agua_exploracion_flotar_01"],
    ["Conocemos nuestros cinco sentidos", "cuerpo_sentidos_explorar_01"],
    ["Conocemos a los animales de la granja", "animales_granja_observar_01"],
    ["Celebramos las Fiestas Patrias", "celebraciones_fiestas_patrias_01"],
    ["Exploramos la costa y el mar peruano", "cultura_costa_mar_01"],
  ];
  for (const [title, expected] of cases) assert.equal(selectProjectImage({ title })?.id, expected, title);
});

test("la matemática cotidiana recupera el reparto de frutas", () => {
  assert.equal(selectProjectImage({ title: "Repartimos frutas y comparamos cantidades" })?.id,
    "matematica_repartir_frutas_01");
});

test("evita repetir una escena cuando hay una alternativa relevante", () => {
  const first = selectProjectImage({ title: "Cuidamos las plantas y semillas del jardín" });
  const second = selectProjectImage({ title: "Cuidamos las plantas y semillas del jardín" }, { usedIds: [first.id] });
  assert.notEqual(first.id, second.id);
});

test("no devuelve una imagen ajena cuando el tema no existe", () => {
  assert.equal(selectProjectImage({ title: "Conocemos las estrellas y los planetas" }), null);
  assert.deepEqual(searchProjectImages(""), []);
});
