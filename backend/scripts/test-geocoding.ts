#!/usr/bin/env tsx
/**
 * Test script for geocoding service
 * Run: npx tsx backend/scripts/test-geocoding.ts
 */

import { geocodeLocation } from '../../src/lib/geocoding'

async function testGeocodingService() {
  console.log('🧪 Testing Geocoding Service\n')
  console.log('=' .repeat(60))

  // Test addresses
  const testAddresses = [
    {
      name: 'Project 17 (Chadron)',
      address: '14105 Chadron Avenue, Hawthorne, CA 90250',
      expectedLat: 33.9031,
      expectedLng: -118.3287
    },
    {
      name: 'Simple Address',
      address: '1600 Amphitheatre Parkway, Mountain View, CA',
      expectedLat: 37.4220,
      expectedLng: -122.0841
    },
    {
      name: 'Known Location (Cache)',
      address: 'Anderson and Farrell Roads, Maricopa, AZ',
      expectedLat: 33.0583,
      expectedLng: -112.0147
    }
  ]

  for (const test of testAddresses) {
    console.log(`\n📍 Testing: ${test.name}`)
    console.log(`   Address: ${test.address}`)
    console.log(`   Expected: ${test.expectedLat}, ${test.expectedLng}`)

    try {
      const result = await geocodeLocation(test.address)

      if (result) {
        console.log(`   ✅ Result: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`)
        console.log(`   Source: ${result.source}`)
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`)

        // Check accuracy (within 0.001 degrees ~ 100 meters)
        const latDiff = Math.abs(result.latitude - test.expectedLat)
        const lngDiff = Math.abs(result.longitude - test.expectedLng)

        if (latDiff < 0.001 && lngDiff < 0.001) {
          console.log(`   ✅ ACCURATE (within 100m)`)
        } else if (latDiff < 0.01 && lngDiff < 0.01) {
          console.log(`   ⚠️ APPROXIMATE (within 1km)`)
        } else {
          console.log(`   ❌ INACCURATE (off by ${(latDiff * 111).toFixed(1)}km lat, ${(lngDiff * 111).toFixed(1)}km lng)`)
        }

        if (result.bounds) {
          console.log(`   Bounds: [${result.bounds.south.toFixed(4)}, ${result.bounds.west.toFixed(4)}] to [${result.bounds.north.toFixed(4)}, ${result.bounds.east.toFixed(4)}]`)
        }
      } else {
        console.log(`   ❌ FAILED - No results`)
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n📊 Summary:')
  console.log('   - If you see "source: google" → Google API is working')
  console.log('   - If you see "source: nominatim" → Using free fallback')
  console.log('   - If you see "source: cache" → Using known location cache')
  console.log('\n💡 To enable Google Geocoding:')
  console.log('   1. Get API key from: https://console.cloud.google.com/')
  console.log('   2. Add to .env.local: NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY=your_key')
  console.log('   3. Restart dev server')
  console.log('   4. Re-run this test\n')
}

// Run tests
testGeocodingService().catch(console.error)
