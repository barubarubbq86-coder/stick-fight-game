export const teamData=[
 {name:'A',label:'青',color:[.08,.42,.79]},
 {name:'B',label:'赤',color:[.87,.16,.27]},
 {name:'C',label:'緑',color:[.12,.62,.32]},
 {name:'D',label:'紫',color:[.62,.28,.82]}
];
export const teamIds=teamData.map((_,i)=>i);
export const teamLabel=t=>`TEAM ${teamData[t].name}（${teamData[t].label}）`;
export function normalizeMultipliers(values){return teamIds.map(t=>Object.fromEntries(['hp','attack','speed'].map(key=>{const value=values?.[t]?.[key]??1;if(!Number.isFinite(value)||value<.1||value>10)throw Error('陣営倍率は0.1〜10の範囲で入力してください。');return [key,value];})));}
