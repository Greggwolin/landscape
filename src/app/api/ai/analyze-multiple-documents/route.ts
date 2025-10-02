import { NextRequest, NextResponse } from 'next/server'

interface DocumentSource {
  documentId: string
  documentName: string
  documentType: string
  content: string
}

interface FieldSource {
  documentId: string
  documentName: string
  value: string
  confidence: number
  context: string
}

interface ReconciledField {
  fieldName: string
  finalValue: string
  confidence: number
  sources: FieldSource[]
  conflictResolution: 'consensus' | 'highest_confidence' | 'most_recent' | 'manual_override'
  notes: string[]
}

interface MultiDocumentAnalysisResult {
  success: boolean
  documentsAnalyzed: number
  reconciledFields: ReconciledField[]
  conflicts: Array<{
    fieldName: string
    conflictingSources: FieldSource[]
    recommendation: string
    requiresManualReview: boolean
  }>
  extractedData: {
    project_location?: {
      addresses: string[]
      coordinates?: { latitude: number; longitude: number }
      legal_descriptions: string[]
      city?: string
      county?: string
      state?: string
    }
    parcel_data?: Array<{
      parcel_id: string
      acres: number
      land_use?: string
    }>
    development_info?: {
      units_planned?: number
      density?: number
      land_uses: string[]
      phases: Array<{ name: string; units: number }>
      product_types: Array<{ name: string; lot_size: string; units: number }>
    }
    zoning_standards?: {
      setback_front?: number
      setback_side?: number
      setback_rear?: number
      max_height?: number
      site_coverage?: number
      min_lot_area?: number
      floor_area_ratio?: number
    }
    contacts?: Array<{
      name: string
      title?: string
      company?: string
      email?: string
      phone?: string
      type: string
    }>
  }
  processingNotes: string[]
  errors: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { documents, projectId } = await request.json()

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No documents provided for analysis'
      }, { status: 400 })
    }

    console.log(`Starting multi-document analysis for ${documents.length} documents`)

    // Analyze each document individually first
    const individualAnalyses = await Promise.all(
      documents.map(async (doc: DocumentSource) => {
        try {
          console.log(`Analyzing document: ${doc.documentName}`)

          // Extract comprehensive project information
          const extractedInfo = await extractProjectInformationFromDocument(doc.content, doc.documentName)

          return {
            documentId: doc.documentId,
            documentName: doc.documentName,
            documentType: doc.documentType,
            extractedInfo,
            success: true
          }
        } catch (error) {
          console.error(`Error analyzing ${doc.documentName}:`, error)
          return {
            documentId: doc.documentId,
            documentName: doc.documentName,
            documentType: doc.documentType,
            extractedInfo: null,
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed'
          }
        }
      })
    )

    // Reconcile data across documents
    const reconciliationResult = reconcileMultiDocumentData(individualAnalyses)

    const result: MultiDocumentAnalysisResult = {
      success: true,
      documentsAnalyzed: documents.length,
      reconciledFields: reconciliationResult.reconciledFields,
      conflicts: reconciliationResult.conflicts,
      extractedData: reconciliationResult.extractedData,
      processingNotes: reconciliationResult.processingNotes,
      errors: individualAnalyses
        .filter(analysis => !analysis.success)
        .map(analysis => `${analysis.documentName}: ${analysis.error}`)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Multi-document analysis error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }, { status: 500 })
  }
}

async function extractProjectInformationFromDocument(content: string, documentName: string) {
  console.log(`Extracting project information from ${documentName} (${content.length} characters)`)

  const info = {
    hasValidContent: false,
    projectName: '',
    totalAcres: null as number | null,
    netAcres: null as number | null,
    totalUnits: null as number | null,
    density: null as number | null,
    location: '',
    city: '',
    county: '',
    state: '',
    coordinates: null as { latitude: number; longitude: number } | null,
    legalDescription: '',
    parcelNumbers: [] as string[],
    developer: '',
    phases: [] as Array<{ name: string; units: number }>,
    zoningStandards: {
      setbackFront: null as number | null,
      setbackSide: null as number | null,
      setbackRear: null as number | null,
      maxHeight: null as number | null,
      siteCoverage: null as number | null,
      minLotArea: null as number | null,
      floorAreaRatio: null as number | null,
    },
    contacts: [] as Array<{ name: string; title: string; company: string; email: string; phone: string; type: string }>
  }

  if (!content || content.trim().length < 50) {
    console.log('Document content too short or empty')
    return info
  }

  info.hasValidContent = true

  // Enhanced regex patterns for comprehensive data extraction
  const patterns = {
    projectName: [
      /(?:project\s+name|development\s+name|subdivision\s+name)[:：]\s*([^\n\r]{3,50})/gi,
      /([A-Z][A-Z\s]+(?:RANCH|ESTATES|VILLAGE|COMMUNITY|DEVELOPMENT|SUBDIVISION|PARK|PLACE|RESERVE|HILLS|VALLEY|CREEK|RIDGE|GLEN|MEADOWS))/g,
      /^([A-Z][A-Za-z\s]{5,40}(?:Phase|Phases?)\s*\d*)/gm
    ],
    totalAcres: [
      /(?:total\s+)?(?:project\s+)?(?:site\s+)?(?:gross\s+)?area[:：]?\s*([0-9]+\.?[0-9]*)\s*acres?/gi,
      /([0-9]+\.?[0-9]*)\s*acre[s]?\s*(?:total|gross|project|site)/gi,
      /±\s*([0-9]+\.?[0-9]*)\s*acres?/gi
    ],
    netAcres: [
      /net\s+(?:developable\s+)?area[:：]?\s*([0-9]+\.?[0-9]*)\s*acres?/gi,
      /([0-9]+\.?[0-9]*)\s*net\s*acres?/gi
    ],
    totalUnits: [
      /(?:total\s+)?(?:dwelling\s+)?units?[:：]?\s*([0-9]+)/gi,
      /([0-9]+)\s*(?:total\s+)?(?:dwelling\s+)?units?/gi,
      /residential\s+units?[:：]?\s*([0-9]+)/gi
    ],
    location: [
      /(?:location|address|site)[:：]?\s*([^,\n]{10,100})/gi,
      /(?:located\s+(?:at|in))[\s:]*([^,\n]{10,100})/gi
    ],
    city: [
      /city[:：]?\s*([A-Za-z\s]{2,30})/gi,
      /,\s*([A-Za-z\s]{2,30}),\s*[A-Z]{2}/g,
      /(?:City\s+of\s+)([A-Za-z\s]{2,30})/gi
    ],
    county: [
      /county[:：]?\s*([A-Za-z\s]{2,30})/gi,
      /([A-Za-z\s]{2,30})\s+County/gi
    ],
    state: [
      /state[:：]?\s*([A-Za-z\s]{2,20})/gi,
      /,\s*([A-Z]{2})\s*[0-9]{5}/g,
      /(Arizona|California|Nevada|Utah|Colorado|New Mexico|Texas|Florida)/gi
    ],
    parcelNumbers: [
      /(?:parcel|apn|assessor)[\s#:]*([0-9-]{3,20})/gi,
      /APN[:：]?\s*([0-9-]{3,20})/gi
    ],
    setbacks: [
      /(?:front\s+)?setback[:：]?\s*([0-9]+\.?[0-9]*)\s*(?:feet|ft|')/gi,
      /side\s+setback[:：]?\s*([0-9]+\.?[0-9]*)\s*(?:feet|ft|')/gi,
      /rear\s+setback[:：]?\s*([0-9]+\.?[0-9]*)\s*(?:feet|ft|')/gi
    ],
    height: [
      /(?:maximum\s+)?(?:building\s+)?height[:：]?\s*([0-9]+\.?[0-9]*)\s*(?:feet|ft|')/gi,
      /height\s+limit[:：]?\s*([0-9]+\.?[0-9]*)\s*(?:feet|ft|')/gi
    ],
    coverage: [
      /(?:lot\s+|site\s+)?coverage[:：]?\s*([0-9]+\.?[0-9]*)\s*%/gi,
      /([0-9]+\.?[0-9]*)\s*%\s*(?:lot\s+|site\s+)?coverage/gi
    ],
    minLotArea: [
      /(?:minimum\s+)?lot\s+(?:size|area)[:：]?\s*([0-9,]+\.?[0-9]*)\s*(?:square\s+feet|sq\.?\s*ft|sf)/gi,
      /([0-9,]+\.?[0-9]*)\s*(?:square\s+feet|sq\.?\s*ft|sf)\s*(?:minimum\s+)?lot/gi
    ],
    contacts: [
      /([A-Z][a-z]+\s+[A-Z][a-z]+)[\s,]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?[\s,]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?[\s,]*(\([0-9]{3}\)\s*[0-9]{3}-[0-9]{4}|[0-9]{3}-[0-9]{3}-[0-9]{4})?/g
    ]
  }

  // Extract project name
  for (const pattern of patterns.projectName) {
    const matches = content.match(pattern)
    if (matches) {
      const cleanMatch = matches[0].replace(/project\s+name[:：]?\s*/gi, '').trim()
      if (cleanMatch.length > 2 && cleanMatch.length < 60) {
        info.projectName = cleanMatch
        console.log(`Found project name with pattern: ${pattern} -> ${cleanMatch}`)
        break
      }
    }
  }

  // Extract numeric values
  const extractNumeric = (patterns: RegExp[], fieldName: string): number | null => {
    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match) {
        const numStr = match[1] || match[0].match(/([0-9]+\.?[0-9]*)/)?.[1]
        if (numStr) {
          const num = parseFloat(numStr.replace(/,/g, ''))
          if (!isNaN(num) && num > 0) {
            console.log(`Found ${fieldName}: ${num}`)
            return num
          }
        }
      }
    }
    return null
  }

  info.totalAcres = extractNumeric(patterns.totalAcres, 'total acres')
  info.netAcres = extractNumeric(patterns.netAcres, 'net acres')
  info.totalUnits = extractNumeric(patterns.totalUnits, 'total units')

  // Calculate density if we have both acres and units
  if (info.totalAcres && info.totalUnits) {
    info.density = parseFloat((info.totalUnits / info.totalAcres).toFixed(2))
  }

  // Extract location data
  const extractText = (patterns: RegExp[], fieldName: string): string => {
    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        const cleanMatch = match[1].trim()
        if (cleanMatch.length > 2) {
          console.log(`Found ${fieldName}: ${cleanMatch}`)
          return cleanMatch
        }
      }
    }
    return ''
  }

  info.location = extractText(patterns.location, 'location')
  info.city = extractText(patterns.city, 'city')
  info.county = extractText(patterns.county, 'county')
  info.state = extractText(patterns.state, 'state')

  // Extract parcel numbers
  const parcelMatches = content.match(patterns.parcelNumbers[0])
  if (parcelMatches) {
    info.parcelNumbers = parcelMatches
      .map(match => match.replace(/(?:parcel|apn|assessor)[\s#:]*/gi, '').trim())
      .filter(parcel => parcel.length > 2)
    console.log(`Found ${info.parcelNumbers.length} parcel numbers`)
  }

  // Extract zoning standards
  info.zoningStandards.setbackFront = extractNumeric([patterns.setbacks[0]], 'front setback')
  info.zoningStandards.setbackSide = extractNumeric([patterns.setbacks[1]], 'side setback')
  info.zoningStandards.setbackRear = extractNumeric([patterns.setbacks[2]], 'rear setback')
  info.zoningStandards.maxHeight = extractNumeric(patterns.height, 'max height')
  info.zoningStandards.siteCoverage = extractNumeric(patterns.coverage, 'site coverage')
  info.zoningStandards.minLotArea = extractNumeric(patterns.minLotArea, 'min lot area')

  // Extract contacts (simplified for now)
  const contactMatches = content.match(patterns.contacts[0])
  if (contactMatches) {
    contactMatches.slice(0, 5).forEach((match, index) => { // Limit to 5 contacts
      const parts = match.split(/[\s,]+/)
      if (parts.length >= 2) {
        info.contacts.push({
          name: `${parts[0]} ${parts[1]}`,
          title: parts[2] || '',
          company: parts[3] || '',
          email: parts.find(p => p.includes('@')) || '',
          phone: parts.find(p => p.match(/\([0-9]{3}\)|[0-9]{3}-[0-9]{3}-[0-9]{4}/)) || '',
          type: 'contact'
        })
      }
    })
    console.log(`Found ${info.contacts.length} contacts`)
  }

  console.log('Project Info Extraction Results:', {
    projectName: info.projectName,
    totalAcres: info.totalAcres,
    totalUnits: info.totalUnits,
    location: info.location,
    city: info.city,
    county: info.county,
    state: info.state,
    coordinates: info.coordinates,
    zoningStandards: info.zoningStandards,
    hasValidContent: info.hasValidContent,
    contactsFound: info.contacts.length,
    textLength: content.length
  })

  return info
}

function reconcileMultiDocumentData(individualAnalyses: any[]) {
  console.log('Starting multi-document reconciliation...')

  const successfulAnalyses = individualAnalyses.filter(analysis => analysis.success && analysis.extractedInfo)

  if (successfulAnalyses.length === 0) {
    throw new Error('No documents were successfully analyzed')
  }

  // Collect all field values across documents
  const fieldCollections: Record<string, FieldSource[]> = {}

  successfulAnalyses.forEach(analysis => {
    const info = analysis.extractedInfo

    // Helper function to add field value
    const addField = (fieldName: string, value: any, confidence: number = 0.8, context: string = '') => {
      if (value !== null && value !== undefined && value !== '') {
        if (!fieldCollections[fieldName]) {
          fieldCollections[fieldName] = []
        }
        fieldCollections[fieldName].push({
          documentId: analysis.documentId,
          documentName: analysis.documentName,
          value: String(value),
          confidence,
          context
        })
      }
    }

    // Add all extracted fields
    addField('project_name', info.projectName, 0.9)
    addField('total_acres', info.totalAcres, 0.85)
    addField('net_acres', info.netAcres, 0.85)
    addField('total_units', info.totalUnits, 0.9)
    addField('density', info.density, 0.8)
    addField('location', info.location, 0.8)
    addField('city', info.city, 0.9)
    addField('county', info.county, 0.9)
    addField('state', info.state, 0.95)
    addField('setback_front', info.zoningStandards.setbackFront, 0.8)
    addField('setback_side', info.zoningStandards.setbackSide, 0.8)
    addField('setback_rear', info.zoningStandards.setbackRear, 0.8)
    addField('max_height', info.zoningStandards.maxHeight, 0.8)
    addField('site_coverage', info.zoningStandards.siteCoverage, 0.8)
    addField('min_lot_area', info.zoningStandards.minLotArea, 0.8)

    // Add parcel numbers
    info.parcelNumbers.forEach((parcel: string, index: number) => {
      addField(`parcel_${index + 1}`, parcel, 0.9)
    })

    // Add contacts
    info.contacts.forEach((contact: any, index: number) => {
      addField(`contact_${index + 1}_name`, contact.name, 0.9)
      addField(`contact_${index + 1}_email`, contact.email, 0.95)
      addField(`contact_${index + 1}_phone`, contact.phone, 0.95)
    })
  })

  // Reconcile each field
  const reconciledFields: ReconciledField[] = []
  const conflicts: any[] = []

  Object.entries(fieldCollections).forEach(([fieldName, sources]) => {
    if (sources.length === 0) return

    if (sources.length === 1) {
      // Single source - no conflict
      reconciledFields.push({
        fieldName,
        finalValue: sources[0].value,
        confidence: sources[0].confidence,
        sources,
        conflictResolution: 'consensus',
        notes: [`Single source: ${sources[0].documentName}`]
      })
    } else {
      // Multiple sources - check for conflicts
      const uniqueValues = [...new Set(sources.map(s => s.value.toLowerCase()))]

      if (uniqueValues.length === 1) {
        // Consensus across documents
        const avgConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length
        reconciledFields.push({
          fieldName,
          finalValue: sources[0].value,
          confidence: Math.min(avgConfidence * 1.2, 1.0), // Boost confidence for consensus
          sources,
          conflictResolution: 'consensus',
          notes: [`Consensus across ${sources.length} documents`]
        })
      } else {
        // Conflict - use highest confidence value
        const bestSource = sources.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        )

        reconciledFields.push({
          fieldName,
          finalValue: bestSource.value,
          confidence: bestSource.confidence * 0.9, // Reduce confidence due to conflict
          sources,
          conflictResolution: 'highest_confidence',
          notes: [`Conflict resolved using highest confidence source: ${bestSource.documentName}`]
        })

        conflicts.push({
          fieldName,
          conflictingSources: sources,
          recommendation: `Using value "${bestSource.value}" from ${bestSource.documentName} (highest confidence: ${bestSource.confidence})`,
          requiresManualReview: true
        })
      }
    }
  })

  // Build consolidated extracted data
  const extractedData: any = {
    project_location: {
      addresses: [],
      legal_descriptions: [],
    },
    parcel_data: [],
    development_info: {
      land_uses: [],
      phases: []
    },
    zoning_standards: {},
    contacts: []
  }

  // Map reconciled fields back to structured data
  reconciledFields.forEach(field => {
    const value = field.finalValue

    switch (field.fieldName) {
      case 'project_name':
        extractedData.project_name = value
        break
      case 'total_acres':
        extractedData.total_acres = parseFloat(value)
        break
      case 'net_acres':
        extractedData.net_acres = parseFloat(value)
        break
      case 'total_units':
        extractedData.development_info.units_planned = parseInt(value)
        break
      case 'location':
        extractedData.project_location.addresses.push(value)
        break
      case 'city':
        extractedData.project_location.city = value
        break
      case 'county':
        extractedData.project_location.county = value
        break
      case 'state':
        extractedData.project_location.state = value
        break
      case 'setback_front':
        extractedData.zoning_standards.setback_front = parseFloat(value)
        break
      case 'setback_side':
        extractedData.zoning_standards.setback_side = parseFloat(value)
        break
      case 'setback_rear':
        extractedData.zoning_standards.setback_rear = parseFloat(value)
        break
      case 'max_height':
        extractedData.zoning_standards.max_height = parseFloat(value)
        break
      case 'site_coverage':
        extractedData.zoning_standards.site_coverage = parseFloat(value)
        break
      case 'min_lot_area':
        extractedData.zoning_standards.min_lot_area = parseFloat(value)
        break
    }

    // Handle parcel numbers
    if (field.fieldName.startsWith('parcel_')) {
      extractedData.parcel_data.push({
        parcel_id: value,
        acres: 0, // Would need additional logic to map acreage
        land_use: 'residential' // Default
      })
    }

    // Handle contacts
    if (field.fieldName.includes('contact_') && field.fieldName.includes('_name')) {
      const contactIndex = parseInt(field.fieldName.split('_')[1]) - 1
      if (!extractedData.contacts[contactIndex]) {
        extractedData.contacts[contactIndex] = {}
      }
      extractedData.contacts[contactIndex].name = value
    }
  })

  const processingNotes = [
    `Reconciled data from ${successfulAnalyses.length} documents`,
    `Found ${reconciledFields.length} fields total`,
    `Detected ${conflicts.length} conflicts requiring attention`,
    ...conflicts.map(c => `Conflict in ${c.fieldName}: ${c.recommendation}`)
  ]

  return {
    reconciledFields,
    conflicts,
    extractedData,
    processingNotes
  }
}