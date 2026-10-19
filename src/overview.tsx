import {StickerArt} from './fairytale';
import {ArrowRight,Check,Coins,Flame,House,ShoppingBasket,UtensilsCrossed} from 'lucide-react';
import type {CoopState} from './coop';

export type Gamification={
 daily:{id:string;title:string;hint:string;done:boolean;section:'pools'|'meals'|'shopping'|'savings'}[];
 streak:{current:number;best:number};
 badges:{id:string;title:string;hint:string;earned:boolean;icon:string}[];
 shopping:{total:number;bought:number;pending:number};
 meals:{planned:number;cooked:number};
 savings:{total_cents:number;avoided_cents:number;weeklyReward:boolean};
 week:{clean:number;meals:number;noDelivery:number;points:number};
};
type Briefing={nextGoal:{title:string;amount_cents:number}|null;meals:{slot:'lunch'|'dinner';name:string}[]};
type Section='pools'|'meals'|'shopping'|'savings';
const money=(cents:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(cents/100);

export function BadgeGallery({badges}:{badges:Gamification['badges']}){
 const earned=badges.filter(badge=>badge.earned).length;
 return <section className="overview-badges"><div className="overview-section-heading"><div><span className="eyebrow">LOGROS DE LA CASA</span><h2>Lo que habéis desbloqueado</h2></div><span>{earned}/{badges.length} logros</span></div><div className="overview-badge-grid">{badges.map(badge=><div className={'overview-badge '+(badge.earned?'earned':'')} key={badge.id} title={badge.hint}><StickerArt id={badge.id}/><strong>{badge.title}</strong><small>{badge.earned?'Conseguido':badge.hint}</small></div>)}</div></section>;
}

export function HomeOverview({state,briefing,coop,openTasks,onNavigate,onCoop}:{state:Gamification;briefing:Briefing;coop?:CoopState;openTasks:number;onNavigate:(section:Section)=>void;onCoop:()=>void}){
 const completed=state.daily.filter(item=>item.done).length;
 const goal=briefing.nextGoal;
 const ready=goal&&state.savings.total_cents>=goal.amount_cents*.6;
 const weekPercent=Math.round((coop?.missions.filter(m=>m.earned).length||0)/3*100);
 const first=state.daily.find(item=>!item.done);
 return <div className="overview-360">
  <section className="overview-intro"><div><span className="eyebrow">EL MAPA DEL HOGAR · HOY</span><h2>La casa, de un vistazo</h2><p>{first?`Siguiente idea: ${first.title.toLowerCase()}. Elegid juntos cuándo hacerla.`:'¡Los cuatro hábitos de hoy están al día!'}</p>{first&&<button onClick={()=>onNavigate(first.section)}>Ir a este hábito <ArrowRight size={15}/></button>}</div><div className="overview-intro-stats"><strong>{completed}/4</strong><span>hábitos de hoy</span></div></section>
  <div className="overview-pillar-grid">
   <button onClick={()=>onNavigate('pools')}><span className="overview-pillar-icon"><House size={20}/></span><span className="eyebrow">LIMPIEZA</span><strong>{openTasks} libres</strong><small>{state.week.clean} tareas hechas esta semana</small><ArrowRight size={16}/></button>
   <button onClick={()=>onNavigate('meals')}><span className="overview-pillar-icon"><UtensilsCrossed size={20}/></span><span className="eyebrow">COMIDAS</span><strong>{state.meals.cooked}/{state.meals.planned} cocinadas hoy</strong><small>{briefing.meals.length?briefing.meals.map(meal=>`${meal.slot==='lunch'?'Comida':'Cena'}: ${meal.name}`).join(' · '):'Elegid qué cocinar hoy'}</small><ArrowRight size={16}/></button>
   <button onClick={()=>onNavigate('shopping')}><span className="overview-pillar-icon"><ShoppingBasket size={20}/></span><span className="eyebrow">COMPRA</span><strong>{state.shopping.pending} pendientes</strong><small>{state.shopping.bought}/{state.shopping.total} productos en la cesta</small><ArrowRight size={16}/></button>
   <button onClick={()=>onNavigate('savings')}><span className="overview-pillar-icon"><Coins size={20}/></span><span className="eyebrow">AHORRO</span><strong>{money(state.savings.total_cents)}</strong><small>{goal?ready?`Reservas de ${goal.title} desbloqueadas`:`Faltan ${money(Math.max(0,goal.amount_cents*.6-state.savings.total_cents))} para reservas`:'¡Todos los objetivos alcanzados!'}</small><small>{money(state.savings.avoided_cents)} en pedidos evitados (estimado)</small><ArrowRight size={16}/></button>
  </div>
  {coop&&<section className="overview-coop"><div><span className="eyebrow">MISIONES DEL CASTILLO · NIVEL {coop.level}</span><h2>Tres misiones esta semana</h2><p>Juntad llaves para planes compartidos. Nadie pierde XP por una semana tranquila.</p></div><div className="overview-coop-missions">{coop.missions.map(m=><span className={m.earned?'earned':''} key={m.id}>{m.icon} {m.title} {m.earned?'✓':''}</span>)}</div><button className="secondary" onClick={onCoop}>Ver misiones y recompensas <ArrowRight size={16}/></button></section>}
  <div className="overview-main-grid"><section className="overview-daily"><div className="overview-section-heading"><div><span className="eyebrow">RUTA COMPARTIDA</span><h2>Cuatro hábitos para hoy</h2><p>Son sugerencias para la casa. Nadie tiene una tarea asignada.</p></div><strong>{completed}/4</strong></div><div className="overview-daily-list">{state.daily.map(item=><button key={item.id} className={item.done?'done':''} onClick={()=>onNavigate(item.section)}><span className="overview-check">{item.done?<Check size={17}/>:null}</span><span><strong>{item.title}</strong><small>{item.hint}</small></span><ArrowRight size={16}/></button>)}</div></section>
   <div className="overview-side"><section className="overview-streak"><Flame size={24}/><div><span className="eyebrow">RACHA DE LA CASA</span><strong>{state.streak.current} {state.streak.current===1?'día':'días'}</strong><small>Mejor racha: {state.streak.best} · Cuenta un gesto real de limpieza, comida, ahorro o un día sin pedido.</small></div></section><section className="overview-week"><div><span className="eyebrow">LLAVES DE LA SEMANA</span><strong>{coop?.missions.filter(m=>m.earned).length||0} / 3</strong></div><div className="overview-week-track" role="progressbar" aria-label="Misiones semanales completadas" aria-valuenow={coop?.missions.filter(m=>m.earned).length||0} aria-valuemin={0} aria-valuemax={3}><span style={{width:`${weekPercent}%`}}/></div><p>{state.savings.weeklyReward?'✓ Bonus de ahorro de esta semana conseguido':'Primera aportación al ahorro de la semana: +10 XP'}</p><small>{state.week.clean} limpiezas · {state.week.meals} comidas · {state.week.noDelivery} días sin pedido</small></section></div></div>
  <BadgeGallery badges={state.badges}/>
 </div>;
}
