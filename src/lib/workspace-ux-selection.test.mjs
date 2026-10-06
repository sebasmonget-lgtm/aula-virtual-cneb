import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { destinationFromHash, hashForDestination } from "./teacher-navigation.mjs";
import { calendarLocationDate, restoreTeacherIdea } from "./workspace-selection.mjs";

const source = (await readFile(new URL("./workspace-location.ts", import.meta.url), "utf8")).replace(/^import .*;\r?\n/gm, "");
const compiled = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;

const shellText = await readFile(new URL("../features/dashboard/components/teacher-workspace.tsx", import.meta.url), "utf8");
const shell = ts.createSourceFile("teacher-workspace.tsx", shellText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const shellEffects = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(shell) === "useEffect" && node.arguments[0]?.getText(shell).includes("let acceptedHash")) shellEffects.push(node.arguments[0]);
  ts.forEachChild(node, visit);
}
visit(shell); assert.equal(shellEffects.length, 1);
const compiledShell = ts.transpileModule("(" + shellEffects[0].getText(shell) + ")()", {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;

// Execute the production URL hooks and the actual shell navigation guard with synchronous effect scheduling; inspect
// history/state, without duplicating the hook decisions or invoking a real dialog.
function locationFlow(hash, {allowed=["draft","active","history"], guardAnswer=true, param=false}={}) {
  const events = new EventTarget();
  const state={value:param?"2026-10-02":"draft",prompts:0};
  const window={location:{hash,pathname:"/"},history:{pushState(_s,_t,h){window.location.hash=h;},replaceState(_s,_t,h){window.location.hash=h;}},
    addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
  events.addEventListener("ayni-before-navigation", event=>{state.prompts++;if(!guardAnswer)event.preventDefault();});
  const exports={};
  vm.runInNewContext(compiled,{exports,window,Event,URLSearchParams,destinationFromHash,hashForDestination,
    useState:()=>[state.value,value=>{state.value=value;}],useRef:value=>({current:value}),useEffect:effect=>effect(),useCallback:callback=>callback});
  vm.runInNewContext(compiledShell,{window,Event,destinationFromHash,canLeaveWorkspace:exports.canLeaveWorkspace,navigationTouched:{current:false},readWorkspaceParams:exports.readWorkspaceParams,setAnnualDestination:value=>{state.annualDestination=value;},setPlanningTarget:()=>{},setActive:()=>{},setStarting:()=>{}});
  const select=param?exports.useWorkspaceParam("Calendario","date",state.value,calendarLocationDate)[1]
    :exports.useWorkspaceSubview("Planificar","annualPlan",allowed,"draft",false)[1];
  return {state,window,select,back(hash){window.location.hash=hash;events.dispatchEvent(new Event("popstate"));}};
}

test("reload restores the authorized active or historical annual version",()=>{
  for(const id of ["active","history"]){const flow=locationFlow(`#planificar?annualPlan=${id}&tab=annual`);assert.equal(flow.state.value,id);assert.equal(flow.window.location.hash,`#planificar?annualPlan=${id}&tab=annual`);}
});
test("foreign annual IDs fall back without losing the other workspace parameters",()=>{
  const flow=locationFlow("#planificar?annualPlan=foreign&annualView=list");
  assert.equal(flow.state.value,"draft");assert.match(flow.window.location.hash,/annualPlan=draft/);assert.match(flow.window.location.hash,/annualView=list/);
});
test("loading annual IDs does not erase the requested version",()=>{
  const flow=locationFlow("#planificar?annualPlan=active",{allowed:[]});assert.equal(flow.window.location.hash,"#planificar?annualPlan=active");assert.equal(flow.state.prompts,0);
});
test("Cancel on history navigation preserves the current version and URL",()=>{
  const flow=locationFlow("#planificar?annualPlan=draft",{guardAnswer:false});flow.back("#planificar?annualPlan=active");
  assert.equal(flow.state.value,"draft");assert.equal(flow.window.location.hash,"#planificar?annualPlan=draft");assert.equal(flow.state.prompts,1);
});
test("accepted history navigation selects the version; direct selection does not ask twice",()=>{
  const flow=locationFlow("#planificar?annualPlan=draft");flow.back("#planificar?annualPlan=history");assert.equal(flow.state.value,"history");assert.equal(flow.state.prompts,1);
  flow.select("active");assert.equal(flow.state.value,"active");assert.match(flow.window.location.hash,/annualPlan=active/);assert.equal(flow.state.prompts,1);
});
test("calendar date reload and subsequent selection preserve view and cursor",()=>{
  const flow=locationFlow("#calendario?view=week&date=2026-10-09&cursor=2026-10-01",{param:true});assert.equal(flow.state.value,"2026-10-09");
  flow.select("2026-10-16");assert.match(flow.window.location.hash,/date=2026-10-16/);assert.match(flow.window.location.hash,/view=week/);assert.match(flow.window.location.hash,/cursor=2026-10-01/);
});
test("invalid calendar dates cannot reach Date or change a valid selection",()=>{
  for(const value of ["2026-02-30","2026-13-01","bad","2026-10-01T12:00:00Z",""])assert.equal(calendarLocationDate(value),undefined);
  assert.equal(calendarLocationDate("2028-02-29"),"2028-02-29");
  const flow=locationFlow("#calendario?date=2026-02-30",{param:true});assert.equal(flow.state.value,"2026-10-02");flow.select("bad");assert.equal(flow.state.value,"2026-10-02");
});
test("undo restores the full idea at its position and preserves other edits",()=>{
  const idea={id:"animals",title:"Los animales de nuestra comunidad",explanation:"Conocer cómo los cuidamos.",requested_month:11};
  const remaining=[{id:"water",title:"El agua",explanation:"Texto actualizado"},{id:"plants",title:"Las plantas"}];
  const snapshot=JSON.stringify(remaining);const result=restoreTeacherIdea(remaining,{idea,index:1});assert.equal(result[1],idea);assert.equal(result[0].explanation,"Texto actualizado");assert.equal(JSON.stringify(remaining),snapshot);
  assert.equal(restoreTeacherIdea([], {idea,index:2})[0],idea);
});
test("undo neither duplicates an idea nor bypasses the ten-idea limit",()=>{
  const ideas=Array.from({length:10},(_,i)=>({id:String(i),title:`Idea ${i}`}));
  assert.equal(restoreTeacherIdea(ideas,{idea:{id:"other"},index:0}),ideas);
  assert.equal(restoreTeacherIdea(ideas.slice(0,2),{idea:ideas[0],index:0}).length,2);
});
