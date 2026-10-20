import {ArrowRight,BookOpen,Coins,House,KeyRound,Sparkles,UtensilsCrossed} from 'lucide-react';
import {CastleArt,StickerArt} from './fairytale';
import {projectProgress,PROJECT_SIZE,steps} from './progress';
import {dateText,plusDays} from './types';
import type {Gamification} from './overview';
import type {CoopState} from './coop';

const localDay=(iso:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
const money=(cents:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(cents/100);

export function GameHome({name,date,totalXP,openTasks,state,coop,weekStart,onTasks,onMeals,onSavings,onCoop,onAchievements}:{
 name:string;date:string;totalXP:number;openTasks:number;state:Gamification;coop?:CoopState;weekStart:string;
 onTasks:()=>void;onMeals:()=>void;onSavings:()=>void;onCoop:()=>void;onAchievements:()=>void;
}){
 const progress=projectProgress(totalXP);
 const weekEnd=plusDays(weekStart,6);
 const newBadges=coop?.badges.filter(badge=>badge.earned_at&&localDay(badge.earned_at)>=weekStart&&localDay(badge.earned_at)<=weekEnd)||[];
 const missions=coop?.missions.filter(mission=>mission.earned).length||0;
 const nextStage=steps[progress.stage]?.title||'Castillo completo';
 return <div className="game-home">
  <section className="game-world" aria-label="Mapa del castillo y accesos a las estancias">
   <div className="game-world-shade" aria-hidden="true"/>
   <div className="game-hud"><span className="game-hud-date">✦ {dateText(date,{weekday:'long',day:'numeric',month:'long'})}</span><div><span title="XP del proyecto común"><Sparkles size={15}/>{progress.points}/{PROJECT_SIZE}</span><span title="Llaves disponibles"><KeyRound size={15}/>{coop?.keys.balance||0}</span></div></div>
   <div className="game-world-heading"><span>VUESTRO MUNDO</span><h1>Hola, {name}.<br/>El castillo os espera.</h1></div>
   <div className="game-castle-status"><CastleArt totalXP={totalXP}/><div className="game-castle-caption"><span>CASTILLO COMPARTIDO</span><strong>{progress.stage}/4 fases</strong><small>Siguiente: {nextStage}</small></div></div>
   <div className="game-rooms" aria-label="Estancias del hogar">
    <button className="game-room game-room-tasks" onClick={onTasks}><span className="game-room-icon"><House size={23}/></span><strong>Limpieza</strong><small>{openTasks} tareas libres</small></button>
    <button className="game-room game-room-meals" onClick={onMeals}><span className="game-room-icon"><UtensilsCrossed size={23}/></span><strong>Cocina</strong><small>{state.meals.cooked}/{state.meals.planned} cocinadas</small></button>
    <button className="game-room game-room-savings" onClick={onSavings}><span className="game-room-icon"><Coins size={23}/></span><strong>Tesoro</strong><small>{money(state.savings.total_cents)} ahorrados</small></button>
    <button className="game-room game-room-coop" onClick={onCoop}><span className="game-room-icon"><Sparkles size={23}/></span><strong>Misiones</strong><small>{missions}/3 conseguidas</small></button>
   </div>
   <div className="game-companion"><img src="/mickey.png" alt=""/><p><strong>Mickey</strong>{openTasks?`¡Hay ${openTasks} tareas para elegir! Cada gesto enciende vuestro castillo.`:'¡Buen trabajo! Podéis planear una comida o mirar las misiones.'}</p></div>
  </section>
  <section className="game-journal" aria-label="Progreso y recuerdos de esta semana">
   <div className="game-journal-head"><span><BookOpen size={18}/> EL DIARIO DE ESTA SEMANA</span><button onClick={onAchievements}>Ver álbum <ArrowRight size={16}/></button></div>
   <div className="game-journal-progress"><div><strong>{progress.points} / {PROJECT_SIZE} XP</strong><small>{progress.remaining} XP para {progress.next.title.toLowerCase()}</small></div><div className="game-progress-track" role="progressbar" aria-label="Progreso del castillo" aria-valuenow={progress.points} aria-valuemin={0} aria-valuemax={PROJECT_SIZE}><span style={{width:`${progress.percent}%`}}/></div></div>
   <div className="game-journal-metrics"><span><House size={16}/>{state.week.clean} tareas</span><span><UtensilsCrossed size={16}/>{state.week.meals} comidas</span><span><Sparkles size={16}/>{missions} misiones</span></div>
   <div className="game-journal-achievements"><strong>Recuerdos nuevos</strong>{newBadges.length?<div className="game-badge-strip">{newBadges.map(badge=><span key={badge.id}><StickerArt id={badge.id}/><small>{badge.title}</small></span>)}</div>:<p>Esta semana aún no hay un pin nuevo. Los anteriores están en el álbum.</p>}</div>
  </section>
 </div>;
}
