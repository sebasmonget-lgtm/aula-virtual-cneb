import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticReviewProgress } from "./diagnostic-review-progress.mjs";

test("un solo comentario confirmado y vigente completa al niño, incluso si requiere observar más", () => {
  const workspace = { students: [{ id: "ana" }, { id: "luis" }], student_reviews: [
    { student_id: "ana", status: "confirmed", is_current: true, details: { information_status: "insufficient_information" } },
  ] };
  const progress = diagnosticReviewProgress(workspace);
  assert.equal(progress.reviewedCount, 1);
  assert.equal(progress.allReviewed, false);
  assert.equal(progress.nextStudentId, "luis");
  workspace.student_reviews.push({ student_id: "luis", status: "confirmed", is_current: true });
  assert.equal(diagnosticReviewProgress(workspace).allReviewed, true);
});

test("una fuente nueva devuelve el comentario a pendiente y un borrador se distingue", () => {
  const workspace = { students: [{ id: "ana" }, { id: "luis" }], student_reviews: [
    { student_id: "ana", status: "confirmed", is_current: false },
    { student_id: "luis", status: "draft", is_current: true },
  ] };
  assert.deepEqual(diagnosticReviewProgress(workspace).children.map((item) => item.status), ["outdated", "draft"]);
  assert.equal(diagnosticReviewProgress(workspace).allReviewed, false);
});
