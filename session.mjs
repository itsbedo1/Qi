import {secret,equal,token,sameOrigin,reply,withCors} from '../../server/auth.mjs';
const handler=async function(req){
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!sameOrigin(req))return reply({error:'Forbidden'},403);
 try {const key=secret();if(!key)return reply({ok:true,token:'open'});let b;try{b=await req.json()}catch{return reply({error:'طلب غير صالح'},400)}
 if(typeof b?.password!=='string'||!equal(b.password,key))return reply({error:'كلمة المرور غير صحيحة'},401);
 return reply({ok:true,token:token(key)});
 }catch(e){return reply({error:e.message},503)}
}
export const config={rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};

export default withCors(handler);
