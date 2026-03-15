import { getBatches, getChecklistItems } from './actions';
import CrmChecklist from './components/CrmChecklist';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: { batch?: string };
}) {
  const batches = await getBatches() || [];
  
  const selectedBatchIdStr = searchParams.batch;
  const selectedBatchId = selectedBatchIdStr 
    ? parseInt(selectedBatchIdStr) 
    : (batches && batches.length > 0 ? (batches as {id: number}[])[0].id : null);
  
  let checklistItems: unknown[] = [];
  if (selectedBatchId) {
    checklistItems = await getChecklistItems(selectedBatchId) || [];
  }

  return (
    <main>
      <h1 className="app-title">CRM Checklist</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CrmChecklist 
        initialBatches={batches as {id: number; name: string}[]} 
        initialItems={checklistItems as never[]} 
        selectedBatchId={selectedBatchId} 
      />
    </main>
  );
}
