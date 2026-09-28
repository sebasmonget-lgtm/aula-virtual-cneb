import test from "node:test";
import assert from "node:assert/strict";
import { validateShortAudio, transcribeAndPolishAudio } from "./audio-note-service.mjs";

function wav(seconds) {
  const sampleRate = 8000;
  const size = Math.round(seconds * sampleRate * 2);
  const bytes = Buffer.alloc(44 + size);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(36 + size, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write("data", 36);
  bytes.writeUInt32LE(size, 40);
  return bytes;
}

test("un audio de un minuto se acepta y uno más largo se rechaza desde el servidor", async () => {
  assert.equal(Math.round((await validateShortAudio(wav(60), "audio/wav")).durationSeconds), 60);
  await assert.rejects(validateShortAudio(wav(61), "audio/wav"), /máximo un minuto/);
  await assert.rejects(validateShortAudio(Buffer.from("no es audio"), "audio/wav"), /duración/);
});

test("transcribe y propone redacción con Luna sin guardar ni alterar el audio", async () => {
  const calls = [];
  const client = { audio: { transcriptions: { create: async (request) => {
    calls.push(request.model); return { text: "Camila conto tres vasos y dijo falta uno" };
  } } }, responses: { create: async (request) => {
    calls.push(request.model);
    assert.doesNotMatch(request.input, /Camila/);
    return { output_text: JSON.stringify({ improved_text: "Contó tres vasos y dijo que faltaba uno." }) };
  } } };
  const result = await transcribeAndPolishAudio({ bytes: wav(1), mimeType: "audio/wav", context: "Lonchera", names: ["Camila"], client });
  assert.deepEqual(calls, ["gpt-4o-mini-transcribe", "gpt-6-luna"]);
  assert.match(result.transcript, /Camila/);
  assert.match(result.improved_text, /Contó/);
});

test("la entrevista conserva las palabras de la familia sin reescritura ni inferencia", async () => {
  let rewriteCalls = 0;
  const client = { audio: { transcriptions: { create: async () => ({ text: "En casa conversamos en quechua y castellano." }) } },
    responses: { create: async () => { rewriteCalls++; throw new Error("No debe reescribir una entrevista"); } } };
  const result = await transcribeAndPolishAudio({ bytes: wav(1), mimeType: "audio/wav", purpose: "interview", client });
  assert.equal(result.improved_text, result.transcript);
  assert.equal(rewriteCalls, 0);
  assert.equal(result.editing_model, null);
});

for (const purpose of ["teacher_comment", "group_summary"]) {
  test(`${purpose} transcribe literalmente y no genera recomendaciones`, async () => {
    let transcriptions = 0;
    const client = { audio: { transcriptions: { create: async () => {
      transcriptions++; return { text: "Quiero seguir observando cómo expresan sus ideas." };
    } } }, responses: { create: async () => { throw new Error("No debe interpretar el comentario docente"); } } };
    const result = await transcribeAndPolishAudio({ bytes: wav(1), mimeType: "audio/wav", purpose, client });
    assert.equal(transcriptions, 1);
    assert.equal(result.transcript, "Quiero seguir observando cómo expresan sus ideas.");
    assert.equal(result.improved_text, result.transcript);
    assert.equal(result.editing_model, null);
  });
}

test("un propósito de audio desconocido no llama al proveedor", async () => {
  await assert.rejects(transcribeAndPolishAudio({ bytes: wav(1), mimeType: "audio/wav", purpose: "automatic_assessment",
    client: { audio: { transcriptions: { create: async () => { throw new Error("No debe enviar audio"); } } } } }), TypeError);
});
