import {addDays,localDate,monday} from './dates.mjs';
import {aggregateShopping} from './meals.mjs';

export function savingsRewards(db,epoch){
 const entries=db.prepare('SELECT id,person_id,created_at FROM savings_entries WHERE amount_cents>0 AND created_at>? ORDER BY created_at,id').all(epoch);
 const weeks=new Set();
 return entries.flatMap(entry=>{
  const day=localDate(new Date(entry.created_at));
  const week=monday(day);
  if(weeks.has(week))return [];
  weeks.add(week);
  return [{id:`savings:${entry.id}`,person_id:entry.person_id,completed_at:entry.created_at,local_date:day,points:10,title:'Primer ahorro de la semana',zone:'Ahorro'}];
 });
}

function streaks(dates,today){
 const sorted=[...new Set(dates)].sort();
 let best=0,run=0,previous='';
 for(const day of sorted){run=previous&&addDays(previous,1)===day?run+1:1;best=Math.max(best,run);previous=day;}
 const active=new Set(sorted);
 let current=0,day=active.has(today)?today:addDays(today,-1);
 while(active.has(day)){current++;day=addDays(day,-1);}
 return {current,best};
}

export function gamificationState(db,{today,epoch,weekStart,weekPoints,rewards}){
 const taskRows=db.prepare('SELECT local_date,person_id FROM task_completions WHERE completed_at>?').all(epoch);
 const mealRows=db.prepare('SELECT date AS local_date,person_id FROM meal_completions WHERE completed_at>?').all(epoch);
 const deliveryRows=db.prepare('SELECT date AS local_date,person_id FROM no_delivery_days WHERE completed_at>?').all(epoch);
 const coopRows=db.prepare('SELECT kind,local_date,person_id FROM coop_events WHERE created_at>?').all(epoch);
 const savingsRows=db.prepare('SELECT amount_cents,created_at FROM savings_entries ORDER BY created_at,rowid').all();
 const recentSavings=savingsRows.filter(row=>row.amount_cents>0&&row.created_at>epoch);
 const activeDays=[...taskRows,...mealRows,...deliveryRows,...coopRows].map(row=>row.local_date).concat(recentSavings.map(row=>localDate(new Date(row.created_at))));
 const streak=streaks(activeDays,today);
 const planned=db.prepare('SELECT COUNT(*) AS n FROM meal_plan WHERE date=?').get(today).n;
 const cooked=db.prepare('SELECT COUNT(*) AS n FROM meal_completions WHERE date=?').get(today).n;
 const cleanedToday=db.prepare('SELECT 1 FROM task_completions WHERE local_date=? LIMIT 1').get(today)||coopRows.some(row=>row.local_date===today&&row.kind==='joint_clean');
 const noDeliveryToday=db.prepare('SELECT 1 FROM no_delivery_days WHERE date=?').get(today);
 const recipes=db.prepare('SELECT id,ingredients FROM recipes').all().map(row=>({id:row.id,ingredients:JSON.parse(row.ingredients)}));
 const plan=db.prepare('SELECT recipe_id FROM meal_plan WHERE date BETWEEN ? AND ?').all(weekStart,addDays(weekStart,6));
 const shopping=aggregateShopping(recipes,plan);
 const checks=new Map(db.prepare('SELECT item_key,quantity FROM shopping_checks WHERE week_start=?').all(weekStart).map(row=>[row.item_key,row.quantity]));
 const bought=shopping.filter(item=>(checks.get(item.key)||0)>=item.quantity).length;
 const savingsWeek=rewards.filter(row=>row.local_date>=weekStart&&row.local_date<=today);
 const savingsTotal=db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS total FROM savings_entries').get().total;
 const avoided=db.prepare('SELECT COALESCE(SUM(saved_cents),0) AS total FROM no_delivery_days').get().total;
 let running=0,bestSaved=0;
 for(const row of savingsRows){running+=row.amount_cents;bestSaved=Math.max(bestSaved,running);}
 const daily=[
  {id:'clean',title:'Un gesto de limpieza',hint:'Elegid y completad una tarea de la pool',done:!!cleanedToday,section:'pools'},
  {id:'meal',title:'Comida casera del plan',hint:planned?`${cooked} de ${planned} comidas de hoy cocinadas`:'Planificad una comida para hoy',done:cooked>0,section:'meals'},
  {id:'delivery',title:'Hoy sin pedido',hint:'Registrad el día al terminar',done:!!noDeliveryToday,section:'meals'},
  {id:'shopping',title:'Compra preparada',hint:shopping.length?`${bought} de ${shopping.length} productos en la cesta`:'Planificad recetas para crear la lista',done:shopping.length>0&&bought===shopping.length,section:'shopping'}
 ];
 const badges=[
  {id:'first_clean',title:'Primer gesto',hint:'Completar una tarea',earned:taskRows.length>0,icon:'🏡'},
  {id:'first_meal',title:'Chef de casa',hint:'Cocinar una comida del plan',earned:mealRows.length>0,icon:'🍳'},
  {id:'first_delivery',title:'Sin pedido',hint:'Registrar un día sin delivery',earned:deliveryRows.length>0,icon:'🌿'},
  {id:'first_saving',title:'Hucha en marcha',hint:'Registrar una aportación al ahorro',earned:recentSavings.length>0,icon:'🪙'},
  {id:'streak',title:'Tres días seguidos',hint:'Hacer un gesto durante 3 días',earned:streak.best>=3,icon:'🔥'},
  {id:'balanced',title:'Casa 360',hint:'Limpieza, comida, ahorro y sin pedido en un día',earned:taskRows.some(row=>mealRows.some(meal=>meal.local_date===row.local_date)&&deliveryRows.some(day=>day.local_date===row.local_date)&&recentSavings.some(entry=>localDate(new Date(entry.created_at))===row.local_date)),icon:'✨'},
  {id:'travel',title:'Viaje en marcha',hint:'Llegar al 60% de Viaje express',earned:bestSaved>=60000,icon:'✈️'}
 ];
 return {daily,streak,badges,shopping:{total:shopping.length,bought,pending:shopping.length-bought},meals:{planned,cooked},savings:{total_cents:savingsTotal,avoided_cents:avoided,weeklyReward:savingsWeek.length>0},week:{clean:taskRows.filter(row=>row.local_date>=weekStart&&row.local_date<=today).length+coopRows.filter(row=>row.kind==='joint_clean'&&row.local_date>=weekStart&&row.local_date<=today).length,meals:mealRows.filter(row=>row.local_date>=weekStart&&row.local_date<=today).length,noDelivery:deliveryRows.filter(row=>row.local_date>=weekStart&&row.local_date<=today).length,points:weekPoints}};
}
