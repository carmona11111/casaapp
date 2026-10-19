import {CharacterBanner} from './fairytale';
import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,CalendarDays,Check,ChevronLeft,ChevronRight,ImagePlus,Pencil,Plus,Search,ShoppingBasket,Trash2,UtensilsCrossed,X} from 'lucide-react';
import {api,dateText,monday,plusDays,todayLocal} from './types';

type Unit='g'|'kg'|'ml'|'l'|'ud'|'cda'|'cdta'|'paquete';
type Ingredient={name:string;quantity:number;unit:Unit};
type Recipe={id:string;name:string;photo:string|null;ingredients:Ingredient[];created_at:string};
type PlanRow={date:string;slot:'lunch'|'dinner';recipe_id:string};
type ShoppingItem={key:string;name:string;quantity:number;unit:Unit;checked:boolean};
type MealDone={date:string;slot:'lunch'|'dinner';recipe_id:string;person_id:string;points:number};
type NoDelivery={date:string;person_id:string;saved_cents:number;points:number};
type Rating={recipe_id:string;person_id:string;rating:number};
type MealsState={today:string;weekStart:string;recipes:Recipe[];plan:PlanRow[];shopping:ShoppingItem[];completed:MealDone[];noDelivery:NoDelivery[];ratings:Rating[];cookedRecipeIds:string[]};
type Draft={name:string;photo:string|null;ingredients:Ingredient[]};
type Write=(path:string,payload:object,success:string)=>Promise<boolean>;
const units:{value:Unit;label:string}[]=[{value:'ud',label:'ud'},{value:'g',label:'g'},{value:'kg',label:'kg'},{value:'ml',label:'ml'},{value:'l',label:'l'},{value:'cda',label:'cda'},{value:'cdta',label:'cdta'},{value:'paquete',label:'paquete'}];
const days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const newDraft=():Draft=>({name:'',photo:null,ingredients:[{name:'',quantity:1,unit:'ud'}]});
const formatQuantity=(value:number,unit:Unit)=>{
 let amount=value,label:string=unit;
 if(unit==='g'&&value>=1000){amount=value/1000;label='kg';}
 if(unit==='ml'&&value>=1000){amount=value/1000;label='l';}
 return `${new Intl.NumberFormat('es-ES',{maximumFractionDigits:3}).format(amount)} ${label}`;
};

async function photoData(file:File):Promise<string>{
 if(!file.type.startsWith('image/'))throw new Error('Elige una imagen válida.');
 if(file.size>10000000)throw new Error('La foto original debe ocupar menos de 10 MB.');
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('No se pudo leer esta imagen. Prueba con JPG o PNG.'));img.src=url;});
  const canvas=document.createElement('canvas');const context=canvas.getContext('2d');
  if(!context)throw new Error('Tu navegador no puede preparar la foto.');
  let maxSide=1200;
  for(let size=0;size<5;size++){
   const scale=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight));
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.82,.7,.58,.46]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=430000)return data;}
   maxSide=Math.round(maxSide*.75);
  }
  throw new Error('La foto es demasiado grande. Prueba con otra imagen.');
 }finally{URL.revokeObjectURL(url);}
}

export function Meals({actor,disabled,write,initialSection='plan'}:{actor:string;disabled:boolean;write:Write;initialSection?:'plan'|'shopping'}){
 const [week,setWeek]=useState(()=>monday(todayLocal()));
 const [data,setData]=useState<MealsState|null>(null);
 const [section,setSection]=useState<'plan'|'recipes'|'shopping'>(initialSection);
 useEffect(()=>setSection(initialSection),[initialSection]);
 const [error,setError]=useState(''),[saving,setSaving]=useState(false),[photoBusy,setPhotoBusy]=useState(false);
 const [editorId,setEditorId]=useState<string|null>(null),[draft,setDraft]=useState<Draft|null>(null),[deleteId,setDeleteId]=useState<string|null>(null);
 const [avoided,setAvoided]=useState('');
 const [shoppingView,setShoppingView]=useState<'pending'|'all'>('pending');
 const [shoppingQuery,setShoppingQuery]=useState('');
 const editorRef=useRef<HTMLFormElement>(null);
 const currentWeekRef=useRef(week);currentWeekRef.current=week;
 async function load(currentWeek=week){
  try{const next:MealsState=await api(`/api/meals?week=${currentWeek}`);if(currentWeek!==currentWeekRef.current)return;setData(next);setError('');try{localStorage.setItem(`casa-meals-${currentWeek}`,JSON.stringify(next));}catch{}}
  catch(e:any){if(currentWeek!==currentWeekRef.current)return;setError(e.message);try{setData(JSON.parse(localStorage.getItem(`casa-meals-${currentWeek}`)||'null'));}catch{setData(null);}}
 }
 useEffect(()=>{setData(null);void load(week);const refresh=()=>{if(document.visibilityState==='visible')void load(week);};const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);};},[week]);
 async function save(path:string,payload:object,success:string){if(saving||disabled)return false;setSaving(true);setError('');try{const ok=await write(path,{...payload,actor},success);if(ok)await load();return ok;}finally{setSaving(false);}}
 function openEditor(recipe?:Recipe){setSection('recipes');setDeleteId(null);setEditorId(recipe?.id||'new');setDraft(recipe?{name:recipe.name,photo:recipe.photo,ingredients:recipe.ingredients.map(i=>({...i}))}:newDraft());requestAnimationFrame(()=>editorRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));}
 function updateIngredient(index:number,field:keyof Ingredient,value:string|number){setDraft(current=>current&&({...current,ingredients:current.ingredients.map((item,i)=>i===index?{...item,[field]:value}:item)}));}
 async function submitRecipe(e:React.FormEvent){e.preventDefault();if(!draft)return;const ok=await save('/api/meals/recipe',{id:editorId==='new'?undefined:editorId,name:draft.name.trim(),photo:draft.photo,ingredients:draft.ingredients.map(i=>({...i,name:i.name.trim(),quantity:Number(i.quantity)}))},'Receta guardada');if(ok){setEditorId(null);setDraft(null);}}
 async function removeRecipe(id:string){const ok=await save('/api/meals/recipe/delete',{id},'Receta borrada');if(ok)setDeleteId(null);}
 async function assign(date:string,slot:'lunch'|'dinner',recipe_id:string){await save('/api/meals/plan',{date,slot,recipe_id:recipe_id||null},'Plan de comidas actualizado');}
 async function checkItem(item:ShoppingItem){await save('/api/meals/check',{week_start:week,key:item.key,checked:!item.checked},'Lista de compra actualizada');}
 async function markCooked(date:string,slot:'lunch'|'dinner',completed:boolean){await save('/api/meals/complete',{date,slot,completed},completed?'+20 XP · comida cocinada según el plan':'Comida desmarcada');}
 async function markNoDelivery(done:boolean){const cents=Math.round(Number(avoided||0)*100);if(!Number.isFinite(cents)||cents<0||cents>100000){setError('Indica entre 0 y 1000 € de gasto evitado.');return;}const ok=await save('/api/meals/no-delivery',{date:todayLocal(),done,saved_cents:done?cents:0},done?'+5 XP · día sin pedido':'Día desmarcado');if(ok)setAvoided('');}
 async function rate(recipe_id:string,rating:number){await save('/api/meals/rate',{recipe_id,rating},'Valoración guardada');}
 const visibleData=data?.weekStart===week?data:null;
 const weekEnd=plusDays(week,6),recipes=visibleData?.recipes||[],plan=visibleData?.plan||[],shopping=visibleData?.shopping||[];
 const planned=plan.length,checked=shopping.filter(i=>i.checked).length,completed=visibleData?.completed||[],noDelivery=visibleData?.noDelivery||[];
 const completedBySlot=new Map(completed.map(row=>[`${row.date}|${row.slot}`,row]));
 const noDeliveryToday=noDelivery.find(row=>row.date===todayLocal());
 const recipeById=new Map(recipes.map(recipe=>[recipe.id,recipe]));
 const myRatings=new Map((visibleData?.ratings||[]).filter(r=>r.person_id===actor).map(r=>[r.recipe_id,r.rating]));
 const cookedRecipeIds=new Set(visibleData?.cookedRecipeIds||[]);
 const planBySlot=new Map(plan.map(meal=>[`${meal.date}|${meal.slot}`,meal.recipe_id]));
 const matching=shopping.filter(item=>item.name.toLocaleLowerCase('es-ES').includes(shoppingQuery.trim().toLocaleLowerCase('es-ES')));
 const shownShopping=matching.filter(item=>shoppingView==='all'||!item.checked).sort((a,b)=>Number(a.checked)-Number(b.checked)||a.name.localeCompare(b.name,'es-ES'));
 const cannotWrite=disabled||saving||photoBusy;
 return <div className="meals-page"><CharacterBanner guide="ratatouille" eyebrow="RATATOUILLE EN LA COCINA" title="Una semana para saborear" description="Cread recetas, elegid el menú y preparad la compra como un equipo."/><div className="page-heading meals-heading"><div><span className="eyebrow">UNA SEMANA MÁS FÁCIL</span><h1>El libro de recetas</h1><p>Recetas, calendario y lista de compra en un solo lugar.</p></div><button className="primary" disabled={cannotWrite||!visibleData} onClick={()=>openEditor()}><Plus size={17}/> Nueva receta</button></div>
  {error&&<div className="notice error" role="alert"><span>{error}</span><button onClick={()=>setError('')}>Cerrar</button></div>}
  <div className="meals-overview"><div className="meals-overview-icon"><UtensilsCrossed size={27}/></div><div><span className="eyebrow">PLAN COMPARTIDO</span><h2>De la idea a la mesa</h2><p>Planificad, cocinad y marcad cada comida cumplida. Cada comida del calendario que cocinéis suma 10 XP por cocinar y 10 por cumplir el plan.</p></div><div className="meals-overview-stats"><strong>{completed.length}<small>/{planned}</small></strong><span>comidas del plan<br/>cocinadas</span></div></div>
  {visibleData&&week===monday(todayLocal())&&<section className="no-delivery-card"><div><span className="eyebrow">PEQUEÑO HÁBITO, GRAN VIAJE</span><h2>Hoy, sin pedido a domicilio</h2><p>Marcádlo una vez por día entre los dos. Suma 5 XP. El gasto evitado es orientativo y se muestra separado del dinero realmente ahorrado.</p></div>{noDeliveryToday?<div className="no-delivery-action"><strong><Check size={18}/> Registrado · +5 XP</strong>{noDeliveryToday.person_id===actor&&<button className="text-button" disabled={cannotWrite} onClick={()=>void markNoDelivery(false)}>Deshacer</button>}</div>:<div className="no-delivery-action"><label>Gasto evitado estimado (€)<input type="number" min="0" max="1000" step="0.01" placeholder="Opcional" value={avoided} onChange={e=>setAvoided(e.target.value)}/></label><button className="primary" disabled={cannotWrite} onClick={()=>void markNoDelivery(true)}><Check size={16}/> Hoy no pedimos</button></div>}</section>}
  <div className="meals-nav" aria-label="Secciones de comidas"><button className={section==='plan'?'selected':''} aria-pressed={section==='plan'} onClick={()=>setSection('plan')}><CalendarDays size={18}/> Plan semanal</button><button className={section==='recipes'?'selected':''} aria-pressed={section==='recipes'} onClick={()=>setSection('recipes')}><BookOpen size={18}/> Mis recetas <span>{recipes.length}</span></button><button className={section==='shopping'?'selected':''} aria-pressed={section==='shopping'} onClick={()=>setSection('shopping')}><ShoppingBasket size={18}/> Compra <span>{shopping.length}</span></button></div>
  {!visibleData&&<div className="meals-empty"><BookOpen size={29}/><h3>{error?'No se pudo cargar esta semana':'Preparando las comidas…'}</h3><p>{error?'Comprueba la conexión y vuelve a intentarlo.':'Estamos buscando vuestro plan y vuestra lista de compra.'}</p>{error&&<button className="secondary" onClick={()=>void load()}>Reintentar</button>}</div>}
  {visibleData&&section==='plan'&&<>
<div className="meals-section-heading">
<div>
<h2>Esta semana en la mesa</h2>
<p>{dateText(week,{day:'numeric',month:'long'})} — {dateText(weekEnd,{day:'numeric',month:'long',year:'numeric'})}</p>
</div>
<div className="meals-week-controls">
<button aria-label="Semana anterior" onClick={()=>setWeek(plusDays(week,-7))}>
<ChevronLeft size={19}/>
</button>
<button onClick={()=>setWeek(monday(todayLocal()))}>Esta semana</button>
<button aria-label="Semana siguiente" onClick={()=>setWeek(plusDays(week,7))}>
<ChevronRight size={19}/>
</button>
</div>
</div>{recipes.length===0?<div className="meals-empty">
<BookOpen size={31}/>
<h3>Tu recetario empieza aquí</h3>
<p>Crea la primera receta con su foto e ingredientes. Después podrás ponerla en cualquier comida o cena de la semana.</p>
<button className="primary" disabled={cannotWrite} onClick={()=>openEditor()}>
<Plus size={16}/> Crear primera receta</button>
</div>:<div className="meals-week-grid">{days.map((day,index)=>{const date=plusDays(week,index);return <section className={'meals-day '+(date===visibleData?.today?'today':'')} key={date}>
<header>
<span>{day}</span>
<strong>{dateText(date,{day:'numeric',month:'short'})}</strong>
</header>{(['lunch','dinner'] as const).map(slot=>{const id=planBySlot.get(`${date}|${slot}`)||'',recipe=recipeById.get(id);return <div className="meals-slot" key={slot}>
  <span className="meals-slot-label">{slot==='lunch'?'Comida':'Cena'}</span>
  {recipe&&<div className="meals-recipe-preview">
    <div className="meals-recipe-photo">{recipe.photo?<img src={recipe.photo} alt="" loading="lazy"/>:<BookOpen size={25} aria-hidden="true"/>}</div>
    <div className="meals-recipe-details"><strong>{recipe.name}</strong><small>{recipe.ingredients.length} {recipe.ingredients.length===1?'ingrediente':'ingredientes'}</small></div>
  </div>}
  <select aria-label={`${slot==='lunch'?'Comida':'Cena'} del ${day} ${dateText(date)}`} value={id} disabled={cannotWrite||!!completedBySlot.get(`${date}|${slot}`)||!visibleData} onChange={e=>void assign(date,slot,e.target.value)}>
<option value="">Elegir receta</option>{recipes.map(r=>
  <option value={r.id} key={r.id}>{r.name}</option>)}</select>{recipe&&date<=todayLocal()&&(completedBySlot.get(`${date}|${slot}`)?<div className="meal-done"><span><Check size={15}/> Cocinada · +10 cocinar +10 plan</span>{completedBySlot.get(`${date}|${slot}`)?.person_id===actor&&<button disabled={cannotWrite} onClick={()=>void markCooked(date,slot,false)}>Deshacer</button>}</div>:<button className="meal-complete-button" disabled={cannotWrite} onClick={()=>void markCooked(date,slot,true)}><Check size={15}/> Ya la cociné · +20 XP</button>)}
</div>;})}</section>;})}</div>}<div className="meals-plan-tip">
<ShoppingBasket size={18}/>
<span>Compra reúne los ingredientes de todas las recetas elegidas esta semana y suma las cantidades repetidas.</span>
<button onClick={()=>setSection('shopping')}>Ver compra</button>
</div>
</>}
  {visibleData&&section==='recipes'&&<>
<div className="meals-section-heading">
<div>
<h2>Vuestro recetario</h2>
<p>{recipes.length===0?'Aún no hay recetas guardadas.':`${recipes.length} ${recipes.length===1?'receta guardada':'recetas guardadas'}`}</p>
</div>
<button className="secondary" disabled={cannotWrite} onClick={()=>openEditor()}>
<Plus size={16}/> Añadir receta</button>
</div>{editorId&&draft&&<form className="recipe-editor" ref={editorRef} onSubmit={e=>void submitRecipe(e)}>
<div className="recipe-editor-heading">
<div>
<span className="eyebrow">{editorId==='new'?'UNA RECETA VUESTRA':'ACTUALIZAR RECETA'}</span>
<h3>{editorId==='new'?'Nueva receta':'Editar receta'}</h3>
</div>
<button type="button" aria-label="Cerrar editor" onClick={()=>{setEditorId(null);setDraft(null);}}>
<X size={19}/>
</button>
</div>
<div className="recipe-editor-grid">
<div>
<label>Nombre de la receta<input required maxLength={120} placeholder="Ej. Lentejas de casa" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/>
</label>
<label className="recipe-photo-upload">
<span>Foto de la receta</span>
<div className="recipe-photo-box">{draft.photo?<img src={draft.photo} alt="Vista previa de la receta"/>:<>
<ImagePlus size={30}/>
<strong>Añadir foto</strong>
<small>JPG, PNG o foto del móvil</small>
</>}<input type="file" accept="image/*" aria-label="Elegir foto de la receta" disabled={cannotWrite} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setPhotoBusy(true);try{const photo=await photoData(file);setDraft(current=>current&&({...current,photo}));setError('');}catch(err:any){setError(err.message);}finally{setPhotoBusy(false);}}}/>
</div>
</label>{draft.photo&&<button type="button" className="text-button" onClick={()=>setDraft({...draft,photo:null})}>Quitar foto</button>}{photoBusy&&<p className="fine">Preparando foto…</p>}</div>
<div className="recipe-ingredients">
<div className="recipe-ingredients-title">
<h4>Ingredientes</h4>
<span>Indica la cantidad para una vez que cocinéis esta receta.</span>
</div>{draft.ingredients.map((ingredient,index)=>
<div className="ingredient-editor-row" key={index}>
<label>Ingrediente<input required maxLength={100} placeholder="Ej. Tomate" value={ingredient.name} onChange={e=>updateIngredient(index,'name',e.target.value)}/>
</label>
<label>Cantidad<input required type="number" min="0.001" max="100000" step="any" value={ingredient.quantity} onChange={e=>updateIngredient(index,'quantity',Number(e.target.value))}/>
</label>
<label>Unidad<select value={ingredient.unit} onChange={e=>updateIngredient(index,'unit',e.target.value)}>{units.map(unit=>
<option value={unit.value} key={unit.value}>{unit.label}</option>)}</select>
</label>
<button type="button" aria-label={`Quitar ingrediente ${index+1}`} disabled={draft.ingredients.length===1} onClick={()=>setDraft({...draft,ingredients:draft.ingredients.filter((_,i)=>i!==index)})}>
<Trash2 size={17}/>
</button>
</div>)}<button type="button" className="text-button" disabled={draft.ingredients.length>=40} onClick={()=>setDraft({...draft,ingredients:[...draft.ingredients,{name:'',quantity:1,unit:'ud'}]})}>
<Plus size={16}/> Añadir ingrediente</button>
</div>
</div>
<div className="recipe-editor-actions">
<button className="secondary" type="button" onClick={()=>{setEditorId(null);setDraft(null);}}>Cancelar</button>
<button className="primary" disabled={cannotWrite}>{editorId==='new'?'Guardar receta':'Guardar cambios'}</button>
</div>
</form>}{recipes.length===0&&!editorId?<div className="meals-empty">
<BookOpen size={31}/>
<h3>Sin recetas por defecto</h3>
<p>Este espacio es vuestro. Cread platos con nombre, foto e ingredientes para empezar a planificar.</p>
<button className="primary" disabled={cannotWrite} onClick={()=>openEditor()}>
<Plus size={16}/> Crear receta</button>
</div>:<div className="recipe-grid">{recipes.map(recipe=>
<article className="recipe-card" key={recipe.id}>
<div className="recipe-card-image">{recipe.photo?<img src={recipe.photo} alt={recipe.name}/>:<UtensilsCrossed size={36}/>}</div>
<div className="recipe-card-body">
<span>{recipe.ingredients.length} {recipe.ingredients.length===1?'ingrediente':'ingredientes'}</span>
<h3>{recipe.name}</h3>
<p>{recipe.ingredients.slice(0,4).map(i=>i.name).join(' · ')}{recipe.ingredients.length>4?'…':''}</p>
<div className="recipe-rating"><span>{(()=>{const rows=(visibleData.ratings||[]).filter(r=>r.recipe_id===recipe.id);return rows.length?`★ ${(rows.reduce((sum,r)=>sum+r.rating,0)/rows.length).toFixed(1)} · ${rows.length} ${rows.length===1?'valoración':'valoraciones'}`:'Sin valorar';})()}</span><label>Tu valoración<select aria-label={`Valorar ${recipe.name}`} value={myRatings.get(recipe.id)||0} disabled={cannotWrite||!cookedRecipeIds.has(recipe.id)} onChange={e=>void rate(recipe.id,Number(e.target.value))}><option value={0}>Elegir estrellas</option>{[1,2,3,4,5].map(n=><option value={n} key={n}>{n} {n===1?'estrella':'estrellas'}</option>)}</select></label>{!cookedRecipeIds.has(recipe.id)&&<small>Cocinadla para valorarla.</small>}</div>
<div className="recipe-card-actions">
<button className="secondary" disabled={cannotWrite} onClick={()=>openEditor(recipe)}>
<Pencil size={15}/> Editar</button>{deleteId===recipe.id?<>
<button className="danger-text" disabled={cannotWrite} onClick={()=>void removeRecipe(recipe.id)}>Confirmar borrado</button>
<button className="text-button" onClick={()=>setDeleteId(null)}>Cancelar</button>
</>:<button className="icon-button" aria-label={`Borrar ${recipe.name}`} disabled={cannotWrite} onClick={()=>setDeleteId(recipe.id)}>
<Trash2 size={17}/>
</button>}</div>
</div>
</article>)}</div>}</>}
  {visibleData&&section==='shopping'&&<>
<div className="meals-section-heading">
<div>
<h2>Compra de la semana</h2>
<p>{dateText(week,{day:'numeric',month:'long'})} — {dateText(weekEnd,{day:'numeric',month:'long',year:'numeric'})}</p>
</div>
<div className="meals-week-controls">
<button aria-label="Semana anterior" onClick={()=>setWeek(plusDays(week,-7))}>
<ChevronLeft size={19}/>
</button>
<button onClick={()=>setWeek(monday(todayLocal()))}>Esta semana</button>
<button aria-label="Semana siguiente" onClick={()=>setWeek(plusDays(week,7))}>
<ChevronRight size={19}/>
</button>
</div>
</div>{shopping.length===0?<div className="meals-empty">
<ShoppingBasket size={31}/>
<h3>La lista aparece al planificar</h3>
<p>Elige recetas en las comidas y cenas de esta semana. Aquí aparecerán todos sus ingredientes, sin duplicados.</p>
<button className="secondary" onClick={()=>setSection('plan')}>Ir al plan semanal</button>
</div>:<>
<div className="shopping-progress">
<div>
<span className="eyebrow">LISTA COMPARTIDA</span>
<h3>{checked===shopping.length?'¡Compra lista!':`${shopping.length-checked} ${shopping.length-checked===1?'producto pendiente':'productos pendientes'}`}</h3>
<p>{checked} de {shopping.length} marcados · Las cantidades iguales se suman automáticamente.</p>
</div>
<strong>{Math.round(checked/shopping.length*100)}%</strong>
<div className="shopping-progress-track">
<span style={{width:`${Math.round(checked/shopping.length*100)}%`}}/>
</div>
</div>
<div className="shopping-toolbar"><div className="shopping-view" aria-label="Filtrar productos"><button className={shoppingView==='pending'?'selected':''} aria-pressed={shoppingView==='pending'} onClick={()=>setShoppingView('pending')}>Pendientes <span>{shopping.length-checked}</span></button><button className={shoppingView==='all'?'selected':''} aria-pressed={shoppingView==='all'} onClick={()=>setShoppingView('all')}>Todos <span>{shopping.length}</span></button></div><label className="shopping-search"><Search size={17}/><input type="search" aria-label="Buscar en la lista de compra" placeholder="Buscar producto" value={shoppingQuery} onChange={e=>setShoppingQuery(e.target.value)}/></label></div>
{shownShopping.length?<div className="shopping-list">{shownShopping.map(item=>
<label className={'shopping-item '+(item.checked?'checked':'')} key={item.key}>
<input type="checkbox" checked={item.checked} disabled={cannotWrite} onChange={()=>void checkItem(item)}/>
<span className="shopping-item-name">{item.name}<small>{item.checked?'En la cesta':'Por comprar'}</small></span>
<strong>{formatQuantity(item.quantity,item.unit)}</strong>{item.checked&&<Check size={17}/>}</label>)}</div>:<div className="shopping-filter-empty"><Check size={24}/><strong>{shoppingQuery?'No hay productos con ese nombre':'¡Todo en la cesta!'}</strong><p>{shoppingQuery?'Prueba con otra búsqueda.':'Podéis revisar lo comprado o volver al plan semanal.'}</p>{shoppingView==='pending'&&<button className="secondary" onClick={()=>setShoppingView('all')}>Ver todos los productos</button>}</div>}
<p className="fine shopping-note">Si añades una receta o aumentas un ingrediente ya comprado, ese producto vuelve a quedar pendiente.</p>
</>}</>}
 </div>;
}
