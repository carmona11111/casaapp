import {CharacterBanner,StickerArt} from './fairytale';
import React,{useEffect,useState} from 'react';
import {Check,Coins,Gift,HandHeart,LockKeyhole,Plus,Sparkles} from 'lucide-react';
import {dateText} from './types';

export type CoopState={level:number;weekStart:string;plan:{target_xp:number;essentials:string[];kitchen_mode:'plan'|'delivery';team_mode:'saving'|'joint'};missions:{id:string;title:string;icon:string;progress:number;target:number;detail:string;done:boolean;earned:boolean}[];badges:{id:string;title:string;icon:string;hint:string;earned:boolean;earned_at:string|null}[];selectedSticker:{id:string;title:string;icon:string}|null;keys:{earned:number;spent:number;balance:number};fair:{confirmed_by:string[];weeks:number};monthly:{month:string;target_cents:number|null;net_cents:number;reached:boolean;earned:boolean};fund:{balance_cents:number;transfer_limit_cents:number};rewards:{key:string;title:string;description:string;keys:number;max_cents:number;unlocked:boolean}[];redemptions:{id:string;reward_key:string;person_id:string;keys_cost:number;amount_cents:number;created_at:string}[];events:{id:string;kind:string;title:string;person_id:string;amount:number;local_date:string;points_actor:number;points_partner:number}[]};
type Task={id:string;title:string;active:number};
type Write=(path:string,payload:object,success:string)=>Promise<boolean>;
const euro=(cents:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
const levelTitles=['Refugio en marcha','Casa luminosa','Equipo imparable','Hogar legendario'];
const eventOptions=[
 {kind:'joint_clean',title:'Limpieza en equipo',unit:'minutos',min:15,max:60,initial:20},
 {kind:'review',title:'Reunión de tareas, menú y presupuesto',unit:'minutos',min:10,max:60,initial:10},
 {kind:'pantry',title:'Revisar despensa',unit:'minutos',min:5,max:60,initial:10},
 {kind:'meal_prep',title:'Preparar raciones para después',unit:'raciones',min:1,max:20,initial:4},
 {kind:'fridge_rescue',title:'Aprovechar alimentos de nevera',unit:'ingredientes',min:1,max:20,initial:1},
 {kind:'budget_shop',title:'Compra con lista y presupuesto',unit:'compra',min:1,max:1,initial:1}
] as const;

export function AchievementGallery({state,disabled,onSelect}:{state:CoopState;disabled:boolean;onSelect:(id:string)=>void}){
 const [filter,setFilter]=useState<'all'|'locked'|'earned'>('all');
 const earned=state.badges.filter(badge=>badge.earned).length;
 const nextIds=['joint_first','week_resolved','first_saving','home_control','tuppers'];
 const next=nextIds.map(id=>state.badges.find(badge=>badge.id===id&&!badge.earned)).filter((badge):badge is CoopState['badges'][number]=>!!badge).slice(0,3);
 const visible=state.badges.filter(badge=>filter==='all'||(filter==='earned'?badge.earned:!badge.earned));
 return <section className="coop-panel coop-achievements" aria-labelledby="achievement-title">
  <div className="coop-heading"><div><span className="eyebrow">EL ÁLBUM DEL CASTILLO</span><h2 id="achievement-title">Los recuerdos que podéis ganar</h2><p>Todos los stickers están a la vista desde el principio. Los que faltan enseñan qué hacer para conseguirlos.</p></div><strong>{earned}/{state.badges.length} conseguidos</strong></div>
  <div className="achievement-track" role="progressbar" aria-label="Stickers conseguidos" aria-valuemin={0} aria-valuemax={state.badges.length} aria-valuenow={earned}><span style={{width:`${earned/state.badges.length*100}%`}}/></div>
  {next.length>0&&<div className="next-achievements"><span className="eyebrow">PRÓXIMOS OBJETIVOS</span><div>{next.map(badge=><article key={badge.id}><StickerArt id={badge.id}/><div><strong>{badge.title}</strong><p>{badge.hint}</p></div><LockKeyhole size={17} aria-label="Pendiente"/></article>)}</div></div>}
  <div className="achievement-toolbar"><h3>Álbum completo</h3><div role="group" aria-label="Filtrar logros">{([['all','Todos'],['locked','Por conseguir'],['earned','Conseguidos']] as const).map(([id,label])=><button key={id} type="button" className={filter===id?'selected':''} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>
  {visible.length===0?<div className="achievement-empty">Aún no hay stickers en esta vista. Los objetivos pendientes os esperan en «Por conseguir».</div>:<div className="coop-album">{visible.map(badge=><article className={`achievement-card ${badge.earned?'earned':'locked'} ${badge.id.startsWith('goal_')?badge.id:''}`} key={badge.id}>
   <div className="achievement-art"><StickerArt id={badge.id}/>{!badge.earned&&<LockKeyhole size={17} aria-label="Bloqueado"/>}</div>
   <strong>{badge.title}</strong><small>{badge.earned?`Conseguido · ${dateText(badge.earned_at!.slice(0,10))}`:badge.hint}</small>
   {badge.earned?<button className="text-button" disabled={disabled||state.selectedSticker?.id===badge.id} onClick={()=>onSelect(badge.id)}>{state.selectedSticker?.id===badge.id?'✦ Emblema actual':'Usar como emblema'}</button>:<span className="achievement-status">Por desbloquear</span>}
  </article>)}</div>}
 </section>;
}

function RewardGallery({state,disabled,costs,onCost,onRedeem}:{state:CoopState;disabled:boolean;costs:Record<string,string>;onCost:(key:string,value:string)=>void;onRedeem:(reward:CoopState['rewards'][number])=>void}){
 return <section className="coop-panel coop-prize-shop" aria-labelledby="prize-title"><div className="coop-heading"><div><span className="eyebrow">PREMIOS DEL HOGAR</span><h2 id="prize-title">Elegid vuestra próxima recompensa</h2><p>El catálogo está abierto desde el primer día. Completad misiones para reunir llaves y canjead solo los planes que os apetezcan.</p></div><strong>{state.keys.balance} {state.keys.balance===1?'llave disponible':'llaves disponibles'}</strong></div>
  <div className="prize-how"><span><b>1</b> Cumplid misiones</span><span><b>2</b> Ganad llaves juntos</span><span><b>3</b> Elegid un plan</span></div>
  <div className="coop-rewards">{state.rewards.map((reward,index)=>{
   const missing=Math.max(0,reward.keys-state.keys.balance);
   const cost=Math.round(Number(costs[reward.key]||0)*100);
   const requiresFund=reward.max_cents>0;
   const hasCost=Number.isSafeInteger(cost)&&cost>0&&cost<=reward.max_cents&&cost<=state.fund.balance_cents;
   const ready=reward.unlocked&&missing===0&&(!requiresFund||hasCost);
   const status=!reward.unlocked?'Desbloquead «Delivery en pausa»':missing>0?`Faltan ${missing} ${missing===1?'llave':'llaves'}`:requiresFund&&state.fund.balance_cents===0?'Añadid saldo al fondo de disfrute':requiresFund&&!hasCost?'Indicad un coste dentro del fondo':'Listo para canjear';
   return <article className={`prize-card ${ready?'ready':'locked'}`} key={reward.key}>
    <div className="prize-illustration" aria-hidden="true"><span>{['🎬','🥐','🌤️','🎁','🍽️','🛋️','🎟️','🏰'][index]||'🎁'}</span>{!ready&&<LockKeyhole size={19}/>}</div>
    <div className="prize-content"><span className="prize-cost"><LockKeyhole size={14}/>{reward.keys} {reward.keys===1?'llave':'llaves'}</span><strong>{reward.title}</strong><p>{reward.description}</p>{requiresFund&&<small>Coste máximo: {euro(reward.max_cents)} del fondo de disfrute</small>}
     <div className="prize-key-track" role="progressbar" aria-label={`Llaves disponibles para ${reward.title}`} aria-valuemin={0} aria-valuemax={reward.keys} aria-valuenow={Math.min(state.keys.balance,reward.keys)}><span style={{width:`${Math.min(100,state.keys.balance/reward.keys*100)}%`}}/></div>
     <span className={`prize-status ${ready?'ready':''}`}>{ready?<Check size={14}/>:<LockKeyhole size={14}/>} {status}</span>
     {requiresFund&&reward.unlocked&&missing===0&&<label>Coste real (€)<input type="number" min="0.01" max={Math.min(reward.max_cents,state.fund.balance_cents)/100} step="0.01" value={costs[reward.key]||''} onChange={e=>onCost(reward.key,e.target.value)} placeholder="Importe real" disabled={disabled||state.fund.balance_cents===0}/></label>}
     <button className={ready?'primary':'secondary'} disabled={disabled||!ready} onClick={()=>onRedeem(reward)}>{ready?'Canjear plan':'Por desbloquear'}</button>
    </div>
   </article>;
  })}</div><p className="fine">El descanso básico siempre está disponible. Los premios reservan tiempo de ocio; no autorizan ni hacen pagos automáticamente.</p>
 </section>;
}

export function Coop({state,tasks,actor,disabled,write}:{state:CoopState;tasks:Task[];actor:string;disabled:boolean;write:Write}){
 const [target,setTarget]=useState(state.plan.target_xp),[essentials,setEssentials]=useState<string[]>(state.plan.essentials);
 const [kitchenMode,setKitchenMode]=useState(state.plan.kitchen_mode),[teamMode,setTeamMode]=useState(state.plan.team_mode);
 const [kind,setKind]=useState<(typeof eventOptions)[number]['kind']>('joint_clean'),[amount,setAmount]=useState(20);
 const [transfer,setTransfer]=useState(''),[costs,setCosts]=useState<Record<string,string>>({});
 const [monthlyTarget,setMonthlyTarget]=useState(state.monthly.target_cents?String(state.monthly.target_cents/100):'');
 const [working,setWorking]=useState(false);
 useEffect(()=>{setTarget(state.plan.target_xp);setEssentials(state.plan.essentials);setKitchenMode(state.plan.kitchen_mode);setTeamMode(state.plan.team_mode);},[state.weekStart,state.plan.target_xp,state.plan.essentials.join('|'),state.plan.kitchen_mode,state.plan.team_mode]);
 useEffect(()=>{setMonthlyTarget(state.monthly.target_cents?String(state.monthly.target_cents/100):'');},[state.monthly.month,state.monthly.target_cents]);
 const option=eventOptions.find(x=>x.kind===kind)!;
 async function run(path:string,payload:object,success:string){setWorking(true);try{return await write(path,{actor,...payload},success);}finally{setWorking(false);}}
 async function savePlan(e:React.FormEvent){e.preventDefault();await run('/api/coop/plan',{week_start:state.weekStart,target_xp:Number(target),essentials,kitchen_mode:kitchenMode,team_mode:teamMode},'Plan semanal actualizado');}
 async function saveEvent(e:React.FormEvent){e.preventDefault();await run('/api/coop/event',{kind,amount:Number(amount)},'Gesto de equipo registrado');}
 async function saveMonthly(e:React.FormEvent){e.preventDefault();const cents=Math.round(Number(monthlyTarget)*100);if(Number.isSafeInteger(cents)&&cents>=1000)await run('/api/coop/monthly',{target_cents:cents},'Objetivo mensual acordado');}
 async function saveTransfer(e:React.FormEvent){e.preventDefault();const cents=Math.round(Number(transfer)*100);if(!Number.isSafeInteger(cents)||cents<=0)return;if(await run('/api/coop/transfer',{amount_cents:cents},'Traspaso al fondo registrado'))setTransfer('');}
 async function redeem(reward:CoopState['rewards'][number]){const cents=reward.max_cents?Math.round(Number(costs[reward.key]||0)*100):0;if(!Number.isSafeInteger(cents))return;if(await run('/api/coop/redeem',{reward_key:reward.key,amount_cents:cents},'Plan canjeado'))setCosts({...costs,[reward.key]:''});}
 return <div className="coop-page">
  <CharacterBanner guide="mickey" eyebrow="MISIONES DEL CASTILLO" title="Misiones, premios y recuerdos" description="Ved qué podéis conseguir juntos: tres misiones cada semana, stickers por desbloquear y planes para disfrutar."/>
  <section className="coop-hero"><div><span className="eyebrow">NIVEL DEL HOGAR</span><strong>{state.selectedSticker&&<StickerArt id={state.selectedSticker.id} className="level-sticker"/>} {state.level}</strong><small>{levelTitles[Math.min(state.level-1,levelTitles.length-1)]} · 500 XP por nivel</small></div><div><span className="eyebrow">LLAVES DISPONIBLES</span><strong><LockKeyhole size={30}/>{state.keys.balance}</strong><small>{state.keys.earned} ganadas · {state.keys.spent} usadas</small></div><div><span className="eyebrow">FONDO DE DISFRUTE</span><strong>{euro(state.fund.balance_cents)}</strong><small>Separado del objetivo de ahorro</small></div></section>
  <section className="coop-panel"><div className="coop-heading"><div><span className="eyebrow">SEMANA DEL {dateText(state.weekStart,{day:'numeric',month:'long'}).toUpperCase()}</span><h2>Tres misiones, un objetivo común</h2><p>Máximo tres llaves por semana. Los logros especiales pueden dar alguna llave más.</p></div><span>{state.missions.filter(x=>x.earned).length}/3 llaves</span></div><div className="coop-mission-grid">{state.missions.map(mission=><article className={mission.earned?'complete':''} key={mission.id}><span className="coop-mission-icon">{mission.icon}</span><strong>{mission.title}</strong><p>{mission.detail}</p><div className="coop-progress" role="progressbar" aria-label={`Progreso de ${mission.title}`} aria-valuenow={mission.progress} aria-valuemin={0} aria-valuemax={mission.target}><span style={{width:`${Math.round(mission.progress/mission.target*100)}%`}}/></div><small>{mission.earned?<><Check size={14}/> Llave conseguida</>:`${mission.progress}/${mission.target} · pendiente`}</small></article>)}</div></section>
  <AchievementGallery state={state} disabled={disabled||working} onSelect={id=>void run('/api/coop/sticker',{badge_id:id},'Emblema actualizado')}/>
  <RewardGallery state={state} disabled={disabled||working} costs={costs} onCost={(key,value)=>setCosts(current=>({...current,[key]:value}))} onRedeem={reward=>void redeem(reward)}/>
  <div className="coop-agreements"><section className="coop-panel"><span className="eyebrow">REPARTO SEGÚN VUESTRA DISPONIBILIDAD</span><h2>¿Fue una semana justa?</h2><p>Lo decidís vosotros, sin exigir 50/50. El logro aparece cuando ambos confirmáis dos semanas con al menos la mitad del esfuerzo acordado.</p><strong>{state.fair.confirmed_by.length}/2 confirmaciones esta semana</strong><button className="secondary" disabled={disabled||working||state.fair.confirmed_by.includes(actor)} onClick={()=>void run('/api/coop/fair',{},'Reparto confirmado')}>{state.fair.confirmed_by.includes(actor)?'Ya confirmaste tu valoración':'Para mí, el reparto fue justo'}</button><small>{state.fair.weeks} semanas acordadas</small></section><section className="coop-panel"><span className="eyebrow">AHORRO REAL · {state.monthly.month}</span><h2>Objetivo protegido</h2><p>Acordad una meta mensual opcional. Al cerrar el mes se conceden dos llaves si el ahorro neto, después de retiradas y traspasos, alcanza esa cifra.</p><strong>{euro(state.monthly.net_cents)} {state.monthly.target_cents?`/ ${euro(state.monthly.target_cents)}`:''}</strong><form onSubmit={e=>void saveMonthly(e)}><label>Meta de este mes (€)<input type="number" min="10" max="1000000" step="0.01" value={monthlyTarget} onChange={e=>setMonthlyTarget(e.target.value)} placeholder="Ej. 100"/></label><button className="secondary" disabled={disabled||working||state.monthly.earned}>Guardar meta mensual</button></form><small>{state.monthly.earned?'Meta confirmada · +2 llaves':state.monthly.reached?'Meta alcanzada; las llaves se confirman al cerrar el mes.':'Sin meta predeterminada: vosotros elegís.'}</small></section></div>
  <div className="coop-two-col"><section className="coop-panel"><div className="coop-heading"><div><span className="eyebrow">SIN REPARTO AUTOMÁTICO</span><h2>Plan de esfuerzo</h2><p>El objetivo de hogar se cumple con el 80 % de esta XP y todas las esenciales que elijáis.</p></div></div><form onSubmit={e=>void savePlan(e)}><label>XP de limpieza planificada esta semana<input type="number" min="50" max="500" step="10" value={target} onChange={e=>setTarget(Number(e.target.value))}/></label><label>Misión de cocina<select value={kitchenMode} onChange={e=>setKitchenMode(e.target.value as 'plan'|'delivery')}><option value="plan">Planificar 5 comidas y preparar la compra</option><option value="delivery">7 días sin pedido y 5 comidas caseras</option></select></label><label>Misión de equipo<select value={teamMode} onChange={e=>setTeamMode(e.target.value as 'saving'|'joint')}><option value="saving">Reunión breve y aporte al ahorro</option><option value="joint">Una limpieza conjunta de 20 min</option></select></label><fieldset><legend>Tareas esenciales acordadas</legend><div className="coop-essential-list">{tasks.filter(x=>x.active).map(task=><label key={task.id}><input type="checkbox" checked={essentials.includes(task.id)} onChange={e=>setEssentials(e.target.checked?[...essentials,task.id]:essentials.filter(id=>id!==task.id))}/>{task.title}</label>)}</div></fieldset><button className="secondary" disabled={disabled||working||essentials.length>10}>Guardar plan semanal</button></form></section>
  <section className="coop-panel"><div className="coop-heading"><div><span className="eyebrow">TRABAJO INVISIBLE QUE TAMBIÉN CUENTA</span><h2>Registrar un gesto de equipo</h2><p>Una vez al día o por semana según el gesto. La limpieza conjunta reparte la XP entre los dos. Si fue una tarea de la pool, marcadla allí como hecha juntos.</p></div></div><form onSubmit={e=>void saveEvent(e)}><label>Gesto<select value={kind} onChange={e=>{const next=eventOptions.find(x=>x.kind===e.target.value)!;setKind(next.kind);setAmount(next.initial);}}>{eventOptions.map(x=><option key={x.kind} value={x.kind}>{x.title}</option>)}</select></label><label>{option.unit}<input type="number" min={option.min} max={option.max} value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label><button className="primary" disabled={disabled||working}><Plus size={16}/> Registrar gesto</button></form><div className="coop-event-history">{state.events.slice(0,4).map(x=><div key={x.id}><HandHeart size={16}/><span>{x.title} · {x.amount} · {dateText(x.local_date)}</span><strong>+{x.points_actor+x.points_partner} XP</strong></div>)}</div></section></div>
  <section className="coop-panel"><div className="coop-heading"><div><span className="eyebrow">DOS BOLSAS CLARAS</span><h2>Fondo de disfrute</h2><p>Un traspaso reduce el ahorro del viaje y aumenta el fondo. Como límite inicial, podéis mover hasta el 25 % de las aportaciones reales de este mes.</p></div><strong>{euro(state.fund.balance_cents)}</strong></div><form className="coop-transfer" onSubmit={e=>void saveTransfer(e)}><label>Traspasar desde ahorro (€)<input type="number" min="0.01" max={state.fund.transfer_limit_cents/100} step="0.01" value={transfer} onChange={e=>setTransfer(e.target.value)} placeholder="Importe"/></label><button className="secondary" disabled={disabled||working||state.fund.transfer_limit_cents<=0}><Coins size={16}/> Traspasar</button><small>Disponible para traspasar este mes: {euro(state.fund.transfer_limit_cents)}</small></form></section>
  {state.redemptions.length>0&&<section className="coop-panel"><h2>Planes canjeados</h2>{state.redemptions.map(x=><p key={x.id}><Sparkles size={15}/> {state.rewards.find(r=>r.key===x.reward_key)?.title||x.reward_key} · {x.keys_cost} llaves{x.amount_cents?` · ${euro(x.amount_cents)}`:''} · {dateText(x.created_at.slice(0,10))}</p>)}</section>}
 </div>;
}

const previewBadges=[
 {id:'joint_first',title:'Primera victoria',hint:'Haced una limpieza conjunta de 15 minutos.'},
 {id:'home_control',title:'Casa bajo control',hint:'Completad la misión semanal de hogar.'},
 {id:'week_resolved',title:'Semana resuelta',hint:'Planificad cinco comidas y preparad la compra.'},
 {id:'tuppers',title:'Tuppers al rescate',hint:'Preparad cuatro raciones para después.'},
 {id:'recipe_collection',title:'Recetario en expansión',hint:'Cocinad y valorad cinco recetas diferentes.'},
 {id:'first_saving',title:'Primer ladrillo',hint:'Registrad la primera aportación al ahorro.'},
 {id:'goal_100',title:'Viaje express preparado',hint:'Alcanzad el objetivo de 1.000 €.'},
 {id:'team_mode',title:'Modo cooperativo',hint:'Completad tres semanas con limpieza conjunta.'}
];
const previewRewards=[
 {title:'Noche de peli o videojuegos',keys:1,icon:'🎬'},
 {title:'Desayuno especial en casa',keys:2,icon:'🥐'},
 {title:'Tarde libre de tareas no esenciales',keys:2,icon:'🌤️'},
 {title:'Pequeño capricho compartido',keys:3,icon:'🎁'},
 {title:'Comer o cenar fuera',keys:4,icon:'🍽️'},
 {title:'Día de mantenimiento mínimo',keys:5,icon:'🛋️'},
 {title:'Cita especial',keys:6,icon:'🎟️'},
 {title:'Aportación al plan grande',keys:10,icon:'🏰'}
];

export function CoopPreview({retry}:{retry:()=>void}){
 return <div className="coop-page coop-preview"><CharacterBanner guide="mickey" eyebrow="MISIONES Y PREMIOS" title="Todo lo que podréis desbloquear" description="Vuestros próximos objetivos, stickers y planes compartidos están aquí desde el primer día."/>
  <div className="coop-preview-notice" role="status"><LockKeyhole size={20}/><div><strong>Vista de muestra</strong><p>El servidor todavía no ha enviado el progreso de esta sección. Los objetivos se muestran como ejemplo; para guardar misiones, llaves y canjes hace falta actualizar el servidor.</p></div><button className="secondary" onClick={retry}>Volver a cargar</button></div>
  <section className="coop-panel"><div className="coop-heading"><div><span className="eyebrow">UN OBJETIVO COMÚN CADA SEMANA</span><h2>Tres misiones, tres llaves posibles</h2><p>Elegid tareas libres y completad objetivos de limpieza, cocina y equipo.</p></div></div><div className="coop-mission-grid">{[{icon:'🧹',title:'Hogar bajo control',detail:'XP de limpieza y tareas esenciales elegidas entre los dos.'},{icon:'🍳',title:'Semana resuelta',detail:'Comidas planificadas, cocina casera y lista de compra preparada.'},{icon:'🤝',title:'Equipo y ahorro',detail:'Una reunión, ahorro real o una limpieza conjunta.'}].map(item=><article key={item.title}><span className="coop-mission-icon">{item.icon}</span><strong>{item.title}</strong><p>{item.detail}</p><small><LockKeyhole size={14}/> 1 llave por desbloquear</small></article>)}</div></section>
  <section className="coop-panel coop-achievements"><div className="coop-heading"><div><span className="eyebrow">ÁLBUM DE LOGROS</span><h2>Stickers que os esperan</h2><p>Cada uno muestra su objetivo. Al conseguirlo aparecerá a todo color y podréis elegirlo como emblema.</p></div></div><div className="coop-album">{previewBadges.map(badge=><article className="achievement-card locked" key={badge.id}><div className="achievement-art"><StickerArt id={badge.id}/><LockKeyhole size={17}/></div><strong>{badge.title}</strong><small>{badge.hint}</small><span className="achievement-status">Por desbloquear</span></article>)}</div></section>
  <section className="coop-panel coop-prize-shop"><div className="coop-heading"><div><span className="eyebrow">CATÁLOGO DE PREMIOS</span><h2>Planes para disfrutar juntos</h2><p>Las llaves se ganan con misiones reales. Los planes con coste requieren saldo en el fondo de disfrute.</p></div></div><div className="coop-rewards">{previewRewards.map(reward=><article className="prize-card locked" key={reward.title}><div className="prize-illustration" aria-hidden="true"><span>{reward.icon}</span><LockKeyhole size={19}/></div><div className="prize-content"><span className="prize-cost"><LockKeyhole size={14}/>{reward.keys} {reward.keys===1?'llave':'llaves'}</span><strong>{reward.title}</strong><span className="prize-status"><LockKeyhole size={14}/> Por desbloquear</span></div></article>)}</div></section>
 </div>;
}
