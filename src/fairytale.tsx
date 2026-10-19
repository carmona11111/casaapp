import type {CSSProperties} from 'react';

export type Guide='mickey'|'cenicienta'|'ratatouille'|'gilito';
const guides:Record<Guide,{src:string;name:string;role:string}>={
 mickey:{src:'/mickey.png',name:'Mickey',role:'El anfitrión del hogar'},
 cenicienta:{src:'/cenicienta.png',name:'Cenicienta',role:'La guía de limpieza y orden'},
 ratatouille:{src:'/ratatouille.png',name:'Ratatouille',role:'El chef de comidas y compras'},
 gilito:{src:'/tio-gilito.png',name:'Tío Gilito',role:'El guardián del ahorro'}
};

export function CharacterBanner({guide,eyebrow,title,description,children}:{guide:Guide;eyebrow:string;title:string;description:string;children?:React.ReactNode}){
 const character=guides[guide];
 return <section className={`character-banner guide-${guide}`} aria-label={`${title}. ${character.name}: ${character.role}`}>
  <div className="character-banner-copy"><span className="eyebrow">✦ {eyebrow}</span><h1>{title}</h1><p>{description}</p>{children}</div>
  <div className="character-portrait"><span className="character-halo"/><img src={character.src} alt={character.name}/></div>
  <span className="character-spark character-spark-one" aria-hidden="true">✦</span><span className="character-spark character-spark-two" aria-hidden="true">✧</span>
 </section>;
}

// The uploaded sheet contains four columns and three rows. Several achievements
// share an illustration, while their names and unlock rules stay distinct.
const art:Record<string,number>={
 joint_first:0,home_control:0,bathrooms:1,boss:2,maintenance:3,
 delivery_pause:4,week_resolved:4,tuppers:5,recipe_collection:6,fridge:7,
 first_saving:8,goal_25:8,goal_50:9,goal_75:9,goal_100:9,
 smart_shopping:9,team_mode:10,team_review:10,fair_load:10,
 goal_protected:9,return:11,
 first_clean:0,first_meal:4,first_delivery:7,streak:11,balanced:10,travel:9
};

export function StickerArt({id,className=''}:{id:string;className?:string}){
 const index=art[id];
 if(index===undefined)return <span className={`sticker-art sticker-fallback ${className}`} aria-hidden="true">✦</span>;
 const style:CSSProperties={backgroundPosition:`${(index%4)*100/3}% ${Math.floor(index/4)*50}%`};
 return <span className={`sticker-art ${className}`} style={style} aria-hidden="true"/>;
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
