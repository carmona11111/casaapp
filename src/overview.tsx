import {StickerArt} from './fairytale';
import {ArrowRight,Coins,House,Sparkles,UtensilsCrossed} from 'lucide-react';
import {dateText,plusDays} from './types';
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
const localDay=(iso:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));

export function BadgeGallery({badges}:{badges:Gamification['badges']}){
 const earned=badges.filter(badge=>badge.earned).length;
 return <section className="overview-badges"><div className="overview-section-heading"><div><span className="eyebrow">LOGROS DE LA CASA</span><h2>Lo que habéis desbloqueado</h2></div><span>{earned}/{badges.length} logros</span></div><div className="overview-badge-grid">{badges.map(badge=><div className={'overview-badge '+(badge.earned?'earned':'')} key={badge.id} title={badge.hint}><StickerArt id={badge.id}/><strong>{badge.title}</strong><small>{badge.earned?'Conseguido':badge.hint}</small></div>)}</div></section>;
}

export function HomeOverview({state,briefing,coop,weekStart,openTasks,onNavigate,onCoop,onAchievements}:{state:Gamification;briefing:Briefing;coop?:CoopState;weekStart:string;openTasks:number;onNavigate:(section:Section)=>void;onCoop:()=>void;onAchievements:()=>void}){
 const weekEnd=plusDays(weekStart,6);
 const weeklyBadges=coop?.badges.filter(badge=>badge.earned_at&&localDay(badge.earned_at)>=weekStart&&localDay(badge.earned_at)<=weekEnd)||[];
 const missions=coop?.missions.filter(mission=>mission.earned).length||0;
 const nextMeal=briefing.meals.length?briefing.meals.map(meal=>`${meal.slot==='lunch'?'Comida':'Cena'}: ${meal.name}`).join(' · '):'Aún no hay comida elegida para hoy';
 return <div className="overview-360">
  <div className="overview-section-heading"><div><span className="eyebrow">EL HOGAR DE UN VISTAZO</span><h2>Destacados de cada sección</h2></div></div>
  <div className="overview-pillar-grid overview-highlights">
   <button onClick={()=>onNavigate('pools')}><span className="overview-pillar-icon"><House size={20}/></span><span className="eyebrow">TAREAS</span><strong>{openTasks} libres</strong><small>{state.week.clean} hechas esta semana</small><ArrowRight size={16}/></button>
   <button onClick={()=>onNavigate('meals')}><span className="overview-pillar-icon"><UtensilsCrossed size={20}/></span><span className="eyebrow">COMIDAS Y COMPRA</span><strong>{state.meals.cooked}/{state.meals.planned} cocinadas hoy</strong><small>{nextMeal}</small><small>{state.shopping.pending} productos pendientes</small><ArrowRight size={16}/></button>
   <button onClick={()=>onNavigate('savings')}><span className="overview-pillar-icon"><Coins size={20}/></span><span className="eyebrow">ECONOMÍA Y AHORRO</span><strong>{money(state.savings.total_cents)} ahorrados</strong><small>{briefing.nextGoal?`Próximo destino: ${briefing.nextGoal.title}`:'Objetivos alcanzados'}</small><ArrowRight size={16}/></button>
   <button onClick={onCoop}><span className="overview-pillar-icon"><Sparkles size={20}/></span><span className="eyebrow">MISIONES Y PREMIOS</span><strong>{missions}/3 misiones</strong><small>{coop?.keys.balance||0} llaves disponibles · nivel {coop?.level||1}</small><ArrowRight size={16}/></button>
  </div>
  <section className="overview-badges overview-weekly-badges"><div className="overview-section-heading"><div><span className="eyebrow">SEMANA DEL {dateText(weekStart,{day:'numeric',month:'long'}).toUpperCase()}</span><h2>Logros conseguidos esta semana</h2></div><button className="text-button" onClick={onAchievements}>Ver álbum completo <ArrowRight size={15}/></button></div>
   {weeklyBadges.length?<div className="overview-badge-grid">{weeklyBadges.map(badge=><div className="overview-badge earned" key={badge.id}><StickerArt id={badge.id}/><strong>{badge.title}</strong><small>Conseguido {dateText(localDay(badge.earned_at!))}</small></div>)}</div>:<p className="overview-weekly-empty">Todavía no hay logros nuevos esta semana. Los conseguidos antes siguen en el álbum.</p>}
  </section>
 </div>;
}
