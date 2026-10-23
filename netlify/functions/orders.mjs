import {getStore} from '@netlify/blobs';
import {secret,authorized,sameOrigin,reply,withCors} from '../../server/auth.mjs';
import {mutate} from '../../server/orders.mjs';
const handler=async function(req){
 try {
 let key;try{key=secret()}catch(e){return reply({error:e.message},503)}if(key&&!authorized(req,key))return reply({error:'سجّل الدخول'},401);
 if(!sameOrigin(req))return reply({error:'Forbidden'},403);
 const store=getStore({name:'office-orders-v1',consistency:'strong'});
 if(req.method==='GET')return reply(await store.get('queue',{type:'json'})||[]);
 if(!['POST','PATCH'].includes(req.method))return reply({error:'Method not allowed'},405);
 let b;try {b=await req.json()}catch{return reply({error:'طلب غير صالح'},400)}
 const result=await mutate(store,req.method,b);
 return result.error?reply({error:result.error},result.status):reply({ok:true});
 }catch(e){console.error('Order storage request failed:',e.name);return reply({error:'تعذر الوصول لخدمة الطلبات. راجع إعدادات Netlify والاتصال.'},503)}
}

export default withCors(handler);
