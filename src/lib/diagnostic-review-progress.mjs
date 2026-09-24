/** One teacher-confirmed comment per child; observations remain separate facts. */
/** @param {import('./local-database').DiagnosticReviewWorkspace} workspace */
export function diagnosticReviewProgress(workspace) {
  const children = workspace.students.map((student) => {
    const reviews = workspace.student_reviews.filter((row) => row.student_id === student.id);
    const confirmed = reviews.find((row) => row.status === "confirmed");
    const draft = reviews.find((row) => row.status === "draft");
    return { studentId: student.id, status: confirmed?.is_current ? "reviewed" : draft ? "draft" : confirmed ? "outdated" : "pending" };
  });
  const reviewedCount = children.filter((item) => item.status === "reviewed").length;
  return { children, reviewedCount, studentCount: children.length,
    allReviewed: children.length > 0 && reviewedCount === children.length,
    nextStudentId: children.find((item) => item.status !== "reviewed")?.studentId ?? null };
}
