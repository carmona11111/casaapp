export type Person={id:string;household_id:'home';name:string;color:string;active:1};
export type Zone={id:string;household_id:'home';name:string};
export type Recurrence={kind:'daily'|'weekly';day?:number;interval?:number;offset?:number;zoneRotation?:string[]};
export type Template={id:string;household_id:'home';title:string;steps:string[];zone_id:string;minutes:number;recurrence:Recurrence;block:'A'|'B';person_id:string|null;effective_date:string;active:0|1;pet:0|1};
export type Snapshot={title:string;steps:string[];zone_id:string;zone:string;minutes:number;kind:'daily'|'weekly'};
export type Occurrence={id:string;template_id:string;household_id:'home';original_date:string;scheduled_date:string;original_person:string;current_person:string;status:'open'|'done'|'skipped'|'covered'|'cancelled';version:number;snapshot:Snapshot;completed_by:string|null;completed_at:string|null;covered_by:string|null};
export type House={id:'home';name:string;timezone:'Europe/Madrid';base_date:string;rotation:0|1;revision:number};
export type Plan={house:House;people:Person[];zones:Zone[];templates:Template[]};
export type State=Plan&{today:string;serverTime:string;entryUrl:string;production:boolean;occurrences:Occurrence[];absences:{id:string;person_id:string;start:string;end:string;confirmed:0|1;exceptions:{id:string;version:number}[]}[]};
export type HistoryEvent={id:string;occurrence_id:string|null;action:string;actor:string;at:string;changes:{before?:Occurrence;after?:Partial<Occurrence>;reason?:string;[key:string]:unknown}};
export type Write=(path:string,data:unknown)=>Promise<boolean>;
export const dateText=(s:string,options:Intl.DateTimeFormatOptions={day:'numeric',month:'short'})=>new Intl.DateTimeFormat('es-ES',{...options,timeZone:'Europe/Madrid'}).format(new Date(s+'T12:00:00Z'));
export const plusDays=(s:string,n:number)=>new Date(Date.parse(s+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export const monday=(s:string)=>plusDays(s,-((new Date(s+'T12:00:00Z').getUTCDay()+6)%7));
export const todayLocal=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function groups(rows:Occurrence[]){const result=new Map<string,Occurrence[]>();for(const row of rows){const key=row.status==='open'?row.template_id:row.id;result.set(key,[...(result.get(key)||[]),row]);}return [...result.values()].map(rows=>rows.sort((a,b)=>b.original_date.localeCompare(a.original_date)));}
export async function api(path:string,init?:RequestInit){let response:Response;try{response=await fetch(path,{credentials:'same-origin',...init,headers:{'Content-Type':'application/json','X-Casa-Request':'1',...init?.headers}});}catch{throw Object.assign(new Error('No hay conexión con el servidor. El cambio no está confirmado.'),{status:0});}const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'No se pudo completar la petición.'),{status:response.status});return data;}
