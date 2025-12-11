/**
 * Quick manual test script for SocrataClient
 * Run with: npm run build && node test-client.js
 */

import { SocrataClient } from './dist/socrataClient.js';

async function testClient() {
  const client = new SocrataClient();

  console.log('Testing SocrataClient...\n');

  try {
    // Test 1: Search for datasets
    console.log('1. Searching for "crime" datasets...');
    const searchResults = await client.searchDatasets('crime', 3);
    console.log(`Found ${searchResults.length} results:`);
    searchResults.forEach(r => console.log(`  - ${r.name} (${r.id})`));
    console.log();

    // Test 2: List datasets
    console.log('2. Listing recent datasets...');
    const listResults = await client.listDatasets(undefined, 3);
    console.log(`Found ${listResults.length} datasets:`);
    listResults.forEach(r => console.log(`  - ${r.name} (${r.id})`));
    console.log();

    // Test 3: Get schema for a known dataset
    if (listResults.length > 0) {
      const datasetId = listResults[0].id;
      console.log(`3. Getting schema for dataset ${datasetId}...`);
      const schema = await client.getSchema(datasetId);
      console.log(`Dataset: ${schema.datasetName}`);
      console.log(`Columns (${schema.columns.length}):`);
      schema.columns.slice(0, 5).forEach(col => 
        console.log(`  - ${col.name} (${col.fieldName}): ${col.dataType}`)
      );
      console.log();

      // Test 4: Query the dataset
      console.log(`4. Querying dataset ${datasetId}...`);
      const queryResults = await client.queryResource(datasetId, 'SELECT * LIMIT 3');
      console.log(`Got ${queryResults.length} rows`);
      if (queryResults.length > 0) {
        console.log('First row:', JSON.stringify(queryResults[0], null, 2));
      }
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testClient();
