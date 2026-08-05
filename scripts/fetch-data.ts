import fs from 'fs';
import { fetchAndTransformDataModels } from './fetch-data-models';
import { fetchAndTransformCodelists } from './fetch-codelists';

export async function fetchAllData() {
  console.log('--- Fetching data models ---');
  const resDataModels = await fetchAndTransformDataModels();

  console.log('\n--- Fetching codelists ---');
  const resCodelists = await fetchAndTransformCodelists();

  const dataModelsChanged = resDataModels?.changedCount || 0;
  const codelistsChanged = resCodelists?.changedCount || 0;
  const totalChanged = dataModelsChanged + codelistsChanged;
  const dataChanged = totalChanged > 0;

  console.log(`\n--- Fetch Data Summary ---`);
  console.log(`Data models processed: ${resDataModels?.totalProcessed || 0}, changed: ${dataModelsChanged}`);
  console.log(`Codelists processed: ${resCodelists?.totalProcessed || 0}, changed: ${codelistsChanged}`);
  console.log(`Total files modified (excluding originSyncTime): ${totalChanged}`);
  console.log(`Data changed decision: ${dataChanged}`);

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) {
    fs.appendFileSync(ghOutput, `data_changed=${dataChanged}\n`);
    console.log(`Logged to GITHUB_OUTPUT: data_changed=${dataChanged}`);
  }

  return { resDataModels, resCodelists, dataChanged, totalChanged };
}

if (process.env.NODE_ENV !== 'test') {
  fetchAllData().catch((err) => {
    console.error('Error in fetchAllData:', err);
    process.exit(1);
  });
}
