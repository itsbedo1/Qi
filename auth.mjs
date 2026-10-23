import {createHmac,timingSafeEqual} from 'node:crypto';
export const reply=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export function secret(){const value=process.env.OFFICE_PASSWORD;if(!value)return null;if(value.length<16)throw Error('OFFICE_PASSWORD لازم يكون 16 حرفاً على الأقل، أو احذفه.');return value}
const digest=(s,key)=>createHmac('sha256',key).update(s).digest('hex');
export function equal(a,b){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)}
export function token(key,now=Date.now()){const exp=String(now+12*60*60*1000);return exp+'.'+digest(exp,key)}
export function authorized(req,key,now=Date.now()) {const value=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!value)return false;const [exp,sig]=value.split('.');return /^\d+$/.test(exp)&&Number(exp)>now&&Number(exp)<=now+12*60*60*1000&&equal(sig||'',digest(exp,key))}
export function sameOrigin(req){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin||origin===process.env.EMPLOYEE_ORIGIN}

export function withCors(handler){return async req=>{
 if(!sameOrigin(req))return reply({error:'Forbidden'},403);
 const origin=req.headers.get('origin');
 const cors={'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'};
 if(origin)cors['Access-Control-Allow-Origin']=origin;
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const response=await handler(req);for(const [k,v] of Object.entries(cors))response.headers.set(k,v);return response;
}}
