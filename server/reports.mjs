import {addDays,localDate,monday,weekday} from './dates.mjs';

const sum=(rows,key)=>rows.reduce((total,row)=>total+row[key],0);

export function latestReportSunday(now=new Date()){
 const today=localDate(now);
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',hourCycle:'h23'}).format(now));
 const thisSunday=addDays(today,6-weekday(today));
 return weekday(today)===6&&hour>=19?today:addDays(thisSunday,-7);
}

export function reportState(db,now=new Date()){
 const sunday=latestReportSunday(now),weekStart=monday(sunday),nextWeek=addDays(sunday,1);
 const nextSunday=addDays(sunday,7),isMonthClose=nextSunday.slice(0,7)!==sunday.slice(0,7);
 const monthStart=sunday.slice(0,7)+'-01';
 const epoch=db.prepare('SELECT started_at FROM score_epoch WHERE id=1').get().started_at;
 const tasks=db.prepare('SELECT local_date,completed_at,points FROM task_completions WHERE local_date BETWEEN ? AND ? AND completed_at>?').all(weekStart,sunday,epoch);
 const shares=db.prepare('SELECT c.local_date,c.completed_at,s.points FROM coop_task_shares s JOIN task_completions c ON c.id=s.completion_id WHERE c.local_date BETWEEN ? AND ? AND c.completed_at>?').all(weekStart,sunday,epoch);
 const meals=db.prepare('SELECT date,completed_at,points FROM meal_completions WHERE date BETWEEN ? AND ? AND completed_at>?').all(weekStart,sunday,epoch);
 const delivery=db.prepare('SELECT date,completed_at,points FROM no_delivery_days WHERE date BETWEEN ? AND ? AND completed_at>?').all(weekStart,sunday,epoch);
 const finance=db.prepare('SELECT kind,amount_cents,occurred_on FROM finance_entries WHERE occurred_on BETWEEN ? AND ?').all(monthStart,sunday);
 const savings=db.prepare('SELECT amount_cents,created_at FROM savings_entries').all().filter(row=>{const date=localDate(new Date(row.created_at));return date>=monthStart&&date<=sunday;});
 const fund=db.prepare('SELECT amount_cents,created_at FROM coop_fund').all().filter(row=>{const date=localDate(new Date(row.created_at));return date>=monthStart&&date<=sunday;});
 const nextPlan=db.prepare('SELECT week_start FROM coop_weeks WHERE week_start=?').get(nextWeek);
 const nextMeals=db.prepare('SELECT COUNT(*) AS count FROM meal_plan WHERE date BETWEEN ? AND ?').get(nextWeek,addDays(nextWeek,6)).count;
 const monthTasks=db.prepare('SELECT COUNT(*) AS count FROM task_completions WHERE local_date BETWEEN ? AND ? AND completed_at>?').get(monthStart,sunday,epoch).count;
 const monthMeals=db.prepare('SELECT COUNT(*) AS count FROM meal_completions WHERE date BETWEEN ? AND ? AND completed_at>?').get(monthStart,sunday,epoch).count;
 return {
  sunday,weekStart,nextWeek,isMonthClose,
  week:{tasks:tasks.length,taskXP:sum(tasks,'points')+sum(shares,'points'),meals:meals.length,noDelivery:delivery.length,points:sum(tasks,'points')+sum(shares,'points')+sum(meals,'points')+sum(delivery,'points'),missions:db.prepare('SELECT COUNT(*) AS count FROM coop_awards WHERE week_start=?').get(weekStart).count},
  month:{tasks:monthTasks,meals:monthMeals,income_cents:sum(finance.filter(row=>row.kind==='income'),'amount_cents'),expense_cents:sum(finance.filter(row=>row.kind==='expense'),'amount_cents'),savings_cents:sum(savings,'amount_cents')+sum(fund,'amount_cents')},
  next:{effortPlanned:!!nextPlan,mealsPlanned:nextMeals}
 };
}
