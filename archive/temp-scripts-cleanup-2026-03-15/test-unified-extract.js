const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUnifiedExtraction() {
  const pdfPath = '/Users/5150east/landscape/docs/3.1 Preliminary Plat Narrative & Approval.pdf';

  const formData = new FormData();
  formData.append('file', fs.createReadStream(pdfPath));

  console.log('📤 Sending PDF to unified extraction API...');

  const response = await fetch('http://localhost:3002/api/dms/extract-unified', {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });

  const result = await response.json();

  console.log('\n📊 Extraction Result:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ Extraction successful!');
    console.log(`   Parcels: ${result.result.mapped.tbl_parcel.length}`);
    console.log(`   Lot products: ${result.result.parcel_product_mix.length}`);
    console.log(`   Warnings: ${result.result.warnings.length}`);
  } else {
    console.log('\n❌ Extraction failed:', result.error);
  }
}

testUnifiedExtraction().catch(console.error);
