import {useEffect,useRef,type KeyboardEvent} from 'react';
import {ArrowRight,Sparkles,X} from 'lucide-react';

export type ReminderKind='tasks'|'savings'|'cooking';

export function ReminderDialog({kind,name,reason,onClose,onTasks,onMeals}:{kind:ReminderKind;name:string;reason?:'late'|'order';onClose:()=>void;onTasks:()=>void;onMeals:()=>void}){
 const dialog=useRef<HTMLDivElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeButton.current?.focus();
  return()=>{document.body.style.overflow=overflow;previous?.focus();};
 },[]);
 function handleKey(event:KeyboardEvent){
  if(event.key==='Escape'){event.preventDefault();onClose();return;}
  if(event.key!=='Tab'||!dialog.current)return;
  const buttons=[...dialog.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  if(!buttons.length)return;
  if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons[buttons.length-1].focus();}
  else if(!event.shiftKey&&document.activeElement===buttons[buttons.length-1]){event.preventDefault();buttons[0].focus();}
 }
 const tasks=kind==='tasks';
 const cooking=kind==='cooking';
 return <div className="reminder-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div className={'reminder-dialog '+(tasks?'reminder-tasks':cooking?'reminder-cooking':'reminder-savings')} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="reminder-title" aria-describedby="reminder-description" onKeyDown={handleKey}>
   <button ref={closeButton} className="reminder-close" aria-label="Cerrar recordatorio" onClick={onClose}><X size={20}/></button>
   <div className="reminder-art"><img src={tasks?'/tareas.jpg':cooking?'/images%20(3).jpg':'/images%20(2).jpg'} alt={tasks?'Una escena de Cenicienta con un gato descansando':cooking?'Escena divertida de cocina con una cocinera sorprendida':'Cenicienta y el Hada Madrina imaginan un viaje juntas'}/></div>
   <div className="reminder-copy"><span className="reminder-kicker"><Sparkles size={16}/>{tasks?'UN NUEVO DÍA EN EL CASTILLO':cooking?'RATATOUILLE TE ACOMPAÑA':'NUESTRO PRÓXIMO VIAJE'}</span>
    <h2 id="reminder-title">{tasks?`El castillo te echó de menos, ${name}`:cooking?'La cocina sigue esperando':'La magia también se ahorra'}</h2>
    <p id="reminder-description">{tasks?'Ayer no registraste ninguna tarea. Los habitantes del castillo se quedaron un poquito tristes, pero hoy cualquier gesto que elijas puede devolverles la sonrisa.':cooking?reason==='order'?'Habéis registrado un pedido. Cuando os apetezca cocinar, vuestro plan y las recetas siguen aquí para daros ideas.':'Una receta del plan lleva al menos tres días sin marcarse como cocinada. Si la preparasteis, podéis registrarlo; si no, elegid cuándo retomarla.':'Ese viaje que imagináis empieza con las decisiones pequeñas de hoy. Cada gasto consciente y cada euro guardado acerca un poco más la próxima aventura.'}</p>
    <p className="reminder-note">{tasks?'Sin prisas ni tareas asignadas: tú decides por dónde empezar.':cooking?'Sin culpa ni prisas: el menú se adapta a vuestro ritmo.':'Vuestros objetivos de 1.000 €, 3.000 € y 10.000 € os esperan aquí.'}</p>
    <div className="reminder-actions"><button className="reminder-secondary" onClick={onClose}>{tasks?'Ahora no':cooking?'Cerrar':'Ver economía'}</button>{tasks?<button className="reminder-primary" onClick={onTasks}>Elegir una tarea <ArrowRight size={17}/></button>:cooking&&<button className="reminder-primary" onClick={onMeals}>Ver el plan <ArrowRight size={17}/></button>}</div>
   </div>
  </div>
 </div>;
}
