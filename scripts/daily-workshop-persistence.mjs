import { randomUUID } from "node:crypto";
import { validateWorkshopDay, workshopItemIsSelected } from "../src/lib/workshop-master-service.mjs";
import { VersionConflictError, versionTransaction } from "../src/lib/version-integrity.mjs";
import { activityPreparationV3 } from "../src/lib/activity-v3-snapshot.mjs";

export async function activeWorkshopForProject(db, projectId) {
  return (await db.query(`select * from learning_experiences where parent_project_id=$1
    and type='workshop' and status='active'`, [projectId])).rows[0] ?? null;
}

export function pairedWorkshop(master, index, proposal) {
  if (!proposal) return null;
  if (!master) throw new Error("El taller elegido ya no está disponible.");
  const item = master.details?.items?.[index - 1];
  if (!item || item.index !== index || !workshopItemIsSelected(item))
    throw new Error("El taller elegido ya no corresponde a este día.");
  validateWorkshopDay(proposal, item);
  return { item, proposal };
}

export async function insertDailyPair(db, { experience, occursOn, mainId, mainDetails, materials,
  mainMetadata, master, workshopIndex, workshopProposal, workshopMetadata }) {
  const pair = pairedWorkshop(master, workshopIndex, workshopProposal);
  const workshopId = pair ? randomUUID() : null;
  await versionTransaction(db, `daily-pair:${experience.id}:${occursOn}`, async (tx) => {
    const conflict = (await tx.query(`select 1 from activities where experience_id=$1 and occurs_on=$2::date
      and status in ('draft','active') limit 1`, [experience.id, occursOn])).rows[0];
    if (conflict) throw new VersionConflictError("Ya existe una actividad del proyecto para esa fecha.");
    await tx.query(`insert into activities(id,experience_id,occurs_on,planned_date,title,purpose,sequence,
      preparation,adaptations,status,details,generation_metadata)
      values($1,$2,$3::date,$3::date,$4,$5,'[]'::jsonb,$6::jsonb,'[]'::jsonb,'draft',$7::jsonb,$8::jsonb)`,
    [mainId, experience.id, occursOn, mainDetails.title, mainDetails.purpose,
      JSON.stringify(activityPreparationV3(mainDetails, materials)), JSON.stringify(mainDetails), JSON.stringify(mainMetadata)]);
    if (pair) await tx.query(`insert into activities(id,experience_id,occurs_on,planned_date,title,purpose,
      sequence,preparation,adaptations,status,details,generation_metadata,linked_main_activity_id,workshop_item_index)
      values($1,$2,$3::date,$3::date,$4,$5,'[]'::jsonb,$6::jsonb,'[]'::jsonb,'draft',$7::jsonb,$8::jsonb,$9,$10)`,
    [workshopId, master.id, occursOn, pair.proposal.title, pair.proposal.purpose,
      JSON.stringify({ materials: pair.proposal.materials }), JSON.stringify(pair.proposal),
      JSON.stringify(workshopMetadata ?? {}), mainId, workshopIndex]);
  });
  return { workshopId };
}

export async function linkedWorkshopDraft(db, mainId, classroomId) {
  return (await db.query(`select a.*,m.parent_project_id,m.status as master_status,m.details as master_details
    from activities a join learning_experiences m on m.id=a.experience_id
    where a.linked_main_activity_id=$1 and m.classroom_id=$2 and m.type='workshop'
    and a.status='draft' order by a.version desc limit 1`, [mainId, classroomId])).rows[0] ?? null;
}

export async function updateDailyPair(db, { mainId, lineageId, revision, mainValues, mainMetadata,
  workshopDraft, workshopProposal, workshopRevision, workshopMetadata }) {
  if (workshopDraft) {
    const item = workshopDraft.master_details.items[workshopDraft.workshop_item_index - 1];
    validateWorkshopDay(workshopProposal, item);
  } else if (workshopProposal) throw new Error("Este proyecto no tiene un taller vinculado a esta actividad.");
  return versionTransaction(db, `activity:${lineageId}`, async (tx) => {
    const main = (await tx.query(`update activities set occurs_on=$1::date,planned_date=coalesce(planned_date,$1::date),
      title=$2,purpose=$3,details=$4::jsonb,preparation=$5::jsonb,
      generation_metadata=coalesce($6::jsonb,generation_metadata),updated_at=now()
      where id=$7 and status='draft' and revision=$8 returning revision`,
    [...mainValues, mainMetadata ? JSON.stringify(mainMetadata) : null, mainId, revision])).rows[0];
    if (!main) throw new VersionConflictError("El borrador de actividad cambió.");
    if (workshopDraft) {
      const workshop = (await tx.query(`update activities set title=$1,purpose=$2,details=$3::jsonb,
        preparation=$4::jsonb,generation_metadata=coalesce($5::jsonb,generation_metadata),updated_at=now()
        where id=$6 and status='draft' and revision=$7 returning revision`,
      [workshopProposal.title, workshopProposal.purpose, JSON.stringify(workshopProposal),
        JSON.stringify({ materials: workshopProposal.materials }),
        workshopMetadata ? JSON.stringify(workshopMetadata) : null, workshopDraft.id, workshopRevision])).rows[0];
      if (!workshop) throw new VersionConflictError("El borrador de taller cambió.");
      return { revision: Number(main.revision), workshopRevision: Number(workshop.revision) };
    }
    return { revision: Number(main.revision), workshopRevision: null };
  });
}
