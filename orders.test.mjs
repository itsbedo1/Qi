import {test} from 'node:test';
import assert from 'node:assert/strict';
import {change,mutate} from '../server/orders.mjs';
import {token,authorized,sameOrigin,withCors} from '../server/auth.mjs';
const id='00000000-0000-4000-8000-000000000001';
const b={id,amount:50000,kind:'rafidain'};
test('create, retry, complete and prevent repeated completion',()=>{const r=change([],'POST',b);assert.equal(r.rows.length,1);assert.equal(change(r.rows,'POST',b).unchanged,true);const done=change(r.rows,'PATCH',{id,status:'done'});assert.equal(done.rows[0].status,'done');assert.equal(change(done.rows,'PATCH',{id,status:'cancelled'}).status,409)});
test('reject invalid amounts and types',()=>{for(const amount of [0,-1,1.5,100000001,'50000'])assert.equal(change([],'POST',{...b,amount}).status,400);assert.equal(change([],'POST',{...b,kind:'cash'}).status,400)});
test('CAS retry preserves a concurrent order',async()=>{let snapshot=null,attempt=0;const store={getWithMetadata:async()=>snapshot,setJSON:async(k,rows)=>{if(attempt++===0){snapshot={data:[{...b,id:'00000000-0000-4000-8000-000000000002',createdAt:1,status:'pending'}],etag:'1'};return {modified:false}}snapshot={data:rows,etag:'2'};return {modified:true}}};await mutate(store,'POST',b);assert.equal(snapshot.data.length,2)});
test('session expiry and forgery rejected',()=>{const key='test-password-not-production',now=1000000,t=token(key,now);const request=x=>new Request('https://office.test/api/orders',{headers:{authorization:'Bearer '+x}});assert.equal(authorized(request(t),key,now+1),true);assert.equal(authorized(request(t+'bad'),key,now+1),false);assert.equal(authorized(request(t),key,now+13*60*60*1000),false);assert.equal(sameOrigin(new Request('https://office.test/api/orders',{headers:{origin:'https://other.test'}})),false)});

test('cross-site preflight permits only configured employee site',async()=>{
 process.env.EMPLOYEE_ORIGIN='https://employee.example';
 const handler=withCors(()=>Response.json({ok:true}));
 const good=await handler(new Request('https://cashier.example/api/orders',{method:'OPTIONS',headers:{origin:'https://employee.example'}}));
 assert.equal(good.status,204);assert.equal(good.headers.get('access-control-allow-origin'),'https://employee.example');
 const bad=await handler(new Request('https://cashier.example/api/orders',{method:'OPTIONS',headers:{origin:'https://untrusted.example'}}));assert.equal(bad.status,403);
 delete process.env.EMPLOYEE_ORIGIN;
});
