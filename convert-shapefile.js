#!/usr/bin/env node

const shapefile = require("shapefile");
const fs = require("fs");
const path = require("path");
const proj4 = require("proj4");

async function convertShapefile() {
    console.log("🔄 Starting shapefile conversion...");

    const shapefilePath = "./src/app/GIS/Pinal_County_Tax_Parcels_viewer.shp";
    const outputPath = "./public/pinal_parcels.geojson";

    // Define coordinate systems
    // Web Mercator (EPSG:3857) - input projection
    const webMercator = 'EPSG:3857';
    // WGS84 (EPSG:4326) - output projection for web maps
    const wgs84 = 'EPSG:4326';

    console.log("🗺️  Setting up coordinate transformation: Web Mercator -> WGS84");

    // Ensure public directory exists
    const publicDir = path.dirname(outputPath);
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    try {
        console.log("📂 Reading shapefile:", shapefilePath);

        const features = [];
        let count = 0;

        // Open shapefile and read features
        const source = await shapefile.open(shapefilePath);

        console.log("📊 Processing features...");

        while (true) {
            const result = await source.read();
            if (result.done) break;

            const feature = result.value;

            // Transform geometry coordinates from Web Mercator to WGS84
            let transformedGeometry = { ...feature.geometry };

            if (feature.geometry && feature.geometry.coordinates) {
                if (feature.geometry.type === 'Polygon') {
                    // Transform polygon coordinates
                    transformedGeometry.coordinates = feature.geometry.coordinates.map(ring =>
                        ring.map(coord => {
                            try {
                                const [lng, lat] = proj4(webMercator, wgs84, [coord[0], coord[1]]);
                                return [lng, lat];
                            } catch (error) {
                                console.warn(`Failed to transform coordinate [${coord[0]}, ${coord[1]}]:`, error.message);
                                return coord; // Keep original if transformation fails
                            }
                        })
                    );
                } else if (feature.geometry.type === 'MultiPolygon') {
                    // Transform multipolygon coordinates
                    transformedGeometry.coordinates = feature.geometry.coordinates.map(polygon =>
                        polygon.map(ring =>
                            ring.map(coord => {
                                try {
                                    const [lng, lat] = proj4(webMercator, wgs84, [coord[0], coord[1]]);
                                    return [lng, lat];
                                } catch (error) {
                                    console.warn(`Failed to transform coordinate [${coord[0]}, ${coord[1]}]:`, error.message);
                                    return coord; // Keep original if transformation fails
                                }
                            })
                        )
                    );
                }
            }

            // Keep only essential properties
            const simplifiedFeature = {
                type: "Feature",
                geometry: transformedGeometry,
                properties: {
                    parcelid: feature.properties.parcelid,  // APN field (corrected case)
                    objectid: feature.properties.objectid,  // Object ID (corrected case)
                    grossac: feature.properties.grossac,
                    ownernme1: feature.properties.ownernme1,
                    siteaddres: feature.properties.siteaddres  // Site address (corrected field name)
                }
            };

            features.push(simplifiedFeature);
            count++;

            // Progress indicator
            if (count % 10000 === 0) {
                console.log(`   Processed ${count} features...`);
            }

            // Convert all parcels - no limit
        }

        const geojson = {
            type: "FeatureCollection",
            features: features
        };

        console.log(`💾 Writing ${count} features to ${outputPath}...`);
        fs.writeFileSync(outputPath, JSON.stringify(geojson));

        const stats = fs.statSync(outputPath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log(`✅ Conversion complete!`);
        console.log(`   📁 Output: ${outputPath}`);
        console.log(`   📊 Features: ${count}`);
        console.log(`   📏 File size: ${fileSizeMB} MB`);

    } catch (error) {
        console.error("❌ Error converting shapefile:", error.message);
        console.error("Stack:", error.stack);
    }
}

convertShapefile();