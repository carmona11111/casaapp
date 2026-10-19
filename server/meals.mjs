import {randomUUID} from 'node:crypto';
import {addDays,localDate,monday,validDate} from './dates.mjs';
import {fail} from './store.mjs';

export function checkWeek(week){
 if(!validDate(week)||week<'2000-01-01'||week>'2100-01-01'||monday(week)!==week)fail(400,'Selecciona un lunes válido.');
 return week;
}

const normalizedName=name=>name.trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-ES');
const quantity=value=>Math.round((value+Number.EPSILON)*1000)/1000;
const baseIngredient=ingredient=>{
 const factor=ingredient.unit==='kg'||ingredient.unit==='l'?1000:1;
 const unit=ingredient.unit==='kg'?'g':ingredient.unit==='l'?'ml':ingredient.unit;
 return {name:ingredient.name.trim().replace(/\s+/g,' '),quantity:quantity(ingredient.quantity*factor),unit};
};

export function aggregateShopping(recipes,plan){
 const byId=new Map(recipes.map(recipe=>[recipe.id,recipe]));
 const items=new Map();
 for(const meal of plan){
  const recipe=byId.get(meal.recipe_id);
  if(!recipe)continue;
  for(const raw of recipe.ingredients){
   const ingredient=baseIngredient(raw);
   const key=JSON.stringify([normalizedName(ingredient.name),ingredient.unit]);
   const prior=items.get(key);
   if(prior)prior.quantity=quantity(prior.quantity+ingredient.quantity);
   else items.set(key,{key,...ingredient});
  }
 }
 return [...items.values()].sort((a,b)=>a.name.localeCompare(b.name,'es-ES'));
}

export function mealsState(db,week=monday(localDate())){
 checkWeek(week);
 const end=addDays(week,6);
 const recipes=db.prepare('SELECT * FROM recipes ORDER BY created_at DESC,rowid DESC').all().map(row=>({...row,ingredients:JSON.parse(row.ingredients)}));
 const plan=db.prepare('SELECT date,slot,recipe_id FROM meal_plan WHERE date BETWEEN ? AND ? ORDER BY date,slot').all(week,end);
 const checks=new Map(db.prepare('SELECT item_key,quantity FROM shopping_checks WHERE week_start=?').all(week).map(row=>[row.item_key,row.quantity]));
 const shopping=aggregateShopping(recipes,plan).map(item=>({...item,checked:(checks.get(item.key)||0)>=item.quantity}));
 const completed=db.prepare('SELECT date,slot,recipe_id,person_id,completed_at,points FROM meal_completions WHERE date BETWEEN ? AND ? ORDER BY date,slot').all(week,end);
 const noDelivery=db.prepare('SELECT date,person_id,saved_cents,completed_at,points FROM no_delivery_days WHERE date BETWEEN ? AND ? ORDER BY date').all(week,end);
 const ratings=db.prepare('SELECT recipe_id,person_id,rating,rated_at FROM recipe_ratings').all();
 const cookedRecipeIds=db.prepare('SELECT DISTINCT recipe_id FROM meal_completions').all().map(row=>row.recipe_id);
 return {today:localDate(),weekStart:week,recipes,plan,shopping,completed,noDelivery,ratings,cookedRecipeIds};
}

export function rateRecipe(db,{actor,recipe_id,rating}){
 if(!db.prepare('SELECT 1 FROM recipes WHERE id=?').get(recipe_id))fail(404,'Receta no encontrada.');
 if(!db.prepare('SELECT 1 FROM meal_completions WHERE recipe_id=?').get(recipe_id))fail(409,'Cocinad la receta antes de valorarla.');
 db.prepare('INSERT INTO recipe_ratings VALUES (?,?,?,?) ON CONFLICT(recipe_id,person_id) DO UPDATE SET rating=excluded.rating,rated_at=excluded.rated_at').run(recipe_id,actor,rating,new Date().toISOString());
 return {ok:true};
}

export function saveRecipe(db,recipe){
 const existing=recipe.id&&db.prepare('SELECT id FROM recipes WHERE id=?').get(recipe.id);
 if(recipe.id&&!existing)fail(404,'La receta ya no existe.');
 const ingredients=JSON.stringify(recipe.ingredients);
 if(existing)db.prepare('UPDATE recipes SET name=?,photo=?,ingredients=? WHERE id=?').run(recipe.name,recipe.photo,ingredients,recipe.id);
 else{
  if(db.prepare('SELECT COUNT(*) AS count FROM recipes').get().count>=100)fail(400,'El recetario admite hasta 100 recetas.');
  db.prepare('INSERT INTO recipes VALUES (?,?,?,?,?)').run(randomUUID(),recipe.name,recipe.photo,ingredients,new Date().toISOString());
 }
 return {ok:true};
}

export function deleteRecipe(db,id){
 if(!db.prepare('SELECT id FROM recipes WHERE id=?').get(id))fail(404,'La receta ya no existe.');
 if(db.prepare('SELECT 1 FROM meal_plan WHERE recipe_id=? LIMIT 1').get(id))fail(409,'Quita esta receta del plan antes de borrarla.');
 if(db.prepare('SELECT 1 FROM meal_completions WHERE recipe_id=? LIMIT 1').get(id))fail(409,'Esta receta ya forma parte del historial de comidas.');
 db.prepare('DELETE FROM recipes WHERE id=?').run(id);
 return {ok:true};
}

export function setMeal(db,{date,slot,recipe_id}){
 if(!validDate(date)||date<'2000-01-01'||date>'2100-01-01')fail(400,'Fecha no válida.');
 if(!['lunch','dinner'].includes(slot))fail(400,'Elige comida o cena.');
 if(db.prepare('SELECT 1 FROM meal_completions WHERE date=? AND slot=?').get(date,slot))fail(409,'Esta comida ya se marcó como cocinada. Deshazla antes de cambiar el plan.');
 if(recipe_id){
  if(!db.prepare('SELECT id FROM recipes WHERE id=?').get(recipe_id))fail(404,'La receta ya no existe.');
  db.prepare('INSERT INTO meal_plan VALUES (?,?,?) ON CONFLICT(date,slot) DO UPDATE SET recipe_id=excluded.recipe_id').run(date,slot,recipe_id);
 }else db.prepare('DELETE FROM meal_plan WHERE date=? AND slot=?').run(date,slot);
 return {ok:true};
}

export function setMealCompletion(db,{date,slot,actor,completed}){
 if(!validDate(date)||date<'2000-01-01'||date>localDate())fail(400,'Solo puedes registrar comidas de hoy o anteriores.');
 const meal=db.prepare('SELECT recipe_id FROM meal_plan WHERE date=? AND slot=?').get(date,slot);
 const existing=db.prepare('SELECT person_id FROM meal_completions WHERE date=? AND slot=?').get(date,slot);
 if(completed){
  if(!meal)fail(409,'Planifica una receta antes de marcarla como cocinada.');
  if(existing)fail(409,'Esta comida ya está registrada.');
  db.prepare('INSERT INTO meal_completions VALUES (?,?,?,?,?,?)').run(date,slot,meal.recipe_id,actor,new Date().toISOString(),20);
 }else{
  if(!existing)fail(409,'Esta comida ya no está registrada.');
  if(existing.person_id!==actor)fail(409,'Solo quien cocinó puede deshacer esta acción.');
  db.prepare('DELETE FROM meal_completions WHERE date=? AND slot=?').run(date,slot);
  if(meal&&!db.prepare('SELECT 1 FROM meal_completions WHERE recipe_id=?').get(meal.recipe_id))db.prepare('DELETE FROM recipe_ratings WHERE recipe_id=?').run(meal.recipe_id);
 }
 return {ok:true};
}

export function setNoDelivery(db,{date,actor,done,saved_cents}){
 if(!validDate(date)||date<'2000-01-01'||date>localDate())fail(400,'Solo puedes registrar días de hoy o anteriores.');
 const existing=db.prepare('SELECT person_id FROM no_delivery_days WHERE date=?').get(date);
 if(done){
  if(existing)fail(409,'Este día ya se registró sin pedido.');
  db.prepare('INSERT INTO no_delivery_days VALUES (?,?,?,?,?)').run(date,actor,saved_cents,new Date().toISOString(),5);
 }else{
  if(!existing)fail(409,'Este día ya no está registrado.');
  if(existing.person_id!==actor)fail(409,'Solo quien registró el día puede deshacerlo.');
  db.prepare('DELETE FROM no_delivery_days WHERE date=?').run(date);
 }
 return {ok:true};
}

export function setShoppingCheck(db,{week_start,key,checked}){
 checkWeek(week_start);
 const item=aggregateShopping(
  db.prepare('SELECT * FROM recipes').all().map(row=>({...row,ingredients:JSON.parse(row.ingredients)})),
  db.prepare('SELECT date,slot,recipe_id FROM meal_plan WHERE date BETWEEN ? AND ?').all(week_start,addDays(week_start,6))
 ).find(item=>item.key===key);
 if(!item)fail(409,'La lista ha cambiado. Actualízala antes de marcar este ingrediente.');
 if(checked)db.prepare('INSERT INTO shopping_checks VALUES (?,?,?) ON CONFLICT(week_start,item_key) DO UPDATE SET quantity=excluded.quantity').run(week_start,key,item.quantity);
 else db.prepare('DELETE FROM shopping_checks WHERE week_start=? AND item_key=?').run(week_start,key);
 return {ok:true};
}
