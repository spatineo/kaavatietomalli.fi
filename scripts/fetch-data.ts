import fs from 'fs';
import { fetchAndTransformTietomallit } from './fetch-tietomallit';
import { fetchAndTransformKoodistot } from './fetch-koodistot';

export async function fetchAllData() {
  console.log('--- Fetching Tietomallit ---');
  const resTietomallit = await fetchAndTransformTietomallit();

  console.log('\n--- Fetching Koodistot ---');
  const resKoodistot = await fetchAndTransformKoodistot();

  const tietomallitChanged = resTietomallit?.changedCount || 0;
  const koodistotChanged = resKoodistot?.changedCount || 0;
  const totalChanged = tietomallitChanged + koodistotChanged;
  const dataChanged = totalChanged > 0;

  console.log(`\n--- Fetch Data Summary ---`);
  console.log(`Tietomallit processed: ${resTietomallit?.totalProcessed || 0}, changed: ${tietomallitChanged}`);
  console.log(`Koodistot processed: ${resKoodistot?.totalProcessed || 0}, changed: ${koodistotChanged}`);
  console.log(`Total files modified (excluding originSyncTime): ${totalChanged}`);
  console.log(`Data changed decision: ${dataChanged}`);

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) {
    fs.appendFileSync(ghOutput, `data_changed=${dataChanged}\n`);
    console.log(`Logged to GITHUB_OUTPUT: data_changed=${dataChanged}`);
  }

  return { resTietomallit, resKoodistot, dataChanged, totalChanged };
}

if (process.env.NODE_ENV !== 'test') {
  fetchAllData().catch((err) => {
    console.error('Error in fetchAllData:', err);
    process.exit(1);
  });
}
