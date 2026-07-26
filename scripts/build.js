import { cp, mkdir, rm } from 'node:fs/promises';
const folders=['live','control','shared'];
await rm('dist',{recursive:true,force:true}); await mkdir('dist');
for(const folder of folders) await cp(folder,`dist/${folder}`,{recursive:true});
for(const file of ['index.html','config.js','vercel.json']) await cp(file,`dist/${file}`);
console.log('Static production bundle written to dist/');
