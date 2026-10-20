import {useEffect,useState} from 'react';
import {ArrowRight,CalendarDays} from 'lucide-react';
import {api,dateText} from './types';
import type {Guide} from './fairytale';

const images:Record<Guide,string>={mickey:'/mickey.png',cenicienta:'/cenicienta.png',ratatouille:'/ratatouille.png',gilito:'/tio-gilito.png'};
const names:Record<Guide,string>={mickey:'Mickey',cenicienta:'Cenicienta',ratatouille:'Ratatouille',gilito:'Tío Gilito'};

export function GuideFeedback({guide,title,message}:{guide:Guide;title:string;message:string}){
 return <aside className={`guide-feedback guide-feedback-${guide}`} aria-label={`Informe de ${names[guide]}`}>
  <img src={images[guide]} alt=""/><div><span className="eyebrow">{names[guide]} te cuenta</span><strong>{title}</strong><p>{message}</p></div>
 </aside>;
}

type Report={sunday:string;weekStart:string;nextWeek:string;isMonthClose:boolean;week:{tasks:number;taskXP:number;meals:number;noDelivery:number;points:number;missions:number};month:{tasks:number;meals:number;income_cents:number;expense_cents:number;savings_cents:number};next:{effortPlanned:boolean;mealsPlanned:number}};
const euro=(cents:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);

export function MickeyReport({person,onPlan,onMeals}:{person:string;onPlan:(week:string)=>void;onMeals:(week:string)=>void}){
 const [report,setReport]=useState<Report|null>(null),[open,setOpen]=useState(false);
 useEffect(()=>{let live=true;async function load(){try{const next:Report=await api('/api/report');if(live)setReport(next);}catch{}}void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},60000);return()=>{live=false;clearInterval(timer);};},[]);
 if(!report)return null;
 const seenKey=`casa-report:${person}:${report.sunday}`;
 const unseen=!localStorage.getItem(seenKey);
 const show=()=>{localStorage.setItem(seenKey,'seen');setOpen(true);};
 return <section className="mickey-report" aria-label="Informe de Mickey">
  <div className="mickey-report-head"><img src="/mickey.png" alt=""/><div><span className="eyebrow">MICKEY · DOMINGOS A LAS 19:00</span><h2>Informe de la casa · {dateText(report.sunday,{day:'numeric',month:'long'})}</h2><p>Ya está listo el balance de la semana. {report.isMonthClose?'También he preparado el cierre mensual.':''}</p></div><button className="secondary" onClick={show}>{unseen?'Ver informe nuevo':'Ver informe'} <ArrowRight size={16}/></button></div>
  {open&&<div className="mickey-report-body"><p>Esta semana habéis hecho <strong>{report.week.tasks} tareas</strong>, cocinado <strong>{report.week.meals} comidas</strong> y registrado <strong>{report.week.noDelivery} días sin pedido</strong>. Sumasteis al menos <strong>{report.week.points} XP</strong> entre esos gestos y conseguisteis <strong>{report.week.missions} de 3 misiones</strong>.</p>
   {report.isMonthClose&&<div className="mickey-month"><span className="eyebrow">CIERRE MENSUAL HASTA EL {dateText(report.sunday,{day:'numeric',month:'long'}).toUpperCase()}</span><p>{report.month.tasks} tareas y {report.month.meals} comidas cocinadas. Ingresos registrados: {euro(report.month.income_cents)} · gastos: {euro(report.month.expense_cents)} · ahorro neto: {euro(report.month.savings_cents)}.</p></div>}
   <div className="mickey-next"><CalendarDays size={21}/><div><strong>Preparad la semana del {dateText(report.nextWeek,{day:'numeric',month:'long'})}</strong><p>{report.next.effortPlanned?'El objetivo de esfuerzo está definido.':'Acordad las tareas esenciales y el objetivo de esfuerzo.'} {report.next.mealsPlanned?`Hay ${report.next.mealsPlanned} comidas planificadas.`:'Elegid las comidas y preparad la compra.'}</p></div></div>
   <div className="mickey-report-actions"><button className="primary" onClick={()=>onPlan(report.nextWeek)}>Definir tareas y objetivos</button><button className="secondary" onClick={()=>onMeals(report.nextWeek)}>Planificar comidas</button></div>
  </div>}
 </section>;
}
