import {randomUUID} from 'node:crypto';
import {addDays,localDate,monday} from './dates.mjs';
import {aggregateShopping} from './meals.mjs';
import {fail} from './store.mjs';
import {profileAvatars} from './profile-avatars.mjs';

export const effortXP=minutes=>minutes<=5?5:minutes<=15?10:minutes<=30?20:30;
export const eventKinds={
 joint_clean:{title:'Limpieza en equipo',unit:'min',min:15,max:60,period:'day'},
 review:{title:'Reunión de equipo',unit:'min',min:10,max:60,period:'week'},
 pantry:{title:'Revisar despensa',unit:'min',min:5,max:60,period:'week'},
 meal_prep:{title:'Preparar raciones para después',unit:'raciones',min:1,max:20,period:'day'},
 fridge_rescue:{title:'Aprovechar alimentos de nevera',unit:'ingredientes',min:1,max:20,period:'day'},
 budget_shop:{title:'Compra con lista y presupuesto',unit:'compra',min:1,max:1,period:'day'}
};
export const rewards=[
 {key:'movie',title:'Noche de peli o videojuegos',description:'Proteged un rato para elegir juntos y desconectar.',keys:1,max_cents:0},
 {key:'breakfast',title:'Desayuno especial en casa',description:'Preparadlo dentro del presupuesto de compra.',keys:2,max_cents:2500},
 {key:'free_afternoon',title:'Tarde libre de tareas no esenciales',description:'Adelantad o reprogramad esas tareas; no pasan a la otra persona.',keys:2,max_cents:0},
 {key:'treat',title:'Pequeño capricho compartido',description:'Un gusto pequeño con tope de 15 €.',keys:3,max_cents:1500},
 {key:'dinner',title:'Comer o cenar fuera',description:'Disponible tras una semana sin pedidos y con fondo suficiente.',keys:4,max_cents:8000,requires:'delivery_pause'},
 {key:'minimum_day',title:'Día de mantenimiento mínimo',description:'Planificad antes qué tareas son esenciales ese día.',keys:5,max_cents:0},
 {key:'date',title:'Cita especial',description:'Cine, exposición, excursión o un plan elegido por los dos.',keys:6,max_cents:12000},
 {key:'big_plan',title:'Aportación al plan grande',description:'Aportad al viaje o experiencia que ya habéis presupuestado.',keys:10,max_cents:30000}
];
const badgeDefinitions=[
 ['joint_first','Primera victoria','🏡','Primera limpieza conjunta de 15 minutos'],
 ['home_control','Casa bajo control','🧹','Misión de hogar completada'],
 ['bathrooms','Doble brillo','🫧','Los dos baños limpios en una semana'],
 ['boss','Jefe final: rincón pendiente','🧽','Una tarea ocasional de al menos 30 minutos'],
 ['maintenance','Mantenimiento legendario','🏆','Casa bajo control en 4 de 6 semanas'],
 ['delivery_pause','Delivery en pausa','🍽️','Siete días sin pedido y cinco comidas cocinadas'],
 ['week_resolved','Semana resuelta','👩‍🍳','Cinco comidas planificadas y compra preparada'],
 ['tuppers','Tuppers al rescate','🥘','Preparar cuatro raciones para después'],
 ['recipe_collection','Recetario en expansión','📖','Cocinar y valorar cinco recetas diferentes'],
 ['fridge','Rescate de nevera','🥬','Aprovechar tres ingredientes'],
 ['first_saving','Primer ladrillo','🪙','Primera aportación al ahorro'],
 ['goal_25','Estamos más cerca · bronce','🥉','Alcanzar el 25 % de Viaje express'],
 ['goal_50','Estamos más cerca · plata','🥈','Alcanzar el 50 % de Viaje express'],
 ['goal_75','Estamos más cerca · oro','🥇','Alcanzar el 75 % de Viaje express'],
 ['goal_100','Viaje express preparado','✈️','Alcanzar el objetivo de 1.000 €'],
 ['smart_shopping','Compra con cabeza','🛡️','Cuatro compras con lista y presupuesto'],
 ['team_mode','Modo cooperativo','🤝','Tres semanas con limpieza conjunta'],
 ['team_review','Reunión de equipo','📋','Revisar la casa en tres semanas'],
 ['fair_load','Carga compartida','⚖️','Dos semanas de reparto acordado por ambos'],
 ['goal_protected','Objetivo protegido','🔒','Cumplir un objetivo mensual de ahorro acordado'],
 ['return','Volvemos a la partida','🌱','Tres tareas tras una semana tranquila'],
 ['secret_double_cast','Doble reparto','?','Los dos habéis elegido una foto de perfil'],
 ['secret_same_film','Del mismo cuento','?','Los dos perfiles son de la misma película o universo'],
 ['secret_tandem_day','Un día, dos héroes','?','Los dos habéis completado una tarea el mismo día'],
 ['secret_kitchen_magic','Magia entre fogones','?','Una comida casera y una tarea completadas el mismo día']
];
const secretBadgeIds=new Set(['secret_double_cast','secret_same_film','secret_tandem_day','secret_kitchen_magic']);
const bonusKeys=new Set(['boss','maintenance','delivery_pause','fair_load']);
const sum=(rows,key)=>rows.reduce((n,row)=>n+row[key],0);
const within=(day,start,end)=>day>=start&&day<=end;

export function coopContributions(db,epoch){
 const people=db.prepare('SELECT id FROM people WHERE active=1 ORDER BY rowid').all().map(p=>p.id);
 return db.prepare('SELECT * FROM coop_events WHERE created_at>? ORDER BY created_at').all(epoch).flatMap(row=>{
  const title=eventKinds[row.kind]?.title||'Gesto de equipo';
  const entries=[{id:`coop:${row.id}`,person_id:row.person_id,completed_at:row.created_at,local_date:row.local_date,points:row.points_actor,title,zone:'Equipo'}];
  const partner=people.find(id=>id!==row.person_id);
  if(row.points_partner&&partner)entries.push({...entries[0],id:`coop:${row.id}:partner`,person_id:partner,points:row.points_partner});
  return entries;
 });
}

export function setCoopPlan(db,{week_start,target_xp,essentials,kitchen_mode='plan',team_mode='saving'}){
 if(monday(week_start)!==week_start||week_start<monday(localDate()))fail(400,'Elige esta semana o una futura.');
 if(new Set(essentials).size!==essentials.length)fail(400,'Hay tareas esenciales duplicadas.');
 for(const id of essentials)if(!db.prepare('SELECT id FROM templates WHERE id=? AND active=1').get(id))fail(400,'Tarea esencial no disponible.');
 db.prepare('INSERT INTO coop_weeks VALUES (?,?,?) ON CONFLICT(week_start) DO UPDATE SET target_xp=excluded.target_xp,essentials=excluded.essentials').run(week_start,target_xp,JSON.stringify(essentials));
 db.prepare('INSERT INTO coop_week_modes VALUES (?,?,?) ON CONFLICT(week_start) DO UPDATE SET kitchen_mode=excluded.kitchen_mode,team_mode=excluded.team_mode').run(week_start,kitchen_mode,team_mode);
 return {ok:true};
}

export function confirmFairWeek(db,{actor}){
 const week=monday(localDate());
 if(db.prepare('SELECT 1 FROM coop_fair_votes WHERE week_start=? AND person_id=?').get(week,actor))fail(409,'Ya confirmaste tu valoración esta semana.');
 db.prepare('INSERT INTO coop_fair_votes VALUES (?,?,?)').run(week,actor,new Date().toISOString());
 return {ok:true};
}

export function setMonthlyGoal(db,{actor,target_cents}){
 const month=localDate().slice(0,7);
 if(db.prepare('SELECT 1 FROM coop_monthly_awards WHERE month=?').get(month))fail(409,'El objetivo de este mes ya se consiguió. Podréis ajustar el próximo.');
 db.prepare('INSERT INTO coop_monthly_goals VALUES (?,?,?,?) ON CONFLICT(month) DO UPDATE SET target_cents=excluded.target_cents,set_by=excluded.set_by,set_at=excluded.set_at').run(month,target_cents,actor,new Date().toISOString());
 return {ok:true};
}

export function recordCoopEvent(db,{actor,kind,amount}){
 const definition=eventKinds[kind];
 if(!definition||amount<definition.min||amount>definition.max)fail(400,'Gesto de equipo no válido.');
 const day=localDate(),start=definition.period==='week'?monday(day):day;
 const previous=db.prepare(`SELECT 1 FROM coop_events WHERE kind=? AND local_date BETWEEN ? AND ? LIMIT 1`).get(kind,start,day);
 if(previous)fail(409,definition.period==='week'?'Este gesto ya está registrado esta semana.':'Este gesto ya está registrado hoy.');
 const points=kind==='joint_clean'?effortXP(amount):kind==='review'||kind==='pantry'?effortXP(amount):kind==='meal_prep'?10:kind==='budget_shop'?10:5;
 const partner=kind==='joint_clean'?Math.floor(points/2):0;
 db.prepare('INSERT INTO coop_events VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),kind,actor,amount,day,new Date().toISOString(),points-partner,partner);
 return {ok:true};
}

function fundBalance(db){return db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS n FROM coop_fund').get().n;}
export function transferToFund(db,{actor,amount_cents}){
 const now=new Date().toISOString(),month=localDate(new Date(now)).slice(0,7);
 const deposits=db.prepare('SELECT amount_cents,created_at FROM savings_entries WHERE amount_cents>0').all().filter(x=>localDate(new Date(x.created_at)).startsWith(month));
 const transferred=db.prepare('SELECT amount_cents,created_at FROM coop_fund WHERE amount_cents>0').all().filter(x=>localDate(new Date(x.created_at)).startsWith(month));
 const limit=Math.floor(sum(deposits,'amount_cents')*.25)-sum(transferred,'amount_cents');
 const saved=db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS n FROM savings_entries').get().n;
 if(amount_cents>limit||amount_cents>saved)fail(409,'El traspaso supera el 25 % de lo aportado este mes o el ahorro disponible.');
 const savingsId=randomUUID(),fundId=randomUUID();
 db.prepare('INSERT INTO savings_entries VALUES (?,?,?,?,?)').run(savingsId,actor,-amount_cents,'Traspaso al fondo de disfrute',now);
 db.prepare('INSERT INTO coop_fund VALUES (?,?,?,?,?)').run(fundId,actor,amount_cents,'Traspaso desde ahorro común',now);
 db.prepare('INSERT INTO coop_transfers VALUES (?,?,?,?)').run(savingsId,fundId,actor,amount_cents);
 return {ok:true};
}

export function redeemReward(db,{actor,reward_key,amount_cents}){
 const reward=rewards.find(item=>item.key===reward_key);
 if(!reward)fail(400,'Recompensa no válida.');
 if(amount_cents<0||amount_cents>reward.max_cents||(reward.max_cents>0&&amount_cents===0))fail(400,'Indica un coste válido para este plan.');
 const state=coopState(db);
 if(reward.requires&&!state.badges.find(b=>b.id===reward.requires)?.earned)fail(409,'Esta recompensa todavía está bloqueada.');
 if(state.keys.balance<reward.keys)fail(409,'Aún no tenéis llaves suficientes.');
 if(amount_cents>fundBalance(db))fail(409,'El fondo de disfrute no alcanza para este plan.');
 const now=new Date().toISOString();
 db.prepare('INSERT INTO coop_redemptions VALUES (?,?,?,?,?,?)').run(randomUUID(),reward_key,actor,reward.keys,amount_cents,now);
 if(amount_cents)db.prepare('INSERT INTO coop_fund VALUES (?,?,?,?,?)').run(randomUUID(),actor,-amount_cents,`Plan: ${reward.title}`,now);
 return {ok:true};
}

export function chooseSticker(db,{actor,badge_id}){
 coopState(db);
 if(!db.prepare('SELECT badge_id FROM coop_unlocks WHERE badge_id=?').get(badge_id))fail(409,'Primero desbloquead este sticker.');
 if(!badgeDefinitions.some(([id])=>id===badge_id))fail(400,'Sticker no válido.');
 db.prepare('UPDATE coop_profile SET badge_id=?,changed_by=?,changed_at=? WHERE id=1').run(badge_id,actor,new Date().toISOString());
 return {ok:true};
}

export function coopState(db,{today=localDate(),epoch=db.prepare('SELECT started_at FROM score_epoch WHERE id=1').get().started_at,weekStart=monday(today)}={}){
 db.prepare('INSERT OR IGNORE INTO coop_weeks VALUES (?,?,?)').run(weekStart,150,'[]');
 const week=db.prepare('SELECT * FROM coop_weeks WHERE week_start=?').get(weekStart);
 const modes=db.prepare('SELECT kitchen_mode,team_mode FROM coop_week_modes WHERE week_start=?').get(weekStart)||{kitchen_mode:'plan',team_mode:'saving'};
 const essentials=JSON.parse(week.essentials),end=addDays(weekStart,6);
 const tasks=db.prepare('SELECT * FROM task_completions WHERE completed_at>?').all(epoch);
 const meals=db.prepare('SELECT * FROM meal_completions WHERE completed_at>?').all(epoch);
 const delivery=db.prepare('SELECT * FROM no_delivery_days WHERE completed_at>?').all(epoch);
 const events=db.prepare('SELECT * FROM coop_events WHERE created_at>?').all(epoch);
 const savings=db.prepare('SELECT * FROM savings_entries WHERE amount_cents>0 AND created_at>?').all(epoch);
 const tasksWeek=tasks.filter(x=>within(x.local_date,weekStart,end));
 const sharedWeek=db.prepare('SELECT s.points,c.local_date,c.completed_at FROM coop_task_shares s JOIN task_completions c ON c.id=s.completion_id WHERE c.completed_at>?').all(epoch).filter(x=>within(x.local_date,weekStart,end));
 const mealsWeek=meals.filter(x=>within(x.date,weekStart,end));
 const eventsWeek=events.filter(x=>within(x.local_date,weekStart,end));
 const cleanedXP=sum(tasksWeek,'points')+sum(sharedWeek,'points')+eventsWeek.filter(e=>e.kind==='joint_clean').reduce((n,e)=>n+e.points_actor+e.points_partner,0);
 const essentialsDone=essentials.every(id=>tasksWeek.some(x=>x.template_id===id));
 const planned=db.prepare('SELECT * FROM meal_plan WHERE date BETWEEN ? AND ?').all(weekStart,end);
 const recipes=db.prepare('SELECT id,ingredients FROM recipes').all().map(x=>({...x,ingredients:JSON.parse(x.ingredients)}));
 const shopping=aggregateShopping(recipes,planned);
 const checks=new Map(db.prepare('SELECT item_key,quantity FROM shopping_checks WHERE week_start=?').all(weekStart).map(x=>[x.item_key,x.quantity]));
 const shoppingReady=shopping.length>0&&shopping.every(x=>(checks.get(x.key)||0)>=x.quantity);
 const savingsWeek=savings.some(x=>within(localDate(new Date(x.created_at)),weekStart,end));
 const reviewed=eventsWeek.some(x=>x.kind==='review');
 const deliveriesWeek=delivery.filter(x=>within(x.date,weekStart,end)).length;
 const jointWeek=eventsWeek.some(x=>x.kind==='joint_clean'&&x.amount>=20)||db.prepare('SELECT 1 FROM coop_task_shares s JOIN task_completions c ON c.id=s.completion_id WHERE c.local_date BETWEEN ? AND ? LIMIT 1').get(weekStart,end);
 const kitchenDelivery=modes.kitchen_mode==='delivery';
 const teamJoint=modes.team_mode==='joint';
 const missions=[
  {id:'home',title:'Hogar bajo control',icon:'🧹',progress:Math.min(cleanedXP,Math.ceil(week.target_xp*.8)),target:Math.ceil(week.target_xp*.8),detail:`${cleanedXP}/${Math.ceil(week.target_xp*.8)} XP de limpieza · ${essentials.filter(id=>tasksWeek.some(x=>x.template_id===id)).length}/${essentials.length} esenciales`,done:cleanedXP>=Math.ceil(week.target_xp*.8)&&essentialsDone},
  {id:'kitchen',title:kitchenDelivery?'Delivery en pausa':'Semana resuelta',icon:'🍳',progress:kitchenDelivery?Math.min(deliveriesWeek,7):Math.min(planned.length,5),target:kitchenDelivery?7:5,detail:kitchenDelivery?`${deliveriesWeek}/7 días sin pedido · ${mealsWeek.length}/5 comidas cocinadas`:`${planned.length}/5 comidas · ${shoppingReady?'compra preparada':'preparad la compra'}`,done:kitchenDelivery?deliveriesWeek>=7&&mealsWeek.length>=5:planned.length>=5&&shoppingReady},
  {id:'team',title:teamJoint?'Modo cooperativo':'Equipo y ahorro',icon:'🤝',progress:teamJoint?Number(!!jointWeek):Number(savingsWeek)+Number(reviewed),target:teamJoint?1:2,detail:teamJoint?'Limpieza conjunta de 20 min o tarea larga hecha juntos':`${savingsWeek?'✓':'○'} aporte real · ${reviewed?'✓':'○'} reunión de 10 min`,done:teamJoint?!!jointWeek:savingsWeek&&reviewed}
 ];
 for(const mission of missions)if(mission.done)db.prepare('INSERT OR IGNORE INTO coop_awards VALUES (?,?,?)').run(weekStart,mission.id,new Date().toISOString());
 const earnedAwards=new Set(db.prepare('SELECT mission FROM coop_awards WHERE week_start=?').all(weekStart).map(x=>x.mission));
 for(const mission of missions)mission.earned=earnedAwards.has(mission.id);
 const weeksHome=new Set(db.prepare("SELECT week_start FROM coop_awards WHERE mission='home' AND week_start>=?").all(addDays(weekStart,-35)).map(x=>x.week_start));
 const deliveryDates=new Set(delivery.map(x=>x.date));
 const lastSeven=Array.from({length:7},(_,i)=>addDays(today,-i));
 const noDeliverySeven=lastSeven.every(day=>deliveryDates.has(day))&&meals.filter(x=>lastSeven.includes(x.date)).length>=5;
 const occasional=db.prepare("SELECT 1 FROM task_completions c JOIN task_pools p ON p.template_id=c.template_id JOIN templates t ON t.id=c.template_id WHERE c.completed_at>? AND p.pool='occasional' AND t.minutes>=30 LIMIT 1").get(epoch);
 const jointWeeks=new Set(events.filter(x=>x.kind==='joint_clean'&&x.amount>=20).map(x=>monday(x.local_date)));
 const sharedSessions=db.prepare('SELECT c.local_date FROM coop_task_shares s JOIN task_completions c ON c.id=s.completion_id WHERE c.completed_at>?').all(epoch);
 for(const row of sharedSessions)jointWeeks.add(monday(row.local_date));
 const reviewWeeks=new Set(events.filter(x=>x.kind==='review').map(x=>monday(x.local_date)));
 const firstSaving=savings.length>0;
 const month=today.slice(0,7),monthlyGoal=db.prepare('SELECT * FROM coop_monthly_goals WHERE month=?').get(month)||null;
 const savingsEntries=db.prepare('SELECT amount_cents,created_at FROM savings_entries').all();
 const netForMonth=value=>savingsEntries.filter(x=>localDate(new Date(x.created_at)).startsWith(value)).reduce((n,x)=>n+x.amount_cents,0);
 const monthlyNet=netForMonth(month);
 for(const goal of db.prepare('SELECT month,target_cents FROM coop_monthly_goals WHERE month<?').all(month))if(netForMonth(goal.month)>=goal.target_cents)db.prepare('INSERT OR IGNORE INTO coop_monthly_awards VALUES (?,?,?)').run(goal.month,2,new Date().toISOString());
 const monthlyAward=db.prepare('SELECT 1 FROM coop_monthly_awards WHERE month=?').get(month);
 const fairVotes=db.prepare('SELECT week_start,person_id FROM coop_fair_votes').all();
 const peopleIds=db.prepare('SELECT id FROM people WHERE active=1').all().map(x=>x.id);
 const fairWeeks=new Set(fairVotes.map(x=>x.week_start).filter(start=>{
  if(!peopleIds.every(id=>fairVotes.some(v=>v.week_start===start&&v.person_id===id)))return false;
  const target=db.prepare('SELECT target_xp FROM coop_weeks WHERE week_start=?').get(start)?.target_xp||150;
  const weekEnd=addDays(start,6);
  const taskXP=tasks.filter(x=>within(x.local_date,start,weekEnd)).reduce((n,x)=>n+x.points,0);
  const shareXP=db.prepare('SELECT s.points,c.local_date,c.completed_at FROM coop_task_shares s JOIN task_completions c ON c.id=s.completion_id WHERE c.completed_at>?').all(epoch).filter(x=>within(x.local_date,start,weekEnd)).reduce((n,x)=>n+x.points,0);
  const jointXP=events.filter(x=>x.kind==='joint_clean'&&within(x.local_date,start,weekEnd)).reduce((n,x)=>n+x.points_actor+x.points_partner,0);
  return taskXP+shareXP+jointXP>=Math.ceil(target*.5);
 }));
 let saved=0,bestSaved=0;
 for(const row of db.prepare('SELECT amount_cents FROM savings_entries ORDER BY created_at,rowid').all()){saved+=row.amount_cents;bestSaved=Math.max(bestSaved,saved);}
 const returnBadge=tasks.some(x=>{
  const previousStart=addDays(monday(x.local_date),-7);
  return tasks.some(y=>y.local_date<previousStart)&&tasks.filter(y=>within(y.local_date,previousStart,addDays(previousStart,6))).length<3&&tasks.filter(y=>within(y.local_date,monday(x.local_date),addDays(monday(x.local_date),6))).length>=3;
 });
 const ratedRecipes=new Set(db.prepare('SELECT DISTINCT recipe_id FROM recipe_ratings').all().map(x=>x.recipe_id));
 const portraits=db.prepare('SELECT person_id,avatar_key FROM profile_avatars').all();
 const chosen=portraits.map(row=>profileAvatars.find(avatar=>avatar.key===row.avatar_key)).filter(Boolean);
 const twoProfiles=db.prepare('SELECT COUNT(*) AS n FROM people WHERE active=1').get().n===2;
 const taskPeopleByDay=new Map();
 for(const task of tasks){const people=taskPeopleByDay.get(task.local_date)||new Set();people.add(task.person_id);taskPeopleByDay.set(task.local_date,people);}
 const conditions={joint_first:sharedSessions.length>0||events.some(x=>x.kind==='joint_clean'&&x.amount>=15),home_control:earnedAwards.has('home'),bathrooms:['t6','t7'].every(id=>tasksWeek.some(x=>x.template_id===id)),boss:!!occasional,maintenance:weeksHome.size>=4,delivery_pause:noDeliverySeven,week_resolved:planned.length>=5&&shoppingReady,tuppers:events.some(x=>x.kind==='meal_prep'&&x.amount>=4),recipe_collection:new Set(meals.filter(x=>ratedRecipes.has(x.recipe_id)).map(x=>x.recipe_id)).size>=5,fridge:sum(events.filter(x=>x.kind==='fridge_rescue'),'amount')>=3,first_saving:firstSaving,goal_25:bestSaved>=25000,goal_50:bestSaved>=50000,goal_75:bestSaved>=75000,goal_100:bestSaved>=100000,smart_shopping:events.filter(x=>x.kind==='budget_shop').length>=4,team_mode:jointWeeks.size>=3,team_review:reviewWeeks.size>=3,fair_load:fairWeeks.size>=2,goal_protected:!!db.prepare('SELECT 1 FROM coop_monthly_awards LIMIT 1').get(),return:returnBadge,secret_double_cast:twoProfiles&&portraits.length===2,secret_same_film:twoProfiles&&chosen.length===2&&chosen[0].film===chosen[1].film&&portraits[0].avatar_key!==portraits[1].avatar_key,secret_tandem_day:[...taskPeopleByDay.values()].some(people=>people.size>=2),secret_kitchen_magic:meals.some(meal=>taskPeopleByDay.has(meal.date))};
 const now=new Date().toISOString();
 for(const [id,earned] of Object.entries(conditions))if(earned)db.prepare('INSERT OR IGNORE INTO coop_unlocks VALUES (?,?)').run(id,now);
 const unlocked=new Map(db.prepare('SELECT * FROM coop_unlocks').all().map(x=>[x.badge_id,x.earned_at]));
 const badges=badgeDefinitions.map(([id,title,icon,hint])=>({id,title:secretBadgeIds.has(id)&&!unlocked.has(id)?'???':title,icon,hint:secretBadgeIds.has(id)&&!unlocked.has(id)?'Una sorpresa aguarda en el castillo…':hint,secret:secretBadgeIds.has(id),earned:unlocked.has(id),earned_at:unlocked.get(id)||null}));
 const selectedId=db.prepare('SELECT badge_id FROM coop_profile WHERE id=1').get()?.badge_id;
 const selectedSticker=badges.find(x=>x.id===selectedId&&x.earned)||null;
 const awardCount=db.prepare('SELECT COUNT(*) AS n FROM coop_awards').get().n;
 const monthlyKeys=db.prepare('SELECT COALESCE(SUM(keys),0) AS n FROM coop_monthly_awards').get().n;
 const bonus=[...bonusKeys].filter(id=>unlocked.has(id)).length;
 const redeemed=db.prepare('SELECT COALESCE(SUM(keys_cost),0) AS n FROM coop_redemptions').get().n;
 const fund=fundBalance(db);
 const monthlyDeposits=db.prepare('SELECT amount_cents,created_at FROM savings_entries WHERE amount_cents>0').all().filter(x=>localDate(new Date(x.created_at)).slice(0,7)===today.slice(0,7));
 const monthlyTransfers=db.prepare('SELECT amount_cents,created_at FROM coop_fund WHERE amount_cents>0').all().filter(x=>localDate(new Date(x.created_at)).slice(0,7)===today.slice(0,7));
 return {level:1,weekStart,plan:{target_xp:week.target_xp,essentials,...modes},missions,badges,selectedSticker,keys:{earned:awardCount+bonus+monthlyKeys,spent:redeemed,balance:awardCount+bonus+monthlyKeys-redeemed},fair:{confirmed_by:fairVotes.filter(x=>x.week_start===weekStart).map(x=>x.person_id),weeks:fairWeeks.size},monthly:{month,target_cents:monthlyGoal?.target_cents||null,net_cents:monthlyNet,reached:!!monthlyGoal&&monthlyNet>=monthlyGoal.target_cents,earned:!!monthlyAward},fund:{balance_cents:fund,transfer_limit_cents:Math.max(0,Math.floor(sum(monthlyDeposits,'amount_cents')*.25)-sum(monthlyTransfers,'amount_cents'))},rewards:rewards.map(x=>({...x,unlocked:!x.requires||unlocked.has(x.requires)})),redemptions:db.prepare('SELECT * FROM coop_redemptions ORDER BY created_at DESC LIMIT 30').all(),events:events.slice(-30).reverse().map(x=>({...x,title:eventKinds[x.kind]?.title||x.kind}))};
}
