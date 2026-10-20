import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
import {workshopCatalog} from "./workshop-catalog.mjs";
import {workshopAges} from "./workshop-ages.mjs";
import {loadWorkshopPrintContext,renderWorkshopPrint} from "./workshop-print.mjs";

test("cada taller tiene un PDF A4 imprimible en sus edades admitidas",async()=>{
  for(const workshop of workshopCatalog)for(const age of workshopAges(workshop)){
    const bytes=await renderWorkshopPrint({context:{institution_name:'IE Semillas',section:'Los Girasoles',age,student_name:'Lucía Ramírez'},workshopId:workshop.id});
    assert.equal(bytes.subarray(0,4).toString(),'%PDF',workshop.id);
    const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>0,workshop.id);
    for(const page of pdf.getPages()){assert.ok(Math.abs(Math.min(page.getWidth(),page.getHeight())-595.28)<.1);assert.ok(Math.abs(Math.max(page.getWidth(),page.getHeight())-841.89)<.1);}
    assert.equal(pdf.getTitle(),workshop.title);
  }
});
test("material PDF no permite rutas arbitrarias, una edad ajena o identificar niños de otro aula",async()=>{
  await assert.rejects(()=>renderWorkshopPrint({context:{age:3},workshopId:'taller-5-leemos-y-buscamos-pistas'}),/edad/);
  await assert.rejects(()=>renderWorkshopPrint({context:{age:5},resourceId:'../../secret'}),/disponible/);
  let calls=0;
  const db={query:async()=>({rows:++calls===1?[{id:'classroom',age:5}]:[]})};
  await assert.rejects(()=>loadWorkshopPrintContext(db,{teacherId:'teacher',studentId:'another-child'}),/no pertenece/);
});
