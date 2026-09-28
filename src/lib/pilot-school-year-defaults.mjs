import { nationalCalendarBlocks2026 } from "./annual-plan-calendar.mjs";

/** Only suggest dates for a school year with a versioned official calendar in Ayni. */
export function pilotSchoolYearDefaults(year) {
  if (Number(year) !== 2026) return null;
  const blocks = nationalCalendarBlocks2026();
  const instructional = blocks.filter((block) => block.type === "instructional");
  return {
    startsOn: blocks[0].start_date,
    endsOn: blocks.at(-1).end_date,
    classesStartOn: instructional[0].start_date,
    classesEndOn: instructional.at(-1).end_date,
  };
}
