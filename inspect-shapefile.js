#!/usr/bin/env node

const shapefile = require("shapefile");

async function inspectShapefile() {
    console.log("🔍 Inspecting shapefile fields...");

    const shapefilePath = process.env.PINAL_PARCELS_SOURCE_PATH || "./data/external/pinal-county/raw/Pinal_County_Tax_Parcels_viewer.shp";

    try {
        const source = await shapefile.open(shapefilePath);

        let count = 0;
        const fieldSamples = {};

        // Read first few features to see what fields are available
        while (count < 5) {
            const result = await source.read();
            if (result.done) break;

            const feature = result.value;
            console.log(`\n=== Feature ${count + 1} ===`);
            console.log('Available fields:', Object.keys(feature.properties || {}));
            console.log('Properties:', feature.properties);

            // Collect unique field names
            if (feature.properties) {
                Object.keys(feature.properties).forEach(field => {
                    if (!fieldSamples[field]) {
                        fieldSamples[field] = new Set();
                    }
                    fieldSamples[field].add(feature.properties[field]);
                });
            }

            count++;
        }

        console.log('\n=== FIELD SUMMARY ===');
        Object.keys(fieldSamples).forEach(field => {
            const samples = Array.from(fieldSamples[field]).slice(0, 3);
            console.log(`${field}: ${samples.join(', ')}${fieldSamples[field].size > 3 ? '...' : ''}`);
        });

    } catch (error) {
        console.error("❌ Error inspecting shapefile:", error.message);
    }
}

inspectShapefile();
