const pool=require('../src/db/pool');const {enqueue}=require('../src/services/jobService');
const posts=[
 {title:'Red foxes in woodland habitats',content:'Red foxes are adaptable mammals with orange-red coats, pointed ears and bushy tails. They live in forests and woodland edges.',category:'animal',subject:'red fox'},
 {title:'How gray wolves hunt in packs',content:'Gray wolves are social wild canids with gray coats. They coordinate pack hunting and communicate through howls.',category:'animal',subject:'gray wolf'},
 {title:'Domestic dogs and their behavior',content:'Domestic dogs are companion animals with varied breeds, coats and behavior. Dogs are closely associated with people.',category:'animal',subject:'domestic dog'},
 {title:'Brown bears in the wild',content:'Brown bears are large mammals with powerful bodies, thick brown fur and a strong sense of smell.',category:'animal',subject:'brown bear'},
 {title:'Deer living in forest clearings',content:'Deer are hoofed mammals. Many males grow antlers and browse on leaves, grass and shrubs.',category:'animal',subject:'deer'},
 {title:'Fresh strawberries in summer',content:'Strawberries are bright red fruits with tiny seeds on the outside and a sweet juicy interior.',category:'food',subject:'strawberry'},
 {title:'Classic red sports car design',content:'A red sports car with a low aerodynamic body, wheels and sleek automotive styling.',category:'vehicle',subject:'sports car'},
 {title:'Mountain landscape at sunrise',content:'A natural mountain landscape with rocky peaks, distant ridges and warm sunrise light.',category:'nature',subject:'mountain'},
 {title:'Red fox habitat and adaptation',content:'The red fox is a small wild canid with a reddish coat, pointed ears and a long bushy tail.',category:'animal',subject:'red fox'},
 {title:'Wolves and wild canid conservation',content:'Gray wolves are large wild canids with thick fur, long legs and pack social behavior.',category:'animal',subject:'gray wolf'}
];
(async()=>{try{for(const p of posts){const {rows}=await pool.query(`INSERT INTO posts(title,content,expected_category,expected_subject) SELECT $1,$2,$3,$4 WHERE NOT EXISTS(SELECT 1 FROM posts WHERE title=$1) RETURNING id`,[p.title,p.content,p.category,p.subject]);if(rows[0])console.log('Seeded post:',p.title);}console.log('Posts seeded. Add image URLs through POST /api/images; image jobs are processed by the worker.');}catch(e){console.error(e);process.exitCode=1;}finally{await pool.end();}})();
