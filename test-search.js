/**
 * Test just the search functionality
 */

import { SocrataClient } from './dist/socrataClient.js';

async function testSearch() {
  const client = new SocrataClient();

  console.log('Testing search for "crime"...\n');

  try {
    const results = await client.searchDatasets('crime', 5);
    console.log(`Found ${results.length} results:\n`);
    
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   Description: ${r.description.substring(0, 100)}...`);
      console.log(`   Category: ${r.category || 'N/A'}`);
      console.log();
    });

    if (results.length === 0) {
      console.log('❌ No results found - this might be an API issue');
    } else {
      console.log('✅ Search working!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSearch();
