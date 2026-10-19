export const PROJECT_SIZE=500;
export const MILESTONE_SIZE=125;

export const steps=[
 {title:'Cimientos',verb:'poner los cimientos'},
 {title:'Paredes',verb:'levantar las paredes'},
 {title:'Tejado',verb:'colocar el tejado'},
 {title:'Luz',verb:'encender la luz'}
] as const;

export function projectProgress(totalPoints:number){
 const total=Math.max(0,totalPoints);
 const completedProjects=Math.floor(total/PROJECT_SIZE);
 const points=total%PROJECT_SIZE;
 const stage=Math.floor(points/MILESTONE_SIZE);
 const remaining=MILESTONE_SIZE-points%MILESTONE_SIZE;
 return {
  completedProjects,
  points,
  stage,
  remaining,
  percent:Math.round(points/PROJECT_SIZE*100),
  next:steps[stage],
  title:completedProjects===0?'Nuestro primer castillo':`Una nueva estancia · ${completedProjects+1}`
 };
}
