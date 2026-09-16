import test from 'node:test';
import assert from 'node:assert/strict';
import { straightLineAssessment, thresholdNumber, distanceLabel, wageLabel, workEnded, comparisonItems, createEmploymentApi, newDemoRun } from '../src/employment-data.js';
import { employmentSection } from '../src/employment.js';

test('distance inside, outside, exact boundary and missing coordinates are distinct',()=>{
  const a={lat:0,lon:0},b={lat:0.005,lon:0};
  const result=straightLineAssessment(a,b,1);
  assert.equal(result.is_nearby,true);
  assert.equal(straightLineAssessment(a,{lat:0.05,lon:0},1).is_nearby,false);
  assert.equal(straightLineAssessment(a,b,result.distance_km).is_nearby,true);
  assert.equal(straightLineAssessment(a,b,result.distance_km-0.000001).is_nearby,false);
  assert.equal(straightLineAssessment(a,null,1).is_nearby,null);
  assert.equal(straightLineAssessment(a,b,'').is_nearby,null);
  assert.match(distanceLabel(result),/직선거리/);
});
test('zero coordinates work, invalid inputs and unconfigured thresholds do not invent distances',()=>{
  assert.equal(straightLineAssessment({lat:0,lon:0},{lat:0,lon:0},1).distance_km,0);
  assert.equal(straightLineAssessment({lat:91,lon:0},{lat:0,lon:0},1).distance_km,null);
  assert.equal(thresholdNumber(''),null);
  for(const v of [0,-1,'NaN',Infinity]) assert.throws(()=>thresholdNumber(v));
  assert.equal(distanceLabel(null),'거리 확인 불가');
  assert.equal(distanceLabel({ status:'configuration_required', distance_km:0.5, is_nearby:null }), '직선거리 0.500km · 기준 거리 설정 필요');
});
test('wage response is worker testimony, and unfinished work is not eligible',()=>{
  assert.equal(wageLabel(null),'미응답');
  assert.equal(wageLabel('not_paid'),'아직 지급받지 못함');
  assert.equal(wageLabel('paid'),'지급받음');
  assert.equal(workEnded({contract_outcome:'in_progress'}),false);
  assert.equal(workEnded({contract_outcome:'completed'}),true);
});
test('manual comparison has five requested criteria without synthetic conditions',()=>{
  const items=comparisonItems(null,null,'',null);
  assert.equal(items.length,5);
  assert.equal(items[0][1],'미등록');
  assert.equal(items[4][1],'미등록');
  assert.match(items[1][1],/거리 확인 불가/);
});
test('location is collected from the device only after consent, without manual coordinate entry',()=>{
  assert.match(employmentSection(),/현재 위치 자동 저장/);
  assert.match(employmentSection(),/data-login-target="#work-management"/);
  assert.match(employmentSection(),/좌표 입력 없이/);
  assert.doesNotMatch(employmentSection(),/사업장 위도/);
  assert.doesNotMatch(employmentSection(),/근로자의 통근 출발 위치/);
});

function clientFixture({error=false,role='worker'}={}){
  const calls=[];let saved=null;
  const client={auth:{getUser:async()=>({data:{user:{id:'owner',user_metadata:{role:'admin'}}}})},
    rpc:async(name)=>{calls.push(name);return {data:name==='employment_cases'?[]:{introduction_enabled:false}};},
    from(table){let writing=false;const q={
      select(){return q;},eq(key,value){calls.push({table,key,value});return q;},maybeSingle(){return q;},single(){return q;},
      upsert(value){writing=true;saved=value;calls.push({write:table,value});return q;},
      then(resolve,reject){return Promise.resolve(error?{error:new Error('DB unavailable')}:{data:table==='profiles'?{role}:writing?{owner_profile_id:'owner'}:saved}).then(resolve,reject);}
    };return q;}};
  return {client,calls};
}
test('demo save forces authenticated owner, strips unknown fields and reads after write',async()=>{
  const {client,calls}=clientFixture();const api=createEmploymentApi(client,()=>{throw Error('not admin');});
  await api.saveDemo({...newDemoRun(),owner_profile_id:'someone-else',provider_evidence_id:'fake'});
  const write=calls.find(c=>c.write);
  assert.equal(write.value.owner_profile_id,'owner');assert.equal(write.value.provider_evidence_id,undefined);
  assert.ok(calls.some(c=>c.key==='owner_profile_id'&&c.value==='owner'));
});
test('workspace reads protected profile role, not editable user metadata',async()=>{
  const {client}=clientFixture();const result=await createEmploymentApi(client,()=>{throw Error('should not query admin');}).load();
  assert.equal(result.role,'worker');assert.equal(result.consoleData,null);
});
test('every authenticated member uses the owner-checked personal location RPC',async()=>{
  const {client,calls}=clientFixture();const api=createEmploymentApi(client,()=>null);
  await api.load();
  await api.savePersonalLocation({p_lat:37.5,p_lon:127,p_withdraw:false});
  assert.ok(calls.includes('personal_location_status'));
  assert.ok(calls.includes('save_personal_location'));
});
test('DB error never becomes a success or a synthetic empty record',async()=>{
  const {client}=clientFixture({error:true});await assert.rejects(createEmploymentApi(client,()=>null).saveDemo(newDemoRun()),/DB unavailable/);
});
