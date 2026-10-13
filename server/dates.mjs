export const mod = (n, m) => ((n % m) + m) % m;
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s + 'T12:00:00Z').toISOString().slice(0,10) === s; }
export const addDays = (s,n) => new Date(Date.parse(s + 'T12:00:00Z') + n * 86400000).toISOString().slice(0,10);
export const weekday = s => mod(new Date(s + 'T12:00:00Z').getUTCDay() - 1, 7);
export const monday = s => addDays(s,-weekday(s));
export const weekOffset = (date,base) => Math.floor((Date.parse(monday(date)) - Date.parse(base))/604800000);
export function localDate(now = new Date()) { return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function responsible(block,date,house,people) { const i = (block === 'B' ? 1 : 0) + (house.rotation ? mod(weekOffset(date,house.base_date),2) : 0); return people[mod(i,2)].id; }
export function matches(template,date,base) { if (!template.active || date < template.effective_date) return false; const r = typeof template.recurrence === 'string' ? JSON.parse(template.recurrence) : template.recurrence; if (r.kind === 'daily') return true; if (weekday(date) !== r.day) return false; return mod(weekOffset(date,base),r.interval || 1) === (r.offset || 0); }
