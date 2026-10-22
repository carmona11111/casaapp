// Stable household responsibilities; only the four Saturday extras keep block rotation.
export const fixedAssignments = {
  t1: ['ivan', null], t2: ['person2', null], t3: ['person2', null],
  t4: ['person2', null], t5: ['ivan', null],
  t6: ['ivan', 0], t7: ['person2', 0], t8: ['ivan', 0],
  t9: ['ivan', 2], t10: ['ivan', 2], t11: ['person2', 2],
  t12: ['ivan', 1], t13: ['ivan', 1],
  t14: ['person2', 2], t15: ['person2', 2], t16: ['person2', 1],
  t17: ['ivan', 3], t18: ['person2', 3], t19: ['person2', 3],
  t20: ['ivan', 4], t21: ['person2', 4], t22: ['person2', 4],
  t23: ['ivan', 5], t24: ['ivan', 5], t25: ['person2', 5], t26: ['ivan', 5],
};

export function applyBalancedPlan(db, effectiveDate = '2026-10-12') {
  for (const [id, [person, day]] of Object.entries(fixedAssignments)) {
    const template = db.prepare('SELECT recurrence FROM templates WHERE id=?').get(id);
    if (!template) throw new Error(`Falta la plantilla ${id}; no se puede reorganizar el plan.`);
    const recurrence = JSON.parse(template.recurrence);
    if (day !== null) recurrence.day = day;
    db.prepare('UPDATE templates SET person_id=?,recurrence=? WHERE id=?')
      .run(person, JSON.stringify(recurrence), id);
  }
  db.prepare('UPDATE templates SET title=? WHERE id=?').run('Revisar y sacar basura si hace falta', 't5');
  db.prepare('UPDATE templates SET title=?,steps=?,minutes=? WHERE id=?').run(
    'Barrer y fregar el salón',
    JSON.stringify(['Despejar el suelo del salón.', 'Barrer o aspirar el salón.', 'Fregar el suelo y dejar secar.']),
    20, 't16',
  );
  db.prepare(`INSERT OR IGNORE INTO templates
    (id,household_id,title,steps,zone_id,minutes,recurrence,block,person_id,effective_date,active,pet)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    't34', 'home', 'Barrer y fregar comedor y pasillo',
    JSON.stringify(['Despejar comedor y pasillo.', 'Barrer o aspirar ambas zonas.', 'Fregar el suelo y dejar secar.']),
    'z1', 10, JSON.stringify({kind: 'weekly', day: 5, interval: 1, offset: 0}),
    'B', 'person2', effectiveDate, 1, 0,
  );
}
