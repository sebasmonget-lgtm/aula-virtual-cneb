/** Format a stored civil date without shifting it to the browser's time zone. */
export function displayDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC", ...options }).format(date);
}

let qaClock: { date: string; time: string } | null = null;
export function setQADisplayClock(value: { date: string; time: string } | null) { qaClock = value; }
export function displayNow() {
  return qaClock ? new Date(`${qaClock.date}T${qaClock.time}:00-05:00`) : new Date();
}
export function limaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(displayNow());
}

/** Catalog timestamps use the classroom's civil day; planned dates remain literal. */
export function displayDocumentDate(value:string|null|undefined){
  if(!value)return '';
  if(!value.includes('T'))return displayDate(value,{month:'short'});
  const date=new Date(value);if(Number.isNaN(date.valueOf()))return '';
  return new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Lima'}).format(date);
}
