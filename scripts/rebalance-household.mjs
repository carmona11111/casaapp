import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { applyBalancedPlan } from '../server/household-plan.mjs';
import { act, event, generate, occurrence, plan, refreshFuture, transaction } from '../server/store.mjs';
import { localDate, monday, addDays } from '../server/dates.mjs';

export function reorganizeHousehold(db, date, actor = 'ivan') {
  const marker = 'household-rebalance-2026-10-13';
  if (db.prepare('SELECT id FROM requests WHERE id=?').get(marker)) return {alreadyApplied: true};
  return transaction(db, () => {
    const before = plan(db);
    applyBalancedPlan(db, date);
    refreshFuture(db, date);
    const after = plan(db);
    // Fixed chores also apply to still-open overdue occasions, preserving their original owner.
    for (const raw of db.prepare("SELECT * FROM occurrences WHERE status='open' AND scheduled_date<?").all(date)) {
      const template = after.templates.find(t => t.id === raw.template_id);
      if (!template?.person_id || raw.current_person === template.person_id) continue;
      if (db.prepare("SELECT 1 FROM events WHERE occurrence_id=? AND action IN ('take','reassign') LIMIT 1").get(raw.id)) continue;
      db.prepare('UPDATE occurrences SET current_person=?,version=version+1 WHERE id=?').run(template.person_id, raw.id);
      event(db, raw.id, 'reassign', actor, {
        before: occurrence(raw), after: {current_person: template.person_id},
        reason: 'Reparto fijo acordado para las tareas pendientes del hogar.',
      });
    }
    // Only generate today's newly scheduled repetitions here; ordinary reads generate the rest.
    const template = after.templates.find(t => t.id === 't16');
    let today = db.prepare('SELECT * FROM occurrences WHERE template_id=? AND original_date=?').get('t16', date);
    if (!today) {
      const snapshot = {title: template.title, steps: template.steps, minutes: template.minutes,
        zone_id: template.zone_id, zone: after.zones.find(z => z.id === template.zone_id).name, kind: template.recurrence.kind};
      db.prepare(`INSERT INTO occurrences
        (id,template_id,household_id,original_date,scheduled_date,original_person,current_person,snapshot)
        VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(), 't16', 'home', date, date, 'person2', 'person2', JSON.stringify(snapshot));
      today = db.prepare('SELECT * FROM occurrences WHERE template_id=? AND original_date=?').get('t16', date);
    }
    if (today.status !== 'open') throw new Error('La ocasión del salón ya tiene actividad; revisa antes de aplicar la reorganización.');
    const older = db.prepare("SELECT id FROM occurrences WHERE template_id='t16' AND status='open' AND id<>? AND scheduled_date<=?").all(today.id, date);
    if (older.length) throw new Error('Hay ocasiones previas de zonas comunes: revisa su alcance antes de cerrarlas como salón.');
    const done = act(db, {id: today.id, version: today.version, actor: 'person2', action: 'complete', covered: [],
      reason: 'El usuario confirma que Irene ha barrido y fregado el salón hoy martes. Registro realizado ahora; no implica comedor ni pasillo.'});
    event(db, null, 'plan', actor, {before, after, scope: 'future-and-open-fixed-chores', effectiveFrom: date,
      reason: 'Lavavajillas y basura fijos para Iván; salón los martes para Irene; resto del plan equilibrado y extras alternos.'});
    db.prepare('UPDATE household SET revision=revision+1').run();
    const result = {alreadyApplied: false, completed: done.id, date};
    db.prepare('INSERT INTO requests VALUES (?,?,?)').run(marker, JSON.stringify(result), new Date().toISOString());
    return result;
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const date = localDate();
  if (date !== '2026-10-13') throw new Error('Este ajuste corresponde al martes 13/10/2026. No se puede registrar como hoy en otra fecha.');
  const path = process.env.DATABASE_PATH || 'data/casa.sqlite';
  if (!existsSync(path)) throw new Error('No existe la base actual del hogar.');
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  try {
    mkdirSync('data/backups', {recursive: true});
    const backupPath = `data/backups/antes-reparto-${Date.now()}.json`;
    writeFileSync(backupPath, JSON.stringify({schemaVersion: 1, exportedAt: new Date().toISOString(), plan: plan(db),
      occurrences: db.prepare('SELECT * FROM occurrences').all().map(occurrence),
      events: db.prepare('SELECT * FROM events').all().map(e => ({...e, changes: JSON.parse(e.changes)})),
      absences: db.prepare('SELECT * FROM absences').all().map(a => ({...a, exceptions: JSON.parse(a.exceptions)})),
    }, null, 2), {mode: 0o600});
    const result = reorganizeHousehold(db, date);
    generate(db, monday(date), addDays(monday(date), 27));
    const p = plan(db);
    const totals = p.people.map(person => ({person: person.name, weeks: Array.from({length: 4}, (_, i) => {
      const start = addDays(monday(date), 7 * i), end = addDays(start, 6);
      return db.prepare("SELECT SUM(json_extract(snapshot,'$.minutes')) AS minutes FROM occurrences WHERE current_person=? AND scheduled_date BETWEEN ? AND ? AND status IN ('open','done')").get(person.id, start, end).minutes;
    })}));
    console.log(JSON.stringify({result, backupPath, totals}, null, 2));
  } finally { db.close(); }
}
