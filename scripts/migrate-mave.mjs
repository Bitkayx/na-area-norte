#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const SLUG = "mave-2026";
const TAGS = [
  { name: "mave", slug: "mave" },
  { name: "eventos", slug: "eventos" },
];
const BLOG_MD = path.join(root, "src/blog/mave-2026.md");
const COVER_LOCAL = path.join(root, "src/assets/blog/compartimientos/eventos/MAVE.png");

const API_SUPERUSER_AUTH = "/api/collections/_superusers/auth-with-password";
const API_TAGS = "/api/collections/tags/records";
const API_POSTS = "/api/collections/posts/records";

function getArg(flag) { const idx = process.argv.indexOf(flag); return idx>=0?process.argv[idx+1]:null; }
const APPLY = process.argv.includes("--apply");
const BASE_URL = getArg("--base-url") || process.env.PB_URL;
function requireEnv(n){ const v=process.env[n]; if(!v) throw new Error(n); return v; }

async function request(baseUrl,path,{method='GET',token,body,isForm=false}={}) {
  const url = baseUrl.replace(/\/+$/,'')+path;
  const headers={Accept:'application/json'}; if(token) headers.Authorization=token;
  if(!isForm) headers['Content-Type']='application/json';
  const res=await fetch(url,{method,headers,body:body?(isForm?body:JSON.stringify(body)):undefined});
  const text=await res.text().catch(()=>'' ); let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok){ const msg=data&&typeof data==='object'&&'message'in data?data.message:text||res.statusText; throw new Error(msg); }
  return data;
}

function readMd(p){
  const raw=fs.readFileSync(p,'utf8'); const parts=raw.split(/^---$/m); const fm=parts.length>=3?parts[1]:'';
  const body=parts.length>=3?parts.slice(2).join('---'):raw;
  const title=fm.match(/title:\s*"([^"]+)"/)?.[1]||''; const pubDate=fm.match(/pubDate:\s*([\d-]+)/)?.[1]||'';
  const author=fm.match(/author:\s*"([^"]+)"/)?.[1]||''; const description=fm.match(/description:\s*"([^"]+)"/)?.[1]||'';
  return {body:body.trim(),title,pubDate,author,description};
}

async function main(){
  const baseUrl=BASE_URL||'https://na-area-norte-production.up.railway.app';
  const email=requireEnv('PB_SUPERUSER_EMAIL'); const pass=requireEnv('PB_SUPERUSER_PASSWORD');
  const auth=await request(baseUrl,API_SUPERUSER_AUTH,{method:'POST',body:{identity:email,password:pass}});
  const token=auth.token;
  const tagsMap=new Map();
  for(const t of TAGS){
    const ex=await request(baseUrl,`${API_TAGS}?filter=(slug='${t.slug}')&perPage=1`,{token});
    if(ex.items?.[0]) tagsMap.set(t.slug,ex.items[0].id);
    else if(APPLY){ const c=await request(baseUrl,API_TAGS,{method:'POST',token,body:{name:t.name,slug:t.slug}}); tagsMap.set(t.slug,c.id); }
  }
  const tagIds=TAGS.map(t=>tagsMap.get(t.slug)).filter(Boolean);
  const md=readMd(BLOG_MD);
  const exP=await request(baseUrl,`${API_POSTS}?filter=(slug='${SLUG}')&perPage=1`,{token});
  if(exP.items?.[0]){ console.log('exists'); return; }
  const form=new FormData();
  if(fs.existsSync(COVER_LOCAL)){ const buf=fs.readFileSync(COVER_LOCAL); form.append('cover', new Blob([buf],{type:'image/png'}), path.basename(COVER_LOCAL)); }
  form.append('slug',SLUG); form.append('title',md.title); form.append('description',md.description); form.append('author',md.author);
  form.append('pubDate',md.pubDate); form.append('body',md.body); form.append('status','published');
  tagIds.forEach(id=>form.append('tags',id));
  const created=await fetch(baseUrl.replace(/\/+$/,'')+API_POSTS,{method:'POST',headers:{Authorization:token},body:form});
  if(!created.ok){ throw new Error(await created.text()); }
  console.log('ok', (await created.json()).id);
}

main().catch(e=>{console.error(e);process.exit(1);});
