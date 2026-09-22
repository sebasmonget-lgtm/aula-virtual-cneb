const instructionalBlocks = new Set(["activity", "workshop"]);

function minutes(value) {
  const [hours, minutesValue] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutesValue;
}

export function resolveDailyState({ now, scheduleEntries, attendanceRecorded, calendarException }) {
  if (calendarException && calendarException.is_instructional === false) {
    return { mode: "no_classes", currentBlock: null, nextBlock: null, primaryAction: "none", pendingItems: [] };
  }
  if (!scheduleEntries.length) {
    return { mode: "no_schedule", currentBlock: null, nextBlock: null, primaryAction: "configure_schedule", pendingItems: [] };
  }

  const ordered = [...scheduleEntries].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const currentMinute = minutes(now);
  const overridden = ordered.find((entry) => entry.status === "active" && entry.current_override);
  const timedCurrent = ordered.find((entry) => entry.status !== "completed" && entry.status !== "skipped" && currentMinute >= minutes(entry.start_time) && currentMinute < minutes(entry.end_time));
  const currentBlock = overridden ?? timedCurrent ?? null;
  const nextBlock = ordered.find((entry) => entry.status !== "completed" && entry.status !== "skipped" && minutes(entry.start_time) > currentMinute) ?? null;
  const firstInstructional = ordered.find((entry) => instructionalBlocks.has(entry.block_type));
  const beforeFirst = currentMinute < minutes(ordered[0].start_time);

  if (!attendanceRecorded && (beforeFirst || currentBlock?.block_type === "routine" || currentBlock?.block_type === "activity")) {
    return { mode: "attendance", currentBlock, nextBlock, primaryAction: "attendance", pendingItems: ["attendance"] };
  }
  const pendingClosure = ordered
    .filter((entry) => instructionalBlocks.has(entry.block_type) && entry.status !== "completed" && entry.status !== "skipped" && currentMinute >= minutes(entry.end_time))
    .at(-1);
  if (!currentBlock && pendingClosure) {
    return {
      mode: "closure",
      currentBlock: pendingClosure,
      nextBlock: ordered.find((entry) => minutes(entry.start_time) > minutes(pendingClosure.end_time)) ?? null,
      primaryAction: "close_block",
      pendingItems: ["closure"],
    };
  }
  if (currentBlock?.status === "completed" || currentBlock?.status === "skipped") {
    return { mode: "next", currentBlock: null, nextBlock, primaryAction: nextBlock ? "open_next" : "close_day", pendingItems: [] };
  }
  if (currentBlock) {
    const action = currentBlock.status === "active" && instructionalBlocks.has(currentBlock.block_type)
      ? "continue_block"
      : currentBlock.status === "active" ? "view_block" : "start_block";
    return { mode: "in_progress", currentBlock, nextBlock, primaryAction: action, pendingItems: [] };
  }
  if (nextBlock) return { mode: "upcoming", currentBlock: null, nextBlock, primaryAction: "open_next", pendingItems: [] };
  return { mode: "day_complete", currentBlock: null, nextBlock: null, primaryAction: "close_day", pendingItems: firstInstructional ? [] : ["review_schedule"] };
}
