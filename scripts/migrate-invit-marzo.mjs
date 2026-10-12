#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const SLUG = "invitaciones-marzo-2026";
const TAGS = [
  { name: "invitaciones", slug: "invitaciones" },
  { name: "eventos", slug: "eventos" },
  { name: "area-norte", slug: "area-norte" },
];
const BLOG_MD = path.join(root, "src/blog/invitaciones-marzo-2026.md");

const API_SUPERUSER_AUTH = "/api/collections/_superusers/auth-with-password";
const API_TAGS = "/api/collections/tags/records";
const API_POSTS = "/api/collections/posts/records";

function getArg(flag){const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:null;}
const APPLY=process.argv.includes("--apply");
const BASE_URL=getArg("--base-url")||process.env.PB_URL;
function reqEnv(n){const v=process.env[n];if(!v)throw new Error(n);return v;}

async function req(b,p,{method='GET',token,body,isForm=false}={}){
  const url=b.replace(/\/+$/,'')+p;
  const h={Accept:'application/json'}; if(token) h.Authorization=token; if(!isForm) h['Content-Type']='application/json';
  const r=await fetch(url,{method,headers:h,body:body?(isForm?body:JSON.stringify(body)):undefined});
  const t=await r.text().catch(()=>'' ); let d=null; try{d=t?JSON.parse(t):null}catch{d=t}
  if(!r.ok){const m=d&&typeof d==='object'&&'message'in d?d.message:t||r.statusText; throw new Error(m);}
  return d;
}
function readMd(x){const raw=fs.readFileSync(x,'utf8'); const parts=raw.split(/^---$/m); const fm=parts.length>=3?parts[1]:''; const body=parts.length>=3?parts.slice(2).join('---'):raw;
  return {body:body.trim(), title:(fm.match(/title:\s*"([^"]+)"/)?.[1]||''), pubDate:(fm.match(/pubDate:\s*([\d-]+)/)?.[1]||''), author:(fm.match(/author:\s*"([^"]+)"/)?.[1]||''), description:(fm.match(/description:\s*"([^"]+)"/)?.[1]||'')};}
async function main(){
  const b=BASE_URL||'https://na-area-norte-production.up.railway.app';
  const email=reqEnv('PB_SUPERUSER_EMAIL'); const pass=reqEnv('PB_SUPERUSER_PASSWORD');
  const auth=await req(b,API_SUPERUSER_AUTH,{method:'POST',body:{identity:email,password:pass}}); const token=auth.token;
  const tm=new Map();
  for(const t of TAGS){ const ex=await req(b,`${API_TAGS}?filter=(slug='${t.slug}')&perPage=1`,{token}); if(ex.items?.[0]) tm.set(t.slug,ex.items[0].id); else if(APPLY){ const c=await req(b,API_TAGS,{method:'POST',token,body:{name:t.name,slug:t.slug}}); tm.set(t.slug,c.id);} }
  const tids=TAGS.map(t=>tm.get(t.slug)).filter(Boolean);
  const md=readMd(BLOG_MD); const exP=await req(b,`${API_POSTS}?filter=(slug='${SLUG}')&perPage=1`,{token}); if(exP.items?.[0]){console.log('exists');return;}
  const form=new FormData();
  form.append('slug',SLUG); form.append('title',md.title); form.append('description',md.description); form.append('author',md.author); form.append('pubDate',md.pubDate); form.append('body',md.body); form.append('status','published');
  tids.forEach(id=>form.append('tags',id));
  const cr=await fetch(b.replace(/\/+$/,'')+API_POSTS,{method:'POST',headers:{Authorization:token},body:form});
  if(!cr.ok) throw new Error(await cr.text()); console.log('ok',(await cr.json()).id);
}
main().catch(e=>{console.error(e);process.exit(1);});
