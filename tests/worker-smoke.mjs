import { Miniflare } from 'miniflare';
import { readFile, readdir } from 'node:fs/promises';
const paths=(await readdir('dist/server',{recursive:true})).filter(p=>p.endsWith('.js')).sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
const mf = new Miniflare({ modules: paths.map(p=>({type:'ESModule',path:'dist/server/'+p})), modulesRoot:'dist/server', compatibilityDate:'2026-05-15', compatibilityFlags:['nodejs_compat'], d1Databases:['DB'] });
try { const db=await mf.getD1Database('DB'); await db.prepare(await readFile('drizzle/0000_shiny_next_avengers.sql','utf8')).run();
const src=await readFile('tests/api-smoke.mjs','utf8');
const script=src.replace("import assert from 'node:assert/strict';",'').replaceAll('fetch(', 'dispatch(');
const run=new Function('assert','dispatch', 'return (async()=>{'+script+'})()');
await run((await import('node:assert/strict')).default,(...args)=>mf.dispatchFetch(...args));
} finally {await mf.dispose();}

