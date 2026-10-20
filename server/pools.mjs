import {randomUUID} from 'node:crypto';
import {addDays,localDate,monday} from './dates.mjs';
import {fail} from './store.mjs';
import {goals} from './savings.mjs';
import {gamificationState,savingsRewards} from './gamification.mjs';
import {coopContributions,coopState,effortXP} from './coop.mjs';
import {profileAvatars} from './profile-avatars.mjs';

export const poolNames=['daily','every3','weekly','occasional','monthly'];
const defaultPool=t=>{
 const id=Number(t.id.slice(1));
 if(t.recurrence.kind==='daily')return 'daily';
 if([11,12,13,14,15,16,18,19,20,21,22,26,34].includes(id))return 'every3';
 if((t.recurrence.interval||1)>1)return 'occasional';
 return 'weekly';
};
export function initializePools(db){
 const add=db.prepare('INSERT OR IGNORE INTO task_pools VALUES (?,?)');
 for(const t of db.prepare('SELECT id,recurrence FROM templates').all())add.run(t.id,defaultPool({...t,recurrence:JSON.parse(t.recurrence)}));
}
export function migrateLegacyCompletions(db){
 initializePools(db);
 const insert=db.prepare('INSERT OR IGNORE INTO task_completions VALUES (?,?,?,?,?,?,?,?,?)');
 for(const row of db.prepare(`SELECT o.*,p.pool,z.name AS zone FROM occurrences o
 JOIN task_pools p ON p.template_id=o.template_id JOIN templates t ON t.id=o.template_id
 JOIN zones z ON z.id=t.zone_id WHERE o.status='done' AND o.completed_at IS NOT NULL AND o.completed_by IS NOT NULL
 ORDER BY o.completed_at`).all()){
  const date=localDate(new Date(row.completed_at));
  const period=row.pool==='weekly'?monday(date):date;
  const snap=JSON.parse(row.snapshot);
  insert.run(randomUUID(),row.template_id,row.completed_by,row.completed_at,date,period,pointsFor(snap.minutes),snap.title,snap.zone||row.zone);
 }
}
export const pointsFor=effortXP;
const daysBetween=(a,b)=>Math.floor((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
function clearOldClaims(db,today){for(const claim of db.prepare('SELECT template_id,claimed_at FROM task_claims').all())if(claim.template_id!=='default-shopping-task'&&localDate(new Date(claim.claimed_at))<today)db.prepare('DELETE FROM task_claims WHERE template_id=?').run(claim.template_id);}
export function available(task,last,today){
 if(!last)return true;
 if(task.pool==='daily')return last.local_date!==today;
 if(task.pool==='weekly')return monday(last.local_date)!==monday(today);
 if(task.pool==='monthly')return last.local_date.slice(0,7)!==today.slice(0,7);
 return daysBetween(last.local_date,today)>=(task.pool==='every3'?3:28);
}
export function poolState(db,today=localDate()){
 initializePools(db);
 clearOldClaims(db,today);
 const people=db.prepare('SELECT p.id,p.name,p.color,p.active,a.avatar_key FROM people p LEFT JOIN profile_avatars a ON a.person_id=p.id ORDER BY p.rowid').all();
 const scoreEpoch=db.prepare('SELECT started_at FROM score_epoch WHERE id=1').get().started_at;
 const tasks=db.prepare(`SELECT t.id,t.title,t.steps,t.minutes,t.active,t.pet,t.zone_id,z.name AS zone,p.pool,c.person_id AS claimed_by,c.claimed_at,pt.points AS custom_points
 FROM templates t JOIN zones z ON z.id=t.zone_id JOIN task_pools p ON p.template_id=t.id
 LEFT JOIN task_claims c ON c.template_id=t.id LEFT JOIN task_points pt ON pt.template_id=t.id ORDER BY t.rowid`).all().map(t=>{
  const last=db.prepare('SELECT * FROM task_completions WHERE template_id=? ORDER BY completed_at DESC LIMIT 1').get(t.id)||null;
  const share=last&&db.prepare('SELECT person_id,points FROM coop_task_shares WHERE completion_id=?').get(last.id);
  return {...t,steps:JSON.parse(t.steps),last:last?{...last,shared_with:share?.person_id||null}:null,available:available(t,last,today),points:t.custom_points??pointsFor(t.minutes)};
 });
 const completions=db.prepare('SELECT * FROM task_completions ORDER BY completed_at DESC LIMIT 100').all();
 const taskParticipants=db.prepare(`SELECT person_id,local_date FROM task_completions
  UNION ALL SELECT s.person_id,c.local_date FROM coop_task_shares s JOIN task_completions c ON c.id=s.completion_id`).all();
 const yesterday=addDays(today,-1);
 const yesterdayTaskPeople=[...new Set(taskParticipants.filter(row=>row.local_date===yesterday).map(row=>row.person_id))];
 const previousTaskPeople=[...new Set(taskParticipants.filter(row=>row.local_date<yesterday).map(row=>row.person_id))];
 const latePlannedMeals=db.prepare(`SELECT m.date,m.slot,r.name FROM meal_plan m JOIN recipes r ON r.id=m.recipe_id
  LEFT JOIN meal_completions c ON c.date=m.date AND c.slot=m.slot
  WHERE m.date<=? AND c.date IS NULL ORDER BY m.date DESC,m.slot DESC LIMIT 50`).all(addDays(today,-3));
 const activity=db.prepare(`SELECT id,person_id,completed_at,local_date,points,title,zone FROM (
  SELECT id,person_id,completed_at,local_date,points,title,zone FROM task_completions
  UNION ALL SELECT 'meal:'||m.date||':'||m.slot,m.person_id,m.completed_at,m.date,m.points,'Comida casera: '||r.name,'Comidas' FROM meal_completions m JOIN recipes r ON r.id=m.recipe_id
  UNION ALL SELECT 'no-delivery:'||date,person_id,completed_at,date,points,'Día sin pedido a domicilio','Ahorro' FROM no_delivery_days
  UNION ALL SELECT 'share:'||s.completion_id,s.person_id,c.completed_at,c.local_date,s.points,c.title||' (en equipo)',c.zone FROM coop_task_shares s JOIN task_completions c ON c.id=s.completion_id
 ) WHERE completed_at>? ORDER BY completed_at DESC LIMIT 100`).all(scoreEpoch);
 const pointsSql=`SELECT person_id,local_date,completed_at,points FROM task_completions UNION ALL SELECT person_id,date AS local_date,completed_at,points FROM meal_completions UNION ALL SELECT person_id,date AS local_date,completed_at,points FROM no_delivery_days UNION ALL SELECT s.person_id,c.local_date,c.completed_at,s.points FROM coop_task_shares s JOIN task_completions c ON c.id=s.completion_id`;
 const totals=db.prepare(`SELECT person_id,COUNT(*) AS count,COALESCE(SUM(points),0) AS points FROM (${pointsSql}) WHERE completed_at>? GROUP BY person_id`).all(scoreEpoch);
 const todayPoints=db.prepare(`SELECT person_id,COALESCE(SUM(points),0) AS points FROM (${pointsSql}) WHERE local_date=? AND completed_at>? GROUP BY person_id`).all(today,scoreEpoch);
 const weekStart=monday(today);
 const week=db.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(points),0) AS points FROM (${pointsSql}) WHERE local_date BETWEEN ? AND ? AND completed_at>?`).get(weekStart,today,scoreEpoch);
 const weekPeople=db.prepare(`SELECT person_id,COUNT(*) AS count,COALESCE(SUM(points),0) AS points FROM (${pointsSql}) WHERE local_date BETWEEN ? AND ? AND completed_at>? GROUP BY person_id`).all(weekStart,today,scoreEpoch);
 const rewards=savingsRewards(db,scoreEpoch);
 const coopPoints=coopContributions(db,scoreEpoch);
 const addScore=(rows,reward)=>{let row=rows.find(item=>item.person_id===reward.person_id);if(!row){row={person_id:reward.person_id,count:0,points:0};rows.push(row);}row.count++;row.points+=reward.points;};
 for(const reward of [...rewards,...coopPoints]){
  addScore(totals,reward);
  if(reward.local_date===today){let row=todayPoints.find(item=>item.person_id===reward.person_id);if(!row){row={person_id:reward.person_id,points:0};todayPoints.push(row);}row.points+=reward.points;}
  if(reward.local_date>=weekStart&&reward.local_date<=today){week.count++;week.points+=reward.points;addScore(weekPeople,reward);}
  activity.push(reward);
 }
 activity.sort((a,b)=>b.completed_at.localeCompare(a.completed_at));activity.length=Math.min(activity.length,100);
 const saved=db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS total FROM savings_entries').get().total;
 const briefing={meals:db.prepare(`SELECT m.date,m.slot,r.name,c.person_id AS cooked_by FROM meal_plan m JOIN recipes r ON r.id=m.recipe_id LEFT JOIN meal_completions c ON c.date=m.date AND c.slot=m.slot WHERE m.date=? ORDER BY m.slot`).all(today),noDelivery:!!db.prepare('SELECT 1 FROM no_delivery_days WHERE date=?').get(today),savings_cents:saved,nextGoal:goals.find(goal=>goal.amount_cents>saved)||null};
 const gamification=gamificationState(db,{today,epoch:scoreEpoch,weekStart,weekPoints:week.points,rewards});
 const coop=coopState(db,{today,epoch:scoreEpoch,weekStart});
 coop.level=Math.floor(totals.reduce((n,row)=>n+row.points,0)/500)+1;
 return {today,serverTime:new Date().toISOString(),scoreEpoch,people,profileAvatars,zones:db.prepare('SELECT id,name FROM zones ORDER BY rowid').all(),tasks,completions,yesterdayTaskPeople,previousTaskPeople,latePlannedMeals,activity,totals,todayPoints,week:{...week,start:weekStart,people:weekPeople},briefing,gamification,coop};
}
export function poolAction(db,b,today=localDate()){
 clearOldClaims(db,today);
 const task=db.prepare(`SELECT t.id,t.title,t.minutes,t.active,z.name AS zone,p.pool,c.person_id AS claimed_by,pt.points AS custom_points
 FROM templates t JOIN zones z ON z.id=t.zone_id JOIN task_pools p ON p.template_id=t.id
 LEFT JOIN task_claims c ON c.template_id=t.id LEFT JOIN task_points pt ON pt.template_id=t.id WHERE t.id=?`).get(b.template_id);
 if(!task||!task.active)fail(404,'Esta tarea ya no está disponible.');
 const last=db.prepare('SELECT * FROM task_completions WHERE template_id=? ORDER BY completed_at DESC LIMIT 1').get(task.id)||null;
 if(b.action==='claim'){
  if(!available(task,last,today))fail(409,'Esta tarea ya se hizo en este ciclo.');
  if(task.claimed_by)fail(409,'Otra persona ya ha cogido esta tarea.');
  const now=new Date();
  db.prepare('INSERT INTO task_claims VALUES (?,?,?)').run(task.id,b.actor,localDate(now)===today?now.toISOString():today+'T12:00:00.000Z');
 }else if(b.action==='release'){
  if(task.claimed_by!==b.actor)fail(409,'Solo quien cogió la tarea puede devolverla a la pool.');
  db.prepare('DELETE FROM task_claims WHERE template_id=?').run(task.id);
 }else if(b.action==='complete'){
  if(task.claimed_by!==b.actor)fail(409,'Coge primero la tarea desde la pool.');
  if(!available(task,last,today))fail(409,'Esta tarea ya se hizo en este ciclo.');
  if(b.with_person&&(!db.prepare('SELECT id FROM people WHERE id=? AND active=1').get(b.with_person)||b.with_person===b.actor||task.minutes<16))fail(400,'Elige a la otra persona para compartir una tarea de al menos 16 minutos.');
  const period=task.pool==='daily'?today:task.pool==='weekly'?monday(today):task.pool==='monthly'?today.slice(0,7)+'-01':today;
  const points=task.custom_points??pointsFor(task.minutes);
  const id=randomUUID(),actorPoints=b.with_person?Math.ceil(points/2):points;
  db.prepare('INSERT INTO task_completions VALUES (?,?,?,?,?,?,?,?,?)').run(id,task.id,b.actor,new Date().toISOString(),today,period,actorPoints,task.title,task.zone);
  if(b.with_person)db.prepare('INSERT INTO coop_task_shares VALUES (?,?,?)').run(id,b.with_person,points-actorPoints);
  db.prepare('DELETE FROM task_claims WHERE template_id=?').run(task.id);
 }else fail(400,'Acción desconocida.');
 return {ok:true};
}
