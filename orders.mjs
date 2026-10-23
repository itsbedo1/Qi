const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export function change(rows,method,b,now=Date.now()){
 if(!b||!validId(b.id))return {error:'طلب غير صالح',status:400};
 if(method==='POST'){
  if(!Number.isSafeInteger(b.amount)||b.amount<1||b.amount>100000000||!['zain','rafidain'].includes(b.kind))return {error:'راجع المبلغ والنوع',status:400};
  const existing=rows.find(o=>o.id===b.id);
  if(existing)return existing.amount===b.amount&&existing.kind===b.kind?{rows,unchanged:true}:{error:'رقم الطلب مستخدم',status:409};
  if(rows.filter(o=>o.status==='pending').length>=1000)return {error:'أكمل الطلبات المعلقة أولاً',status:409};
  rows=[{id:b.id,amount:b.amount,kind:b.kind,status:'pending',createdAt:now},...rows];
 }else if(method==='PATCH'){
  if(!['done','cancelled'].includes(b.status))return {error:'حالة غير صالحة',status:400};
  const old=rows.find(o=>o.id===b.id);
  if(!old||old.status!=='pending')return {error:'هذا الطلب تم تحديثه مسبقاً. حدّث القائمة.',status:409};
  rows=rows.map(o=>o.id===b.id?{...o,status:b.status,completedAt:now}:o);
 }else return {error:'Method not allowed',status:405};
 // Never drop pending orders; retain the latest 1,000 completed/cancelled records.
 return {rows:[...rows.filter(o=>o.status==='pending'),...rows.filter(o=>o.status!=='pending').sort((a,b)=>b.createdAt-a.createdAt).slice(0,1000)].sort((a,b)=>b.createdAt-a.createdAt)};
}
export async function mutate(store,method,b){
 for(let attempt=0;attempt<5;attempt++){
  const snapshot=await store.getWithMetadata('queue',{type:'json'});
  const result=change(snapshot?.data||[],method,b);
  if(result.error||result.unchanged)return result;
  const write=await store.setJSON('queue',result.rows,snapshot?{onlyIfMatch:snapshot.etag}:{onlyIfNew:true});
  if(write.modified)return result;
 }
 return {error:'وصل تحديث بنفس الوقت. جرّب مرة ثانية.',status:409};
}
