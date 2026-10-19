import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowRight,BookOpen,CalendarDays,Check,ChevronDown,Clock,Coins,Hand,Heart,History,House,Leaf,Menu,Plus,RefreshCw,Settings,Sparkles,Sun,Users,UtensilsCrossed,WifiOff,X} from 'lucide-react';
import {api,dateText} from './types';
import {requestId} from './id';
import {projectProgress,PROJECT_SIZE,MILESTONE_SIZE,steps} from './progress';
import {Meals} from './meals';
import {Savings} from './savings';
import {BadgeGallery,HomeOverview,type Gamification} from './overview';
import {AchievementGallery,Coop,CoopPreview,type CoopState} from './coop';
import {CastleArt,CharacterBanner,StickerArt} from './fairytale';
import {Onboarding,onboardingSeen,markOnboardingSeen,type TourTarget} from './onboarding';
import './styles.css';

type Pool='daily'|'every3'|'weekly'|'occasional';
type Tab='pools'|'meals'|'savings'|'coop'|'activity'|'settings';
type Person={id:string;name:string;color:string;active:number};
type Completion={id:string;template_id:string;person_id:string;completed_at:string;local_date:string;points:number;title:string;zone:string;shared_with?:string|null};
type Task={id:string;title:string;steps:string[];minutes:number;active:number;pet:number;zone_id:string;zone:string;pool:Pool;claimed_by:string|null;claimed_at:string|null;last:Completion|null;available:boolean;points:number};
type Score={person_id:string;count:number;points:number};
type Board={today:string;serverTime:string;scoreEpoch?:string;people:Person[];zones:{id:string;name:string}[];tasks:Task[];completions:Completion[];activity:Completion[];totals:Score[];todayPoints:Omit<Score,'count'>[];week:{start:string;count:number;points:number;people:Score[]};briefing?:{meals:{slot:'lunch'|'dinner';name:string;cooked_by:string|null}[];noDelivery:boolean;savings_cents:number;nextGoal:{title:string;amount_cents:number}|null};gamification?:Gamification;coop?:CoopState};
type Action='claim'|'release'|'complete'|'complete_together';
const pools:{id:Pool;title:string;hint:string;icon:typeof Sun}[]=[
 {id:'daily',title:'Cada día',hint:'Vuelven mañana',icon:Sun},
 {id:'every3',title:'Cada 2–3 días',hint:'Vuelven tras 3 días',icon:RefreshCw},
 {id:'weekly',title:'Cada semana',hint:'Vuelven el lunes',icon:CalendarDays},
 {id:'occasional',title:'Cada 4 semanas',hint:'Vuelven tras 28 días',icon:Sparkles}
];
const personName=(board:Board,id:string|null)=>board.people.find(p=>p.id===id)?.name||'Alguien';
const scoreFor=(scores:Score[],id:string)=>scores.find(s=>s.person_id===id)?.points||0;
const taskCount=(scores:Score[],id:string)=>scores.find(s=>s.person_id===id)?.count||0;

function ProjectCard({board,compact=false,onExplore}:{board:Board;compact?:boolean;onExplore?:()=>void}){
 const total=board.totals.reduce((sum,row)=>sum+row.points,0);
 const progress=projectProgress(total);
 return <section className={'project-card '+(compact?'project-compact':'')} aria-labelledby="project-title">
  <div className="project-copy"><span className="project-kicker"><Sparkles size={15}/> EL PROYECTO DE LOS DOS</span><h2 id="project-title">{progress.title}</h2>
   <p>Con la limpieza, las comidas y el ahorro construimos un hogar más agradable. Esta vez toca <strong>{progress.next.verb}</strong>.</p>
   <div className="project-progress-heading"><strong>{progress.points} / {PROJECT_SIZE} XP</strong><span>Faltan {progress.remaining} para {progress.next.title.toLowerCase()}</span></div>
   <div className="project-progress-track" role="progressbar" aria-label="Progreso del proyecto común" aria-valuenow={progress.points} aria-valuemin={0} aria-valuemax={PROJECT_SIZE}><span style={{width:`${progress.percent}%`}}/></div>
   <div className="project-milestones" aria-label="Hitos del proyecto">{steps.map((step,index)=><div className={index<progress.stage?'achieved':index===progress.stage?'current':''} key={step.title}><span>{index<progress.stage?<Check size={13}/>:index+1}</span><small>{step.title}</small></div>)}</div>
   <div className="project-footer"><span><House size={16}/> {progress.completedProjects===0?'Nuestro primer proyecto en marcha':`${progress.completedProjects} ${progress.completedProjects===1?'rincón construido':'rincones construidos'}`}</span>{onExplore&&<button onClick={onExplore}>Elegir una tarea <ArrowRight size={16}/></button>}</div>
  </div><CastleArt totalXP={total}/>
 </section>;
}

function TaskCard({task,board,person,disabled,onAction}:{task:Task;board:Board;person:string;disabled:boolean;onAction:(task:Task,action:Action)=>void}){
 const owner=board.people.find(p=>p.id===task.claimed_by);
 const done=!task.available;
 return <article className={'pool-task '+(done?'is-done ':'')+(owner?'is-claimed':'')}>
  <div className="pool-task-top"><span className="task-symbol">{done?<Check size={20}/>:owner?<Hand size={20}/>:<Leaf size={20}/>}</span><div className="pool-task-body"><span className="pool-task-zone">{task.zone} · {task.minutes} min aprox.</span><h3>{task.title}</h3><span className="pool-task-points"><Sparkles size={13}/> {task.points} XP para la casa</span></div></div>
  {task.steps.filter(Boolean).length>0&&<details className="pool-steps"><summary>Ver pasos <ChevronDown size={15}/></summary><ol>{task.steps.filter(Boolean).map((step,index)=><li key={index}>{step}</li>)}</ol></details>}
  <div className="pool-task-foot">{done?<span className="pool-task-status"><Check size={15}/> {task.last?.shared_with?`${personName(board,task.last.person_id)} y ${personName(board,task.last.shared_with)} la hicieron`:personName(board,task.last?.person_id||null)+' la hizo'} {task.last?.local_date===board.today?'hoy':dateText(task.last!.local_date)}</span>:owner?<><span className="pool-task-status"><span className="mini-avatar" style={{background:owner.color}}>{owner.name[0]}</span>{owner.id===person?'La tienes tú':`La tiene ${owner.name}`}</span>{owner.id===person&&<div className="pool-actions"><button className="text-button" disabled={disabled} onClick={()=>onAction(task,'release')}>Devolver</button><button className="primary" disabled={disabled} onClick={()=>onAction(task,'complete')}><Check size={16}/> Ya la hice</button>{task.minutes>=16&&<button className="secondary" disabled={disabled} onClick={()=>onAction(task,'complete_together')}><Users size={16}/> La hicimos juntos</button>}</div>}</>:<button className="secondary" disabled={disabled} onClick={()=>onAction(task,'claim')}><Hand size={16}/> La cojo</button>}</div>
 </article>;
}

function App(){
 const [board,setBoard]=useState<Board|null>(null);
 const [person,setPerson]=useState<string|null>(()=>location.pathname==='/entrada'?null:localStorage.getItem('casa-person'));
 const [showOnboarding,setShowOnboarding]=useState(()=>{const id=location.pathname==='/entrada'?null:localStorage.getItem('casa-person');return !!id&&!onboardingSeen(id);});
 const [tab,setTab]=useState<Tab>('pools');
 const [pool,setPool]=useState<Pool>('daily');
 const [mealsFocus,setMealsFocus]=useState<'plan'|'shopping'>('plan');
 const [offline,setOffline]=useState(!navigator.onLine);
 const [busy,setBusy]=useState(false),[menu,setMenu]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [celebration,setCelebration]=useState<{title:string;points:number;milestone:boolean;badge?:string}|null>(null);
 const [editId,setEditId]=useState<string|null>(null);
 const [draft,setDraft]=useState<{title:string;steps:string;zone_id:string;minutes:number;pool:Pool;active:0|1}|null>(null);
 const busyRef=useRef(false),boardRef=useRef(board);boardRef.current=board;

 async function refresh():Promise<Board|null>{
  try{const next:Board=await api('/api/pool');if(!next.week)throw new Error('El servidor sigue ejecutando la versión anterior. Reinícialo para activar el proyecto común.');setBoard(next);setOffline(false);try{localStorage.setItem('casa-pool-cache',JSON.stringify(next));}catch{}return next;}
  catch(e:any){setOffline(e.status===0);setError(e.status===404?'El servidor sigue ejecutando la versión anterior. Reinícialo con npm run serve -- stop y npm run serve.':e.message);if(!boardRef.current){try{const cached=JSON.parse(localStorage.getItem('casa-pool-cache')||'null');if(cached?.week)setBoard(cached);}catch{}}return null;}
 }
 useEffect(()=>{if('serviceWorker' in navigator&&import.meta.env.PROD)void navigator.serviceWorker.register('/sw.js').catch(()=>{});},[]);
 useEffect(()=>{void refresh();const onFocus=()=>{if(document.visibilityState==='visible')void refresh();};const onOffline=()=>setOffline(true);const timer=setInterval(onFocus,15000);window.addEventListener('focus',onFocus);window.addEventListener('online',onFocus);window.addEventListener('offline',onOffline);document.addEventListener('visibilitychange',onFocus);return()=>{clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('online',onFocus);window.removeEventListener('offline',onOffline);};},[]);
 useEffect(()=>{if(!celebration)return;const timer=setTimeout(()=>setCelebration(null),6500);return()=>clearTimeout(timer);},[celebration]);

 async function write(path:string,payload:object,success:string):Promise<boolean>{
  if(busyRef.current||offline)return false;
  busyRef.current=true;setBusy(true);setError('');setMessage('Guardando…');
  try{const before=boardRef.current;await api(path,{method:'POST',body:JSON.stringify(payload),headers:{'Idempotency-Key':requestId()}});setMessage(success);const next=await refresh();if(before&&next&&path!=='/api/import'){const oldTotal=before.totals.reduce((sum,row)=>sum+row.points,0),newTotal=next.totals.reduce((sum,row)=>sum+row.points,0);const oldBadges=new Set(before.gamification?.badges.filter(b=>b.earned).map(b=>b.id));const badge=next.gamification?.badges.find(b=>b.earned&&!oldBadges.has(b.id));if(newTotal>oldTotal||badge)setCelebration({title:success,points:Math.max(0,newTotal-oldTotal),milestone:Math.floor(newTotal/MILESTONE_SIZE)>Math.floor(oldTotal/MILESTONE_SIZE),badge:badge?.title});}return true;}
  catch(e:any){setError(e.message);setMessage('');if(e.status===409)await refresh();if(e.status===0)setOffline(true);return false;}
  finally{busyRef.current=false;setBusy(false);}
 }
 async function taskAction(task:Task,action:Action){
  const success=action==='claim'?'Tarea en tus manos':action==='release'?'Tarea devuelta a la pool':`+${task.points} XP para la casa`;
  const partner=board?.people.find(p=>p.id!==person)?.id;
  await write('/api/pool/action',{template_id:task.id,actor:person,action:action==='complete_together'?'complete':action,...(action==='complete_together'?{with_person:partner}:{})},success);
 }
 function editTask(task?:Task){setEditId(task?.id||'new');setDraft({title:task?.title||'',steps:task?.steps.join('\n')||'',zone_id:task?.zone_id||board?.zones[0]?.id||'',minutes:task?.minutes||10,pool:task?.pool||'weekly',active:task?.active===0?0:1});}
 async function saveTask(e:React.FormEvent){e.preventDefault();if(!draft||!person)return;const ok=await write('/api/pool/task',{actor:person,id:editId==='new'?undefined:editId,title:draft.title,steps:draft.steps.split('\n').map(x=>x.trim()).filter(Boolean),zone_id:draft.zone_id,minutes:Number(draft.minutes),pool:draft.pool,active:draft.active},'Tarea guardada');if(ok){setEditId(null);setDraft(null);}}
 function selectPerson(id:string){setPerson(id);setTab('pools');setShowOnboarding(!onboardingSeen(id));localStorage.setItem('casa-person',id);history.replaceState({},'','/');}
 function finishOnboarding(target?:TourTarget){if(person)markOnboardingSeen(person);setShowOnboarding(false);if(target){setTab(target);setMenu(false);window.scrollTo({top:0,behavior:'smooth'});}}
 function navigate(next:Tab){setTab(next);setMenu(false);window.scrollTo(0,0);}
 function goToTasks(){navigate('pools');requestAnimationFrame(()=>document.getElementById('task-pools')?.scrollIntoView({behavior:'smooth',block:'start'}));}
 function goToMeals(section:'plan'|'shopping'='plan'){setMealsFocus(section);navigate('meals');}

 if(!board)return <div className="gate"><div className="gate-card"><div className="brand"><Sparkles/> Hogar Encantado</div><h1>Preparando el castillo…</h1>{error&&<p role="alert">{error}</p>}<button className="primary wide" onClick={()=>void refresh()}>Volver a intentar</button></div></div>;
 const selected=board.people.find(p=>p.id===person);
 if(!selected)return <div className="gate"><div className="gate-card selection"><div className="brand"><Sparkles/> Hogar Encantado</div><img className="gate-character" src="/mickey.png" alt="Mickey os da la bienvenida"/><span className="eyebrow">UN HOGAR COMPARTIDO</span><h1>¿Quién entra al castillo?</h1><p className="muted">Elige tu perfil. Cada gesto ayudará a construir vuestra historia.</p><div className="profile-options">{board.people.map(p=><button key={p.id} onClick={()=>selectPerson(p.id)}><span className="avatar large" style={{background:p.color}}>{p.name[0]}</span><strong>{p.name}</strong><ArrowRight size={19}/></button>)}</div><p className="fine">Tú eliges qué tarea coger; no hay reparto automático.</p>{offline&&<p className="fine">Sin conexión. Mostrando la última copia.</p>}</div></div>;

 const personId=selected.id;
 const active=board.tasks.filter(t=>t.active);
 const open=active.filter(t=>t.available&&!t.claimed_by);
 const mine=active.filter(t=>t.available&&t.claimed_by===person);
 const doneToday=board.completions.filter(c=>c.local_date===board.today&&(!board.scoreEpoch||c.completed_at>board.scoreEpoch));
 const teamTotal=board.totals.reduce((sum,row)=>sum+row.points,0);
 const myTotal=scoreFor(board.totals,personId);
 const myToday=board.todayPoints.find(s=>s.person_id===person)?.points||0;
 const shown=active.filter(t=>t.pool===pool);
 const free=shown.filter(t=>t.available&&!t.claimed_by);
 const reserved=shown.filter(t=>t.available&&t.claimed_by&&t.claimed_by!==person);
 const finished=shown.filter(t=>!t.available);
 const canWrite=!busy&&!offline;
 const coopReady=Boolean(board.coop?.missions?.length&&board.coop?.badges?.length&&board.coop?.rewards?.length&&board.coop?.plan&&board.coop?.keys&&board.coop?.fund&&board.coop?.fair&&board.coop?.monthly&&board.coop?.events&&board.coop?.redemptions);
 const earnedMissions=board.coop?.missions?.filter(m=>m.earned).length||0;
 const weekPercent=Math.round(earnedMissions/3*100);
 const recent=board.activity?.[0];
 const card=(task:Task)=><TaskCard key={task.id} task={task} board={board} person={personId} disabled={!canWrite} onAction={(t,a)=>void taskAction(t,a)}/>;

 return <div className="app-shell"><aside className={'sidebar '+(menu?'is-open':'')}><div className="brand"><span className="brand-icon">{board.coop?.selectedSticker?<StickerArt id={board.coop.selectedSticker.id} className="brand-sticker"/>:<Sparkles size={24}/>}</span><div>Hogar Encantado<span>UNA AVENTURA ENTRE DOS</span></div></div><div className="home-label"><span className="small-dot"/> Nuestro castillo<span className="fine">Una historia compartida</span></div><nav aria-label="Navegación principal"><button className={tab==='pools'?'active':''} onClick={()=>navigate('pools')}><House size={20}/>Inicio y tareas<span className="nav-count">{open.length}</span></button><button className={tab==='meals'?'active':''} onClick={()=>goToMeals()}><UtensilsCrossed size={20}/>Comidas y compra</button><button className={tab==='savings'?'active':''} onClick={()=>navigate('savings')}><Coins size={20}/>Economía y ahorro</button><button className={tab==='coop'?'active':''} onClick={()=>navigate('coop')}><Sparkles size={20}/>Misiones y premios</button><button className={tab==='activity'?'active':''} onClick={()=>navigate('activity')}><History size={20}/>Logros y actividad</button><button className={tab==='settings'?'active':''} onClick={()=>navigate('settings')}><Settings size={20}/>Organizar</button></nav><button className="sidebar-help" onClick={()=>{setShowOnboarding(true);setMenu(false);}}><BookOpen size={18}/> Cómo funciona <ArrowRight size={15}/></button><div className="sidebar-note"><img src="/mickey.png" alt=""/><p>La magia crece<br/>con cada gesto compartido.</p></div><button className="profile-switch" onClick={()=>{setShowOnboarding(false);setPerson(null);history.pushState({},'','/entrada');}}><span className="avatar" style={{background:selected.color}}>{selected.name[0]}</span><span><strong>{selected.name}</strong><small>Cambiar de persona</small></span><ChevronDown size={16}/></button></aside>
 <div className="workspace"><header className="topbar"><button className="mobile-menu" aria-label="Abrir menú" onClick={()=>setMenu(!menu)}><Menu size={22}/></button><span className="breadcrumb">Hogar Encantado <span>/</span> <strong>{tab==='pools'?'Inicio y tareas':tab==='meals'?'Comidas y compra':tab==='savings'?'Economía y ahorro':tab==='activity'?'Logros y actividad':tab==='coop'?'Misiones y premios':'Organizar'}</strong></span><span className="sync-status" role="status">{offline?<WifiOff size={15}/>:<span className="small-dot"/>}{offline?'Sin conexión':message||'Conectado a casa'}</span></header>
 <main className="pool-main">{offline&&<div className="notice"><WifiOff size={19}/>Mostrando la última copia. Conecta para guardar cambios.<button onClick={()=>void refresh()}>Reintentar</button></div>}{error&&<div className="notice error" role="alert">{error}<button onClick={()=>setError('')}>Cerrar</button></div>}
 {celebration&&<div className="celebration" role="status"><span className="celebration-icon"><Sparkles size={24}/></span><div><strong>{celebration.badge?`¡Logro desbloqueado: ${celebration.badge}!`:celebration.milestone?'¡Nuevo hito desbloqueado!':'¡La casa sigue creciendo!'}</strong><p>{celebration.title.startsWith('+')?'':`${celebration.title} · `}{celebration.points>0?`+${celebration.points} XP para el proyecto común.`:'Otro paso completado juntos.'}</p></div><button aria-label="Cerrar celebración" onClick={()=>setCelebration(null)}><X size={18}/></button></div>}
 {tab==='pools'&&<><div className="home-welcome"><CharacterBanner guide="mickey" eyebrow={dateText(board.today,{weekday:'long',day:'numeric',month:'long'}).toUpperCase()} title={`¡Bienvenido al castillo, ${selected.name}!`} description="Cada tarea elegida, comida casera y ahorro en común enciende un poco más vuestro hogar."/><div className="today-badge"><Sparkles size={17}/><strong>+{board.todayPoints.reduce((sum,row)=>sum+row.points,0)}</strong><span>XP entre los dos hoy</span></div></div>
 <ProjectCard board={board} onExplore={goToTasks}/>
 {board.gamification&&board.briefing&&<HomeOverview state={board.gamification} briefing={board.briefing} coop={coopReady?board.coop:undefined} onCoop={()=>navigate('coop')} openTasks={open.length} onNavigate={section=>section==='pools'?goToTasks():section==='shopping'?goToMeals('shopping'):section==='meals'?goToMeals():navigate(section)}/>}
 <div className="moment-strip"><div><Hand size={18}/><strong>{mine.length}</strong><span>en tus manos</span></div><div><Leaf size={18}/><strong>{open.length}</strong><span>libres para elegir</span></div><div><Check size={18}/><strong>{doneToday.length}</strong><span>hechas hoy</span></div></div>
 {mine.length>0&&<section className="my-claims"><div className="section-intro"><span className="eyebrow">TU SIGUIENTE PASO</span><h2>Las tienes en tus manos</h2><p>Puedes terminarlas o devolverlas a la pool. La reserva termina al acabar el día.</p></div><div className="pool-grid">{mine.map(card)}</div></section>}
 <section id="task-pools" className="task-pools-section"><CharacterBanner guide="cenicienta" eyebrow="CENICIENTA TE ACOMPAÑA" title="La magia está en cada gesto" description="Elige una tarea libre, hazla a tu ritmo y marca el momento en que quedó lista."/><div className="pool-heading"><div><span className="eyebrow">TÚ ELIGES CÓMO AYUDAR</span><h2>Encuentra tu próximo gesto</h2><p>Primero coge una tarea libre. Cuando termines, márcala como hecha para sumar XP al hogar.</p></div></div><div className="pool-tabs" role="tablist" aria-label="Frecuencia de tareas">{pools.map(p=><button key={p.id} id={`tab-${p.id}`} role="tab" aria-controls="pool-panel" aria-selected={pool===p.id} className={pool===p.id?'selected':''} onClick={()=>setPool(p.id)}><p.icon size={19}/><span>{p.title}</span><small>{active.filter(t=>t.pool===p.id&&t.available&&!t.claimed_by).length} libres</small></button>)}</div><div id="pool-panel" role="tabpanel" aria-labelledby={`tab-${pool}`}><div className="pool-section-heading"><div><h2>{pools.find(p=>p.id===pool)!.title}</h2><p>{pools.find(p=>p.id===pool)!.hint}</p></div><span>{free.length} para elegir</span></div>{free.length?<div className="pool-grid">{free.map(card)}</div>:<div className="empty"><Check size={25}/>{reserved.length?'Las tareas de esta pool están en manos de alguien.':'Esta pool está al día. Mira otra para seguir construyendo.'}</div>}{reserved.length>0&&<details className="finished-list"><summary><Hand size={18}/> En manos de otra persona ({reserved.length})</summary><div className="pool-grid">{reserved.map(card)}</div></details>}{finished.length>0&&<details className="finished-list"><summary><Check size={18}/> Hechas en este ciclo ({finished.length})</summary><div className="pool-grid">{finished.map(card)}</div></details>}</div></section>
 <section className="home-activity-peek"><div><span className="eyebrow">LO QUE HEMOS LOGRADO</span><h2>{recent?`${personName(board,recent.person_id)} registró ${recent.title.toLowerCase()}`:'La primera tarea nos espera'}</h2><p>{recent?`+${recent.points} XP para la casa · ${dateText(recent.local_date,{day:'numeric',month:'long'})}`:'Cuando alguien complete una tarea, aparecerá aquí nuestro primer avance.'}</p></div><button className="secondary" onClick={()=>navigate('activity')}>Ver actividad <ArrowRight size={16}/></button></section></>}
 {tab==='meals'&&<Meals actor={personId} disabled={!canWrite} write={write} initialSection={mealsFocus}/>}
 {tab==='savings'&&<Savings actor={personId} people={board.people} disabled={!canWrite} write={write} onMeals={()=>goToMeals()}/>}
 {tab==='coop'&&(board.coop&&coopReady?<Coop state={board.coop} tasks={board.tasks} actor={personId} disabled={!canWrite} write={write}/>:<CoopPreview retry={()=>void refresh()}/>) }
 {tab==='activity'&&<><div className="page-heading"><div><span className="eyebrow">UN CAMINO HECHO ENTRE LOS DOS</span><h1>Lo que hemos construido</h1><p>La XP reconoce lo que se ha hecho. Nadie pierde XP por dejar una tarea libre.</p></div></div><ProjectCard board={board} compact/><section className="activity-prize-link"><div><span className="eyebrow">PREMIOS POR DESCUBRIR</span><h2>Las llaves abren planes para los dos</h2><p>Conseguidlas en las misiones semanales y elegid juntos cuándo canjearlas.</p></div><button className="secondary" onClick={()=>navigate('coop')}>Ver misiones y premios <ArrowRight size={16}/></button></section>{board.coop&&coopReady?<AchievementGallery state={board.coop} disabled={!canWrite} onSelect={id=>void write('/api/coop/sticker',{actor:personId,badge_id:id},'Emblema actualizado')}/>:board.gamification&&<BadgeGallery badges={board.gamification.badges}/>}<div className="pool-score-grid"><section className="pool-score-card personal"><span className="eyebrow"><Heart size={16}/> TU APORTACIÓN</span><strong>{myTotal}</strong><p>{taskCount(board.totals,personId)} gestos registrados · {myToday} XP hoy</p><div className="score-track"><span style={{width:(myTotal%100)+'%'}}/></div><small>Tu actividad también impulsa el nivel compartido del hogar.</small></section><section className="pool-score-card"><span className="eyebrow"><Users size={16}/> TRES MISIONES JUNTOS</span><strong>{earnedMissions}/3</strong><p>{board.week.count} gestos · {board.week.points} XP esta semana</p><div className="score-track"><span style={{width:`${weekPercent}%`}}/></div><small>{earnedMissions===3?'¡Las tres llaves de la semana!':'Encontrad las siguientes pistas en Misiones y premios.'}</small></section></div><h2>Aportaciones al hogar</h2><div className="pool-people">{board.people.map(p=><div key={p.id}><span className="avatar" style={{background:p.color}}>{p.name[0]}</span><strong>{p.name}</strong><span>{taskCount(board.totals,p.id)} gestos</span><b>{scoreFor(board.totals,p.id)} XP</b></div>)}</div><h2>Últimos gestos del hogar</h2><div className="pool-history">{board.activity?.length?board.activity.map(c=><article key={c.id}><span className="history-event-icon"><Check size={18}/></span><div><strong>{c.title}</strong><p>{personName(board,c.person_id)} · {c.zone} · {dateText(c.local_date,{day:'numeric',month:'long',year:'numeric'})}</p></div><b>+{c.points}</b></article>):<div className="empty">Aún no hay gestos registrados. Elegid una tarea o planificad una comida.</div>}</div></>}
 {tab==='settings'&&<><div className="page-heading"><div><span className="eyebrow">UN PLAN QUE CAMBIA CON VOSOTROS</span><h1>Organizar las pools</h1><p>Ajusta las tareas y su frecuencia. Seguirán libres hasta que alguien decida cogerlas.</p></div></div><div className="pool-settings-note"><Clock size={20}/><span>Diarias: vuelven mañana · Cada 2–3 días: tras 3 días · Semanales: el lunes siguiente · Cada 4 semanas: tras 28 días.</span></div><button className="primary" disabled={!canWrite} onClick={()=>editTask()}><Plus size={17}/> Añadir tarea</button>{editId&&draft&&<form className="pool-editor" onSubmit={saveTask}><h2>{editId==='new'?'Nueva tarea':'Editar tarea'}</h2><label>Nombre<input required maxLength={200} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><div className="form-grid"><label>Zona<select value={draft.zone_id} onChange={e=>setDraft({...draft,zone_id:e.target.value})}>{board.zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label><label>Minutos orientativos<input type="number" min="1" max="480" value={draft.minutes} onChange={e=>setDraft({...draft,minutes:Number(e.target.value)})}/></label><label>Pool<select value={draft.pool} onChange={e=>setDraft({...draft,pool:e.target.value as Pool})}>{pools.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>Estado<select value={draft.active} onChange={e=>setDraft({...draft,active:Number(e.target.value) as 0|1})}><option value={1}>Activa</option><option value={0}>Desactivada</option></select></label></div><label>Pasos, uno por línea<textarea rows={4} value={draft.steps} onChange={e=>setDraft({...draft,steps:e.target.value})}/></label><div className="pool-editor-actions"><button type="button" className="secondary" onClick={()=>{setEditId(null);setDraft(null);}}>Cancelar</button><button className="primary" disabled={!canWrite}>Guardar tarea</button></div></form>}{pools.map(p=><section className="pool-settings-group" key={p.id}><h2>{p.title}</h2>{board.tasks.filter(t=>t.pool===p.id).map(t=><div className="pool-setting-row" key={t.id}><div><strong>{t.title}</strong><small>{t.zone}{!t.active?' · Desactivada':''}</small></div><button className="text-button" disabled={!canWrite} onClick={()=>editTask(t)}>Editar</button><label>Pool<select aria-label={`Pool de ${t.title}`} disabled={!canWrite} value={t.pool} onChange={e=>void write('/api/pool/category',{template_id:t.id,pool:e.target.value,actor:person},'Pool actualizada')}>{pools.map(option=><option key={option.id} value={option.id}>{option.title}</option>)}</select></label></div>)}</section>)}</>}
 </main><footer>Hogar Encantado <span>✦</span> Cada gesto construye nuestro castillo.</footer></div>{showOnboarding&&<Onboarding name={selected.name} onDone={finishOnboarding}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
