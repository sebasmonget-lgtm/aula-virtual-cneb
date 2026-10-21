import { Cake, CalendarClock } from "lucide-react";
import type { LocalDashboard } from "@/src/lib/local-database";
import styles from "./today-birthdays.module.css";

export function TodayBirthdays({ birthdays }: { birthdays: LocalDashboard["today"]["birthdays"] }) {
  if (!birthdays || !birthdays.today.length && !birthdays.tomorrow.length) return null;
  return <section className={styles.panel} aria-labelledby="today-birthdays-title">
    <h2 id="today-birthdays-title">Cumpleaños</h2>
    <ul className={styles.list}>
      {birthdays.today.map(child => <li key={child.student_id + child.date}>
        <Cake aria-hidden="true" className={styles.cake} />
        <p>Hoy es el cumpleaños de <strong>{child.name}</strong>.
          {child.leap_day_adjusted && <span className={styles.note}>Nació el 29 de febrero; este año lo recordamos el 28.</span>}
        </p>
      </li>)}
      {birthdays.tomorrow.map(child => <li key={child.student_id + child.date}>
        <CalendarClock aria-hidden="true" className={styles.reminder} />
        <p>Mañana es el cumpleaños de <strong>{child.name}</strong>.
          {child.leap_day_adjusted && <span className={styles.note}>Nació el 29 de febrero; este año lo recordamos el 28.</span>}
        </p>
      </li>)}
    </ul>
  </section>;
}
