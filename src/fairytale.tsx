export type Guide='mickey'|'cenicienta'|'ratatouille'|'gilito';
export function scrollScene(selector:string){
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches||localStorage.getItem('casa-motion')==='reduced'||localStorage.getItem('casa-motion')==='none';
 document.querySelector<HTMLElement>(selector)?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
}
const guides:Record<Guide,{src:string;name:string;role:string}>={
 mickey:{src:'/mickey.png',name:'Mickey',role:'El anfitrión del hogar'},
 cenicienta:{src:'/cenicienta.png',name:'Cenicienta',role:'La guía de limpieza y orden'},
 ratatouille:{src:'/ratatouille.png',name:'Ratatouille',role:'El chef de comidas y compras'},
 gilito:{src:'/tio-gilito.png',name:'Tío Gilito',role:'El guardián del ahorro'}
};

export function CharacterBanner({guide,eyebrow,title,description,children}:{guide:Guide;eyebrow:string;title:string;description:string;children?:React.ReactNode}){
 const character=guides[guide];
 return <section className={`character-banner guide-${guide}`} aria-label={`${title}. ${character.name}: ${character.role}`}>
  <div className="character-banner-copy"><span className="eyebrow">✦ {eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
  {children&&<div className="character-banner-actions">{children}</div>}
  <div className="character-portrait"><span className="character-halo"/><img src={character.src} alt={character.name}/></div>
  <span className="character-spark character-spark-one" aria-hidden="true">✦</span><span className="character-spark character-spark-two" aria-hidden="true">✧</span>
 </section>;
}

const memeArt:Record<string,string>={
 joint_first:'01_primera_victoria.png',first_clean:'01_primera_victoria.png',return:'01_primera_victoria.png',
 week_resolved:'02_semana_resuelta.png',delivery_pause:'02_semana_resuelta.png',tuppers:'02_semana_resuelta.png',recipe_collection:'02_semana_resuelta.png',fridge:'02_semana_resuelta.png',first_meal:'02_semana_resuelta.png',first_delivery:'02_semana_resuelta.png',smart_shopping:'02_semana_resuelta.png',
 first_saving:'03_primer_ladrillo.png',goal_25:'03_primer_ladrillo.png',goal_50:'03_primer_ladrillo.png',goal_75:'03_primer_ladrillo.png',goal_protected:'03_primer_ladrillo.png',
 team_mode:'04_modo_cooperativo.png',team_review:'04_modo_cooperativo.png',fair_load:'04_modo_cooperativo.png',balanced:'04_modo_cooperativo.png',
 home_control:'05_casa_bajo_control.png',bathrooms:'05_casa_bajo_control.png',boss:'05_casa_bajo_control.png',maintenance:'05_casa_bajo_control.png',streak:'05_casa_bajo_control.png',
 goal_100:'06_viaje_preparado.png',travel:'06_viaje_preparado.png'
};

export function StickerArt({id,className=''}:{id:string;className?:string}){
 if(id.startsWith('secret_'))return <span className={`sticker-art secret-sticker ${className}`} aria-hidden="true">?</span>;
 const file=memeArt[id];
 if(!file)return <span className={`sticker-art sticker-fallback ${className}`} aria-hidden="true">✦</span>;
 return <img className={`sticker-art meme-sticker ${className}`} src={`/stickers/memes/${file}`} alt="" aria-hidden="true" loading="lazy" decoding="async"/>;
}

export function CastleArt({totalXP}:{totalXP:number}){
 const stage=Math.min(4,Math.floor(Math.max(0,totalXP)/125));
 const names=['Cimientos','Paredes y torres','Tejados','Luces del castillo'];
 const files=['01_cimientos.png','02_paredes.png','03_tejados.png','04_iluminacion.png'];
 return <div className={`castle-art castle-stage-${stage}`} role="img" aria-label={stage===4?'Castillo iluminado, cuatro fases construidas':`El castillo final se ve oscurecido. ${stage} de 4 fases construidas. Próxima fase: ${names[stage]}.`}>
  <div className="castle-moon"/><div className="castle-hill"/>
  <div className="castle-future" aria-hidden="true">{files.map((file)=><img key={file} className="castle-layer" src={`/castillo/${file}`} alt=""/>)}</div>
  {files.map((file,index)=><img key={file} className={`castle-layer ${stage>index?'is-visible':''}`} src={`/castillo/${file}`} alt="" aria-hidden="true" title={names[index]}/>)}
  <div className="castle-stars" aria-hidden="true">✦ <span>✧</span> ✦</div>
  <span className="castle-caption">{stage===4?'✦ Castillo iluminado · 4/4':`${stage}/4 fases · siguiente: ${names[stage]}`}</span>
 </div>;
}
