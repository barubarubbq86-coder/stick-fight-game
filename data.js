export const characterData=[
{name:'ノーマル',hp:100,damage:[10],weapon:'punch',range:30,interval:.8},
{name:'ハンマー',hp:100,damage:[30],weapon:'hammer',range:40,interval:1},
{name:'二ハンマー流',hp:100,damage:[30,30],weapon:'hammer',range:40,interval:1},
{name:'剣',hp:100,damage:[35],weapon:'sword',range:45,interval:.85},
{name:'二刀流',hp:100,damage:[35,35],weapon:'sword',range:45,interval:.85},
{name:'ハンマー＆剣',hp:100,damage:[30,35],weapon:'mixed',range:45,interval:.9},
{name:'2頭人間',hp:100,damage:[10],weapon:'punch',heads:2,range:30,interval:.8},
{name:'3頭人間',hp:100,damage:[10],weapon:'punch',heads:3,range:30,interval:.8},
{name:'水能力',hp:55,damage:[20],weapon:'water',range:240,interval:1.4,specialChance:.1,specialDamage:300},
{name:'火能力',hp:125,damage:[75],weapon:'fire',range:240,interval:1.5,specialChance:.35,specialDamage:315},
...[1,2,3,4,5].map(n=>({name:n===1?'槍':`槍${n}つ`,hp:90,damage:Array(n).fill(35),weapon:'spear',range:310,interval:1.5})),
{name:'全槍',hp:90,damage:[35],weapon:'allSpear',range:Infinity,interval:1.6},
{name:'刀',hp:100,damage:[540],weapon:'katana',range:Infinity,interval:1.5},
{name:'神',hp:100,damage:[540,3680,1320],weapon:'god',range:Infinity,interval:2,immune:true},
{name:'マッスル',hp:300,damage:[50],weapon:'muscle',range:55,interval:1.8,modelType:'muscle',size:1.65,radius:.65}
];

characterData.forEach(c=>{c.range=Number.isFinite(c.range)?c.range/25:Infinity;c.interval=Math.max(1.2,c.interval*1.7);c.speed=c.weapon==='muscle'?2.2:2.8;c.radius=c.radius||.28;c.size=c.size||1;c.modelType=c.modelType||'stick';c.aiType=c.range>4?'ranged':'melee';c.windup=c.weapon==='god'?1.4:c.range===Infinity?1.1:.45;});
