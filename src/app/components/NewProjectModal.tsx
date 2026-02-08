'use client'

console.log("=== MODAL VERSION 2025-01-14 ===")

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type FieldErrors, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProjectContext } from './ProjectProvider'
import LocationSection from './new-project/LocationSection'
import PropertyDataSection from './new-project/PropertyDataSection'
import LandscaperPanel, { type ExtractedFields } from './new-project/LandscaperPanel'
import type { NewProjectFormData } from './new-project/types'
import { emptyFormDefaults, newProjectSchema } from './new-project/validation'
import { usePersistentForm, clearPersistedForm } from './new-project/usePersistentForm'
import { generateProjectName } from './new-project/utils'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

type NewProjectModalProps = {
  isOpen: boolean
  onClose: () => void
  initialFiles?: File[]
}

const getNumeric = (value: string) => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

type SectionKey = 'asset' | 'configure' | 'location' | 'propertyData'

// Analysis Type options (new orthogonal taxonomy - what the user is doing)
const ANALYSIS_TYPE_OPTIONS = [
  { value: 'VALUATION', label: 'Valuation', description: 'Market value opinion', icon: '📈' },
  { value: 'INVESTMENT', label: 'Investment', description: 'Acquisition analysis', icon: '💰' },
  { value: 'VALUE_ADD', label: 'Value-Add', description: 'Acquisition with renovation upside', icon: '🔧' },
  { value: 'DEVELOPMENT', label: 'Development', description: 'Ground-up returns', icon: '🔨' },
  { value: 'FEASIBILITY', label: 'Feasibility', description: 'Go/no-go decision', icon: '✅' }
]

const FIELD_SECTION_MAP: Record<string, SectionKey> = {
  analysis_type: 'asset',
  property_category: 'asset',
  development_type: 'asset',
  project_type_code: 'asset',
  property_subtype: 'configure',
  property_class: 'configure',
  project_name: 'configure',
  location_mode: 'location',
  single_line_address: 'location',
  street_address: 'location',
  city: 'location',
  state: 'location',
  zip: 'location',
  cross_streets: 'location',
  latitude: 'location',
  longitude: 'location',
  total_units: 'propertyData',
  building_sf: 'propertyData',
  site_area: 'propertyData',
  site_area_unit: 'propertyData',
  total_lots_units: 'propertyData',
  density: 'propertyData',
  scale_input_method: 'propertyData',
  analysis_start_date: 'propertyData'
}

const LAND_SUBTYPE_OPTIONS = [
  { value: 'MPC', label: 'Master Planned Community' },
  { value: 'INFILL', label: 'Infill Subdivision' },
  { value: 'LAND_BANK', label: 'Land Banking' },
  { value: 'LOT_DEVELOPMENT', label: 'Lot Development' },
  { value: 'ENTITLED_LAND', label: 'Entitled Land Sale' }
]

const INCOME_SUBTYPE_OPTIONS = [
  { value: 'MULTIFAMILY', label: 'Multifamily' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'MIXED_USE', label: 'Mixed Use' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'SELF_STORAGE', label: 'Self Storage' }
]

const PROPERTY_CLASS_OPTIONS = [
  { value: 'CLASS_A', label: 'Class A' },
  { value: 'CLASS_B', label: 'Class B' },
  { value: 'CLASS_C', label: 'Class C' },
  { value: 'CLASS_D', label: 'Class D' }
]

const collectErrorFieldNames = (errors: FieldErrors<NewProjectFormData>): string[] => {
  const fields: string[] = []
  Object.entries(errors).forEach(([key, value]) => {
    if (!value) return
    if (typeof value === 'object' && ('message' in value || 'type' in value)) {
      fields.push(key)
    } else if (typeof value === 'object') {
      collectErrorFieldNames(value as FieldErrors<NewProjectFormData>).forEach(child => {
        fields.push(`${key}.${child}`)
      })
    }
  })
  return fields
}

const getSectionForField = (fieldName: string): SectionKey | undefined => {
  const root = fieldName.split('.')[0]
  return FIELD_SECTION_MAP[root]
}

const NewProjectModal = ({ isOpen, onClose, initialFiles }: NewProjectModalProps) => {
  const router = useRouter()
  const { refreshProjects, selectProject } = useProjectContext()

  // Debug logging
  console.log('[NewProjectModal] Rendered with:', {
    isOpen,
    hasInitialFiles: !!initialFiles,
    fileCount: initialFiles?.length || 0,
    fileNames: initialFiles?.map(f => f.name) || []
  })

  const form = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    mode: 'onChange',
    defaultValues: emptyFormDefaults
  })

  usePersistentForm(form)

  const {
    watch,
    reset,
    setValue,
    setFocus,
    register,
    formState: { isDirty, errors }
  } = form

  const formData = watch()
  const analysisType = watch('analysis_type') // What the user is doing (VALUATION, INVESTMENT, etc.)
  const propertyCategory = watch('property_category') // What the asset is (Land Development, Income Property)
  const subtypeOptions = useMemo(() => {
    if (propertyCategory === 'Land Development') return LAND_SUBTYPE_OPTIONS
    if (propertyCategory === 'Income Property') return INCOME_SUBTYPE_OPTIONS
    return []
  }, [propertyCategory])

  const showPropertyClass = propertyCategory === 'Income Property'
  const [subtypeFocused, setSubtypeFocused] = useState(false)
  const [classFocused, setClassFocused] = useState(false)
  const hasSubtypeValue = Boolean(formData.property_subtype)
  const hasClassValue = Boolean(formData.property_class)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [invalidSections, setInvalidSections] = useState<SectionKey[]>([])
  const [extractedFieldKeys, setExtractedFieldKeys] = useState<Set<string>>(new Set())
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([])

  const assetSectionRef = useRef<HTMLDivElement>(null)
  const locationSectionRef = useRef<HTMLDivElement>(null)
  const propertyDataSectionRef = useRef<HTMLDivElement>(null)

  const sectionRefs: Record<SectionKey, React.RefObject<HTMLDivElement>> = {
    asset: assetSectionRef,
    configure: assetSectionRef,
    location: locationSectionRef,
    propertyData: propertyDataSectionRef
  }

  useEffect(() => {
    if (!isOpen) {
      setGlobalError(null)
      setInvalidSections([])
    }
  }, [isOpen])

  const previousPropertyCategory = useRef<string | null>(null)
  // Track whether current property_subtype was set by extraction (don't clear it)
  const subtypeFromExtraction = useRef<boolean>(false)

  // Effect to handle property_category changes (cascading subtypes)
  useEffect(() => {
    if (previousPropertyCategory.current === propertyCategory) return

    setValue('development_type', propertyCategory || '', { shouldDirty: false })

    const hasChanged = previousPropertyCategory.current !== null

    // Don't clear property_subtype if it was set from extraction
    // (extraction sets property_category, which triggers this effect)
    if (!subtypeFromExtraction.current) {
      setValue('property_subtype', '', {
        shouldDirty: hasChanged,
        shouldValidate: hasChanged
      })
      setValue('project_type_code', '', { shouldDirty: hasChanged })
    }
    // Reset the extraction flag after the effect runs
    subtypeFromExtraction.current = false

    if (propertyCategory !== 'Income Property' || hasChanged) {
      setValue('property_class', '', {
        shouldDirty: hasChanged,
        shouldValidate: hasChanged
      })
    }

    previousPropertyCategory.current = propertyCategory
  }, [propertyCategory, setValue])

  const invalidSectionSet = useMemo(() => new Set(invalidSections), [invalidSections])

  useEffect(() => {
    const fieldNames = collectErrorFieldNames(errors)
    if (fieldNames.length === 0) {
      setInvalidSections((prev) => (prev.length === 0 ? prev : []))
      if (globalError === 'Please complete the highlighted fields.') {
        setGlobalError(null)
      }
      return
    }
    const sections = Array.from(
      new Set(
        fieldNames
          .map((name) => getSectionForField(name))
          .filter((section): section is SectionKey => Boolean(section))
      )
    )
    setInvalidSections((prev) => {
      if (prev.length === sections.length && prev.every((value, index) => value === sections[index])) {
        return prev
      }
      return sections
    })
  }, [errors, globalError])

  // Handle document extraction - populate form fields and store pending document
  // Note: Initial files are processed by LandscaperPanel which shows proper UI feedback
  const handleDocumentExtracted = (fields: ExtractedFields, file: File) => {
    console.log('[handleDocumentExtracted] Received fields:', fields)
    console.log('[handleDocumentExtracted] File:', file.name)

    // Store the file for DMS ingestion after project creation
    setPendingDocuments(prev => {
      // Avoid duplicates by checking filename
      if (prev.some(f => f.name === file.name)) return prev
      return [...prev, file]
    })
    const fieldMapping: Record<string, keyof NewProjectFormData> = {
      // Extraction field -> Form field
      property_name: 'project_name',
      project_name: 'project_name',
      street_address: 'street_address',
      city: 'city',
      state: 'state',
      zip_code: 'zip',
      zip: 'zip',
      county: 'county',
      total_units: 'total_units',
      building_sf: 'building_sf',
      rentable_sf: 'building_sf',
      gross_sf: 'building_sf',
      site_area: 'site_area',
      site_size_acres: 'site_area',
      latitude: 'latitude',
      longitude: 'longitude',
      property_subtype: 'property_subtype',
      property_class: 'property_class',
      cross_streets: 'cross_streets',
      asking_price: 'asking_price',
      purchase_price: 'asking_price',
      list_price: 'asking_price'
    }

    const updatedKeys = new Set<string>()

    // IMPORTANT: Set property_category FIRST before property_subtype
    // The property_subtype dropdown only renders when property_category is set
    // Also set the flag to prevent the useEffect from clearing property_subtype
    if (fields.property_subtype?.value) {
      const subtype = String(fields.property_subtype.value).toUpperCase()
      const incomeTypes = ['MULTIFAMILY', 'OFFICE', 'RETAIL', 'INDUSTRIAL', 'MIXED_USE', 'HOTEL', 'SELF_STORAGE']
      const landTypes = ['MPC', 'INFILL', 'LOT_DEVELOPMENT', 'ENTITLED_LAND', 'LAND_BANK']
      if (incomeTypes.includes(subtype)) {
        console.log('[handleDocumentExtracted] Setting property_category to Income Property')
        subtypeFromExtraction.current = true  // Prevent clearing property_subtype
        setValue('property_category', 'Income Property', { shouldDirty: true, shouldValidate: true })
        updatedKeys.add('property_category')
        // Default to INVESTMENT analysis type for income properties
        if (!formData.analysis_type) {
          setValue('analysis_type', 'INVESTMENT', { shouldDirty: true, shouldValidate: true })
          updatedKeys.add('analysis_type')
        }
      } else if (landTypes.includes(subtype)) {
        console.log('[handleDocumentExtracted] Setting property_category to Land Development')
        subtypeFromExtraction.current = true  // Prevent clearing property_subtype
        setValue('property_category', 'Land Development', { shouldDirty: true, shouldValidate: true })
        updatedKeys.add('property_category')
        // Default to DEVELOPMENT analysis type for land development
        if (!formData.analysis_type) {
          setValue('analysis_type', 'DEVELOPMENT', { shouldDirty: true, shouldValidate: true })
          updatedKeys.add('analysis_type')
        }
      }
    } else if (fields.total_units?.value) {
      // Fallback: If total_units is present but no property_subtype, infer Income Property
      const units = parseInt(String(fields.total_units.value), 10)
      if (units > 0) {
        console.log('[handleDocumentExtracted] Inferred Income Property from total_units')
        subtypeFromExtraction.current = true  // Prevent clearing property_subtype
        setValue('property_category', 'Income Property', { shouldDirty: true, shouldValidate: true })
        updatedKeys.add('property_category')
        // Default to INVESTMENT analysis type for income properties
        if (!formData.analysis_type) {
          setValue('analysis_type', 'INVESTMENT', { shouldDirty: true, shouldValidate: true })
          updatedKeys.add('analysis_type')
        }
      }
    }

    // Now set all other fields (including property_subtype)
    Object.entries(fields).forEach(([extractKey, fieldData]) => {
      const formKey = fieldMapping[extractKey]
      if (formKey && fieldData?.value !== undefined && fieldData?.value !== null) {
        const value = String(fieldData.value)
        console.log(`[handleDocumentExtracted] Setting ${formKey} = ${value}`)
        setValue(formKey, value, { shouldDirty: true, shouldValidate: true })
        updatedKeys.add(formKey)
      }
    })

    // Fallback: If total_units is present but no property_subtype, set to MULTIFAMILY
    if (!updatedKeys.has('property_subtype') && fields.total_units?.value) {
      const units = parseInt(String(fields.total_units.value), 10)
      if (units > 0) {
        console.log('[handleDocumentExtracted] Inferred MULTIFAMILY from total_units')
        setValue('property_subtype', 'MULTIFAMILY', { shouldDirty: true, shouldValidate: true })
        updatedKeys.add('property_subtype')
      }
    }

    // Zipcode fallback: Try to parse from street_address if zip was not extracted
    if (!updatedKeys.has('zip') && fields.street_address?.value) {
      const addressStr = String(fields.street_address.value)
      // Look for 5-digit ZIP code pattern at the end of address
      const zipMatch = addressStr.match(/\b(\d{5})(?:-\d{4})?\s*$/);
      if (zipMatch) {
        setValue('zip', zipMatch[1], { shouldDirty: true, shouldValidate: true })
        updatedKeys.add('zip')
      }
    }

    // Also try to extract zip from city/state line if present (e.g., "Torrance, CA 90502")
    if (!updatedKeys.has('zip') && fields.city?.value && fields.state?.value) {
      const cityState = `${fields.city.value}, ${fields.state.value}`
      // Some documents include zip with city/state
      const fullAddress = fields.street_address?.value
        ? `${fields.street_address.value} ${cityState}`
        : cityState
      const zipMatch = String(fullAddress).match(/\b(\d{5})(?:-\d{4})?\b/)
      if (zipMatch) {
        setValue('zip', zipMatch[1], { shouldDirty: true, shouldValidate: true })
        updatedKeys.add('zip')
      }
    }

    setExtractedFieldKeys(updatedKeys)

    // Forward geocode address to get coordinates for map zoom
    // Only if we have address components but no lat/lng
    const hasFullAddress = fields.street_address?.value && fields.city?.value && fields.state?.value
    const hasCityState = fields.city?.value && fields.state?.value
    const hasCoords = fields.latitude?.value && fields.longitude?.value

    if (!hasCoords && (hasFullAddress || hasCityState)) {
      // Try forward geocoding with whatever address info we have
      forwardGeocodeAddress(
        fields.street_address?.value ? String(fields.street_address.value) : '',
        String(fields.city?.value || ''),
        String(fields.state?.value || ''),
        fields.zip_code?.value ? String(fields.zip_code.value) :
          (fields.zip?.value ? String(fields.zip.value) : undefined)
      )
    }
  }

  // Normalize address for better geocoding results
  // Expands abbreviations that Nominatim often fails on
  const normalizeStreetAddress = (street: string): string[] => {
    const variations: string[] = [street]

    // Direction abbreviations to expand
    const directionMap: Record<string, string> = {
      'N.': 'North', 'N ': 'North ',
      'S.': 'South', 'S ': 'South ',
      'E.': 'East', 'E ': 'East ',
      'W.': 'West', 'W ': 'West ',
      'NE': 'Northeast', 'NW': 'Northwest',
      'SE': 'Southeast', 'SW': 'Southwest'
    }

    // Street type abbreviations
    const streetTypeMap: Record<string, string> = {
      'Ave': 'Avenue', 'Ave.': 'Avenue',
      'St': 'Street', 'St.': 'Street',
      'Rd': 'Road', 'Rd.': 'Road',
      'Blvd': 'Boulevard', 'Blvd.': 'Boulevard',
      'Dr': 'Drive', 'Dr.': 'Drive',
      'Ln': 'Lane', 'Ln.': 'Lane',
      'Ct': 'Court', 'Ct.': 'Court',
      'Pl': 'Place', 'Pl.': 'Place',
      'Pkwy': 'Parkway', 'Hwy': 'Highway'
    }

    let normalized = street

    // Expand direction abbreviations
    for (const [abbr, full] of Object.entries(directionMap)) {
      if (street.includes(abbr)) {
        normalized = street.replace(abbr, full)
        if (!variations.includes(normalized)) variations.push(normalized)
      }
    }

    // Expand street type abbreviations
    for (const [abbr, full] of Object.entries(streetTypeMap)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
      if (regex.test(normalized)) {
        const expanded = normalized.replace(regex, full)
        if (!variations.includes(expanded)) variations.push(expanded)
      }
    }

    // Also try without direction prefix entirely
    const withoutDirection = street.replace(/^[NSEW]\.\s*/i, '').replace(/^(North|South|East|West)\s+/i, '')
    if (withoutDirection !== street && !variations.includes(withoutDirection)) {
      variations.push(withoutDirection)
    }

    return variations
  }

  // Forward geocode address using Google (preferred) or Nominatim (fallback)
  // Google is more accurate for US addresses
  const forwardGeocodeAddress = async (
    street: string,
    city: string,
    state: string,
    zip?: string
  ) => {
    // Build full address query
    const fullAddress = [street, city, state, zip].filter(Boolean).join(', ')
    console.log('=== GEOCODING TRACE START ===')
    console.log('GEOCODING INPUT:', { street, city, state, zip })
    console.log('GEOCODING FULL ADDRESS:', fullAddress)
    if (!fullAddress) {
      console.warn('[forwardGeocodeAddress] No address to geocode')
      return
    }

    // Helper to set coordinates and return success
    const setCoordinates = (lat: string, lon: string) => {
      console.log('=== GEOCODING RESULT ===')
      console.log('GEOCODING COORDINATES:', lat, lon)
      console.log('=== GEOCODING TRACE END ===')
      setValue('latitude', lat, { shouldDirty: true })
      setValue('longitude', lon, { shouldDirty: true })
      const currentMode = form.getValues('location_mode')
      if (currentMode !== 'address') {
        setValue('location_mode', 'address', { shouldDirty: true })
      }
    }

    // Try Google Geocoding API first (more accurate)
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY
    if (googleApiKey) {
      try {
        console.log('[forwardGeocodeAddress] Trying Google API for:', fullAddress)
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${googleApiKey}`
        const googleResponse = await fetch(googleUrl)

        if (googleResponse.ok) {
          const googleData = await googleResponse.json()
          console.log('[forwardGeocodeAddress] Google response:', googleData.status)

          if (googleData.status === 'OK' && googleData.results?.length > 0) {
            const location = googleData.results[0].geometry.location
            const parsedLat = parseFloat(location.lat).toFixed(6)
            const parsedLon = parseFloat(location.lng).toFixed(6)
            console.log('[forwardGeocodeAddress] Google result:', parsedLat, parsedLon, googleData.results[0].formatted_address)
            console.log('=== GEOCODING RESULT (Google) ===')
            console.log('GEOCODING COORDINATES:', parsedLat, parsedLon)
            console.log('=== GEOCODING TRACE END ===')
            setCoordinates(parsedLat, parsedLon)
            return
          } else if (googleData.status !== 'OK') {
            console.warn('[forwardGeocodeAddress] Google API error status:', googleData.status, googleData.error_message || '')
          }
        }
      } catch (error) {
        console.error('[forwardGeocodeAddress] Google API error:', error)
      }
    }

    // Fallback to Nominatim (OpenStreetMap) with address normalization
    console.log('[forwardGeocodeAddress] Falling back to Nominatim with address normalization')

    // Generate normalized street variations
    const streetVariations = street ? normalizeStreetAddress(street) : ['']
    const queries: string[] = []

    // Build query variations with normalized addresses
    for (const streetVar of streetVariations) {
      if (streetVar && city && state) {
        queries.push(`${streetVar}, ${city}, ${state}, USA`)
        if (zip) queries.push(`${streetVar}, ${city}, ${state} ${zip}, USA`)
      }
    }

    // Add city/state fallbacks (but these are less accurate)
    if (city && state && zip) {
      queries.push(`${city}, ${state} ${zip}, USA`)
    }

    // First try structured search (more accurate for addresses)
    if (street && city && state) {
      try {
        // Build structured query URL - Nominatim structured search is more precise
        const structuredUrl = new URL('https://nominatim.openstreetmap.org/search')
        structuredUrl.searchParams.set('street', street)
        structuredUrl.searchParams.set('city', city)
        structuredUrl.searchParams.set('state', state)
        if (zip) structuredUrl.searchParams.set('postalcode', zip)
        structuredUrl.searchParams.set('country', 'USA')
        structuredUrl.searchParams.set('format', 'json')
        structuredUrl.searchParams.set('limit', '1')
        structuredUrl.searchParams.set('addressdetails', '1')

        console.log('[forwardGeocodeAddress] Trying Nominatim STRUCTURED query:', structuredUrl.toString())

        const structuredResponse = await fetch(structuredUrl.toString(), {
          headers: { 'User-Agent': 'Landscape-App/1.0' }
        })

        if (structuredResponse.ok) {
          const structuredResults = await structuredResponse.json()
          console.log('[forwardGeocodeAddress] Nominatim structured results:', structuredResults?.length || 0)

          if (structuredResults && structuredResults.length > 0) {
            const result = structuredResults[0]
            const { lat, lon, display_name, address } = result

            // With structured search, verify the city matches
            const resultCity = (address?.city || address?.town || address?.municipality || '').toLowerCase()
            const inputCityLower = city.toLowerCase()

            console.log('[forwardGeocodeAddress] Structured result address:', address)
            console.log('[forwardGeocodeAddress] City comparison:', { resultCity, inputCityLower })

            // Accept if the city matches OR if display_name contains our city
            if (resultCity === inputCityLower || display_name.toLowerCase().includes(inputCityLower)) {
              const parsedLat = parseFloat(lat).toFixed(6)
              const parsedLon = parseFloat(lon).toFixed(6)
              console.log('[forwardGeocodeAddress] Nominatim STRUCTURED matched:', display_name)
              console.log('=== GEOCODING RESULT ===')
              console.log('GEOCODING COORDINATES:', parsedLat, parsedLon)
              console.log('=== GEOCODING TRACE END ===')
              setCoordinates(parsedLat, parsedLon)
              return
            } else {
              console.log('[forwardGeocodeAddress] Structured result rejected - city mismatch:', { resultCity, inputCityLower })
            }
          }
        }
      } catch (error) {
        console.error('[forwardGeocodeAddress] Nominatim structured error:', error)
      }
    }

    // Fallback to free-form queries
    for (const query of queries) {
      try {
        console.log('[forwardGeocodeAddress] Trying Nominatim free-form query:', query)

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`,
          {
            headers: {
              'User-Agent': 'Landscape-App/1.0'
            }
          }
        )

        if (!response.ok) {
          console.warn('[forwardGeocodeAddress] Nominatim failed:', response.status)
          continue
        }

        const results = await response.json()
        console.log('[forwardGeocodeAddress] Nominatim free-form results:', results?.length || 0)

        if (results && results.length > 0) {
          const { lat, lon, display_name } = results[0]

          // Validate result is actually in the expected city AND contains street info
          const displayLower = (display_name || '').toLowerCase()
          const cityLower = city.toLowerCase()

          // Extract street number from input for validation
          const streetNumberMatch = street.match(/^(\d+)/)
          const inputStreetNumber = streetNumberMatch ? streetNumberMatch[1] : null

          // Check if display_name contains the street number (if we have one)
          // This prevents accepting results that are just city-center or wrong street
          const hasStreetNumber = inputStreetNumber ? displayLower.includes(inputStreetNumber) : true

          // Also check if the city name appears in the result
          // For Torrance, we need "torrance" in the display_name, not just nearby cities
          const hasCityName = displayLower.includes(cityLower)

          console.log('[forwardGeocodeAddress] Nominatim validation:', {
            display_name,
            inputStreetNumber,
            hasStreetNumber,
            hasCityName,
            cityLower
          })

          // Require BOTH city match AND street number match (if street number provided)
          if (hasCityName && hasStreetNumber) {
            const parsedLat = parseFloat(lat).toFixed(6)
            const parsedLon = parseFloat(lon).toFixed(6)
            console.log('[forwardGeocodeAddress] Nominatim matched:', display_name)
            console.log('=== GEOCODING RESULT ===')
            console.log('GEOCODING COORDINATES:', parsedLat, parsedLon)
            console.log('=== GEOCODING TRACE END ===')
            setCoordinates(parsedLat, parsedLon)
            return
          } else {
            console.log('[forwardGeocodeAddress] Nominatim result rejected:', {
              reason: !hasCityName ? 'wrong city' : 'wrong street number',
              display_name
            })
          }
        }
      } catch (error) {
        console.error('[forwardGeocodeAddress] Nominatim error:', query, error)
      }
    }

    console.warn('[forwardGeocodeAddress] All geocoding attempts failed - coordinates will need manual entry')
    console.log('=== GEOCODING FAILED - NO RESULT ===')
  }

  const closeModal = () => {
    if (isSubmitting) return

    const hasData = isDirty
    if (hasData) {
      const confirmed = window.confirm('Discard new project setup? Your progress will be saved locally.')
      if (!confirmed) return
    }

    onClose()
  }

  const resetFormState = () => {
    clearPersistedForm()
    reset(emptyFormDefaults)
  }

  const handleCreationSuccess = async (projectId: number) => {
    // Collect all files to upload (pendingDocuments + any initialFiles not already included)
    const filesToUpload: File[] = [...pendingDocuments]

    if (initialFiles && initialFiles.length > 0) {
      const pendingNames = new Set(pendingDocuments.map(d => d.name))
      for (const file of initialFiles) {
        if (!pendingNames.has(file.name)) {
          filesToUpload.push(file)
        }
      }
    }

    console.log(`[handleCreationSuccess] Total files to upload: ${filesToUpload.length}`)
    console.log(`[handleCreationSuccess] File names:`, filesToUpload.map(f => f.name))

    // Upload all documents to DMS with deep extraction
    // Use Promise.allSettled to start all uploads and wait for them to complete
    if (filesToUpload.length > 0) {
      const uploadPromises = filesToUpload.map(async (doc) => {
        const dmsFormData = new FormData()
        dmsFormData.append('file', doc)
        dmsFormData.append('project_id', projectId.toString())

        // Detect document type from filename
        // Map to DMS folder names from Commercial / Multifam template:
        // {Offering, Property Data, Market Data, Diligence, Agreements, Leases, Title & Survey, Operations, Corresponsdence, Accounting, Misc}
        const nameLower = doc.name.toLowerCase()
        let docType = 'Misc'
        if (nameLower.includes('rent') || nameLower.includes('roll')) {
          docType = 'Property Data'  // Rent rolls go to Property Data folder
        } else if (nameLower.includes('t-12') || nameLower.includes('t12') || nameLower.includes('operating')) {
          docType = 'Operations'  // T-12 / Operating statements go to Operations folder
        } else if (nameLower.includes('om') || nameLower.includes('offering') || nameLower.includes('memorandum')) {
          docType = 'Offering'  // OMs go to Offering folder
        } else if (nameLower.includes('lease')) {
          docType = 'Leases'
        } else if (nameLower.includes('survey') || nameLower.includes('title')) {
          docType = 'Title & Survey'
        } else if (nameLower.includes('market') || nameLower.includes('comp')) {
          docType = 'Market Data'
        } else if (nameLower.includes('agreement') || nameLower.includes('contract') || nameLower.includes('psa')) {
          docType = 'Agreements'
        }

        dmsFormData.append('doc_type', docType)
        dmsFormData.append('run_full_extraction', 'true')

        console.log(`[handleCreationSuccess] Starting upload: ${doc.name} as ${docType}`)

        const response = await fetch('/api/dms/upload', {
          method: 'POST',
          body: dmsFormData
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[handleCreationSuccess] Upload failed for ${doc.name}:`, response.status, errorText)
          throw new Error(`Upload failed: ${response.status}`)
        }

        const result = await response.json()
        console.log(`[handleCreationSuccess] Upload success for ${doc.name}:`, result)
        return { file: doc.name, result }
      })

      // Wait for all uploads to complete (or fail)
      const results = await Promise.allSettled(uploadPromises)
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      console.log(`[handleCreationSuccess] Upload results: ${succeeded} succeeded, ${failed} failed`)
    }

    await refreshProjects()
    selectProject(projectId)
    resetFormState()
    setPendingDocuments([])
    onClose()
    router.push(`/projects/${projectId}`)
  }

  const submitProject = async () => {
    await form.handleSubmit(onSubmit, handleInvalidSubmit)()
  }

  const onSubmit = async (data: NewProjectFormData) => {
    console.log('[onSubmit] Starting project creation with data:', data)
    console.log('[onSubmit] pendingDocuments:', pendingDocuments.map(f => f.name))
    setIsSubmitting(true)
    setGlobalError(null)

    try {
      const projectName = generateProjectName(data)
      // For Land Development, always use 'LAND' as the project_type_code
      // For Income Property, map property_subtype to valid codes
      const getProjectTypeCode = () => {
        if (data.property_category === 'Land Development') {
          return 'LAND'
        }
        // Map Income Property subtypes to valid project_type_codes
        const subtypeMap: Record<string, string> = {
          'MULTIFAMILY': 'MF',
          'OFFICE': 'OFF',
          'RETAIL': 'RET',
          'INDUSTRIAL': 'IND',
          'HOTEL': 'HTL',
          'MIXED_USE': 'MXU',
          'SELF_STORAGE': 'IND' // Map to Industrial
        }
        return subtypeMap[data.property_subtype || ''] || 'MF'
      }
      const projectTypeCode = getProjectTypeCode()
      const payload = {
        project_name: projectName,
        analysis_type: data.analysis_type, // New orthogonal value (VALUATION, INVESTMENT, etc.)
        property_subtype: data.property_subtype || undefined,
        property_class: data.property_class || undefined,
        development_type: data.property_category, // Backwards compatibility
        project_type_code: projectTypeCode,
        street_address: data.street_address || undefined,
        cross_streets: data.cross_streets || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip_code: data.zip || undefined,
        county: data.county || undefined,
        latitude: getNumeric(data.latitude),
        longitude: getNumeric(data.longitude),
        site_area: getNumeric(data.site_area),
        site_area_unit: data.site_area_unit,
        total_units: getNumeric(data.total_units),
        gross_sf: getNumeric(data.building_sf),
        analysis_start_date: data.analysis_start_date || undefined,
        asking_price: getNumeric(data.asking_price)
      }

      const response = await fetch('/api/projects/minimal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to create project')
      }

      const { project } = await response.json() as { project: { project_id: number } }
      await handleCreationSuccess(project.project_id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error creating project'
      setGlobalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToSection = (section: SectionKey) => {
    const ref = sectionRefs[section]
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleInvalidSubmit = (formErrors: FieldErrors<NewProjectFormData>) => {
    console.log('[handleInvalidSubmit] Form validation failed with errors:', formErrors)
    setIsSubmitting(false)
    const fieldNames = collectErrorFieldNames(formErrors)
    if (fieldNames.length === 0) return
    const primaryField = fieldNames[0]
    const rootField = primaryField.split('.')[0] as keyof NewProjectFormData
    setFocus(rootField as Path<NewProjectFormData>)
    const section = getSectionForField(primaryField)
    if (section) {
      scrollToSection(section)
    }
    const sections = Array.from(
      new Set(
        fieldNames
          .map((name) => getSectionForField(name))
          .filter((value): value is SectionKey => Boolean(value))
      )
    )
    setInvalidSections(sections)
    setGlobalError('Please complete the highlighted fields.')
  }

  // Calculate implied density for display
  const siteArea = formData.site_area ? Number(formData.site_area) : 0
  const totalUnits = formData.total_lots_units ? Number(formData.total_lots_units) : 0
  const impliedDensity = siteArea > 0 && totalUnits > 0 ? (totalUnits / siteArea).toFixed(2) : null

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 1055 }}
    >
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }}
        onClick={closeModal}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="position-relative d-flex flex-column overflow-hidden border"
        style={{
          maxHeight: '90vh',
          width: '95vw',
          maxWidth: '80rem',
          borderRadius: 'var(--cui-card-border-radius)',
          borderColor: 'var(--cui-border-color)',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          boxShadow: 'var(--cui-box-shadow-lg)',
        }}
      >
        {/* Header */}
        <header
          className="card-header d-flex align-items-center justify-content-between"
          style={{
            borderColor: 'var(--cui-border-color)',
            color: 'var(--cui-body-color)',
          }}
        >
          <div>
            <h2 className="mb-0 fw-bold" style={{ fontSize: '1rem', lineHeight: 1.25 }}>Create Project</h2>
          </div>
          <button
            type="button"
            onClick={closeModal}
            disabled={isSubmitting}
            className="btn btn-sm p-1 d-flex align-items-center justify-content-center"
            style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--cui-secondary-color)' }}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </header>

        {/* Two-column layout */}
        <div className="d-flex flex-grow-1 overflow-hidden">
          {/* Left column - Form (60%) */}
          <div
            className="flex-grow-1 overflow-auto border-end p-4"
            style={{ flexBasis: '60%' }}
          >
            <div className="d-flex flex-column" style={{ gap: '1rem', maxWidth: '42rem' }}>
              {/* Analysis Type Selector (what the user is doing) */}
              <div ref={assetSectionRef}>
                <label className="form-label fw-medium mb-3" style={{ color: 'var(--cui-body-color)' }}>
                  Analysis Type
                </label>
                <div
                  className="w-100"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.375rem' }}
                >
                  {ANALYSIS_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('analysis_type', opt.value as 'VALUATION' | 'INVESTMENT' | 'DEVELOPMENT' | 'FEASIBILITY', { shouldDirty: true, shouldValidate: true })}
                      className="btn d-flex align-items-center justify-content-center gap-1 px-1 py-1 rounded"
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        transition: 'all 150ms ease',
                        borderColor: analysisType === opt.value ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                        backgroundColor: analysisType === opt.value ? 'var(--cui-primary)' : 'var(--cui-tertiary-bg)',
                        color: analysisType === opt.value ? 'var(--cui-primary-text)' : 'var(--cui-body-color)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
                {errors.analysis_type && (
                  <p className="mt-2 small" style={{ color: 'var(--cui-danger)', fontSize: '0.75rem' }}>
                    {errors.analysis_type.message as string}
                  </p>
                )}
              </div>

              {/* Property Category Toggle (what the asset is) */}
              <div>
                <label className="form-label fw-medium mb-3" style={{ color: 'var(--cui-body-color)' }}>
                  Property Category
                </label>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('property_category', 'Land Development', { shouldDirty: true, shouldValidate: true })}
                    className="btn flex-grow-1 px-4 py-2 rounded"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 150ms ease',
                      borderColor:
                        propertyCategory === 'Land Development'
                          ? 'var(--cui-success)'
                          : 'var(--cui-border-color)',
                      backgroundColor:
                        propertyCategory === 'Land Development'
                          ? 'var(--cui-success)'
                          : 'var(--cui-tertiary-bg)',
                      color:
                        propertyCategory === 'Land Development'
                          ? 'var(--cui-primary-text)'
                          : 'var(--cui-body-color)',
                    }}
                  >
                    Land Development
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('property_category', 'Income Property', { shouldDirty: true, shouldValidate: true })}
                    className="btn flex-grow-1 px-4 py-2 rounded"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 150ms ease',
                      borderColor:
                        propertyCategory === 'Income Property'
                          ? 'var(--cui-success)'
                          : 'var(--cui-border-color)',
                      backgroundColor:
                        propertyCategory === 'Income Property'
                          ? 'var(--cui-success)'
                          : 'var(--cui-tertiary-bg)',
                      color:
                        propertyCategory === 'Income Property'
                          ? 'var(--cui-primary-text)'
                          : 'var(--cui-body-color)',
                    }}
                  >
                    Income Property
                  </button>
                </div>
                {errors.property_category && (
                  <p className="mt-2 small" style={{ color: 'var(--cui-danger)', fontSize: '0.75rem' }}>
                    {errors.property_category.message as string}
                  </p>
                )}
              </div>

              {/* Property Subtype & Class (Income Property only) */}
              {propertyCategory === 'Income Property' && (
                <div
                  className="w-100"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}
                >
                  <div>
                    <div className="position-relative">
                      <select
                        value={formData.property_subtype}
                        onFocus={() => setSubtypeFocused(true)}
                        onBlur={() => setSubtypeFocused(false)}
                        onChange={(event) => {
                          const value = event.target.value
                          setValue('property_subtype', value, { shouldDirty: true, shouldValidate: true })
                          setValue('project_type_code', value, { shouldDirty: true })
                        }}
                        className="form-select pe-5"
                        style={{
                          borderColor: 'var(--cui-border-color)',
                          backgroundColor: 'var(--cui-card-bg)',
                          color: 'var(--cui-body-color)',
                          fontSize: '0.875rem',
                          paddingTop: '1rem',
                          paddingBottom: '0.375rem',
                        }}
                      >
                        <option value="">Select property type (optional)</option>
                        {subtypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <label
                        className="position-absolute start-0 pointer-events-none"
                        style={{
                          marginLeft: '0.75rem',
                          transition: 'all 0.2s ease',
                          top: subtypeFocused || hasSubtypeValue ? '0.25rem' : '0.625rem',
                          fontSize: subtypeFocused || hasSubtypeValue ? '0.625rem' : '0.75rem',
                          color:
                            subtypeFocused || hasSubtypeValue
                              ? 'var(--cui-primary)'
                              : 'var(--cui-secondary-color)',
                        }}
                      >
                        Property Type
                      </label>
                      <div
                        className="pointer-events-none position-absolute top-50 translate-middle-y"
                        style={{ right: '0.75rem', color: 'var(--cui-secondary-color)' }}
                      >
                        <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {errors.property_subtype && (
                        <p className="mt-1 small" style={{ color: 'var(--cui-danger)', fontSize: '0.75rem' }}>
                          {errors.property_subtype.message as string}
                        </p>
                      )}
                    </div>
                  </div>

                  {showPropertyClass && (
                    <div>
                      <div className="position-relative">
                        <select
                          value={formData.property_class}
                          onFocus={() => setClassFocused(true)}
                          onBlur={() => setClassFocused(false)}
                          onChange={(event) => {
                            const value = event.target.value
                            setValue('property_class', value, { shouldDirty: true, shouldValidate: true })
                          }}
                          className="form-select pe-5"
                          style={{
                            borderColor: 'var(--cui-border-color)',
                            backgroundColor: 'var(--cui-card-bg)',
                            color: 'var(--cui-body-color)',
                            fontSize: '0.875rem',
                            paddingTop: '1rem',
                            paddingBottom: '0.375rem',
                          }}
                        >
                          <option value="">Select property class (optional)</option>
                          {PROPERTY_CLASS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <label
                          className="position-absolute start-0 pointer-events-none"
                          style={{
                            marginLeft: '0.75rem',
                            transition: 'all 0.2s ease',
                            top: classFocused || hasClassValue ? '0.25rem' : '0.625rem',
                            fontSize: classFocused || hasClassValue ? '0.625rem' : '0.75rem',
                            color:
                              classFocused || hasClassValue
                                ? 'var(--cui-primary)'
                                : 'var(--cui-secondary-color)',
                          }}
                        >
                          Property Class
                        </label>
                        <div
                          className="pointer-events-none position-absolute top-50 translate-middle-y"
                          style={{ right: '0.75rem', color: 'var(--cui-secondary-color)' }}
                        >
                          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {errors.property_class && (
                          <p className="mt-1 small" style={{ color: 'var(--cui-danger)', fontSize: '0.75rem' }}>
                            {errors.property_class.message as string}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Project Name - Floating Label */}
              <div className="position-relative">
                <input
                  {...register('project_name')}
                  id="project-name"
                  placeholder=" "
                  className="form-control"
                  style={{
                    borderColor: extractedFieldKeys.has('project_name')
                      ? 'var(--cui-primary)'
                      : 'var(--cui-border-color)',
                    backgroundColor: extractedFieldKeys.has('project_name')
                      ? 'var(--cui-primary-bg-subtle)'
                      : 'var(--cui-card-bg)',
                    color: 'var(--cui-body-color)',
                    fontSize: '0.875rem',
                    paddingTop: '1rem',
                    paddingBottom: '0.375rem',
                    boxShadow: extractedFieldKeys.has('project_name')
                      ? '0 0 0 0.125rem rgba(var(--cui-primary-rgb), 0.25)'
                      : undefined,
                  }}
                />
                <label
                  htmlFor="project-name"
                  className="position-absolute start-0 pointer-events-none"
                  style={{
                    marginLeft: '0.75rem',
                    transition: 'all 0.2s ease',
                    top: watch('project_name') ? '0.25rem' : '0.625rem',
                    fontSize: watch('project_name') ? '0.625rem' : '0.75rem',
                    color: watch('project_name') ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                  }}
                >
                  Project Name (optional)
                </label>
                {extractedFieldKeys.has('project_name') && (
                  <span
                    className="position-absolute top-50 translate-middle-y end-0 me-3"
                    style={{ fontSize: '0.75rem', color: 'var(--cui-primary)' }}
                  >
                    Auto-filled
                  </span>
                )}
              </div>

              {/* Location Section */}
              <div ref={locationSectionRef} className="pt-2">
                <div className="d-flex align-items-baseline gap-2 mb-3">
                  <h3 className="small fw-medium mb-0" style={{ color: 'var(--cui-body-color)' }}>Location</h3>
                  <span className="small" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
                    Click on the map to place a pin, or drag to adjust
                  </span>
                </div>
                <LocationSection
                  form={form}
                  analysisType={analysisType}
                  isDark={false}
                  hasError={invalidSectionSet.has('location')}
                  extractedFieldKeys={extractedFieldKeys}
                />
              </div>

              {/* Property Data Section */}
              <div ref={propertyDataSectionRef} className="pt-2">
                <h3 className="small fw-medium mb-3" style={{ color: 'var(--cui-body-color)' }}>Property Data</h3>
                <PropertyDataSection
                  form={form}
                  isDark={false}
                  hasError={invalidSectionSet.has('propertyData')}
                  extractedFieldKeys={extractedFieldKeys}
                />
              </div>

              {/* Asking Price Field */}
              <div className="pt-2">
                <div className="position-relative">
                  <input
                    {...register('asking_price')}
                    id="asking-price"
                    type="text"
                    inputMode="numeric"
                    placeholder=" "
                    onChange={(e) => {
                      // Format as currency while typing
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      const formatted = value ? `$${Number(value).toLocaleString()}` : ''
                      setValue('asking_price', value, { shouldDirty: true })
                      e.target.value = formatted
                    }}
                    onFocus={(e) => {
                      // Remove formatting on focus for easier editing
                      const value = formData.asking_price
                      if (value) {
                        e.target.value = value
                      }
                    }}
                    onBlur={(e) => {
                      // Re-apply formatting on blur
                      const value = formData.asking_price
                      if (value) {
                        e.target.value = `$${Number(value).toLocaleString()}`
                      }
                    }}
                    defaultValue={formData.asking_price ? `$${Number(formData.asking_price).toLocaleString()}` : ''}
                    className="form-control"
                    style={{
                      borderColor: extractedFieldKeys.has('asking_price')
                        ? 'var(--cui-primary)'
                        : 'var(--cui-border-color)',
                      backgroundColor: extractedFieldKeys.has('asking_price')
                        ? 'var(--cui-primary-bg-subtle)'
                        : 'var(--cui-card-bg)',
                      color: 'var(--cui-body-color)',
                      fontSize: '0.875rem',
                      paddingTop: '1rem',
                      paddingBottom: '0.375rem',
                      boxShadow: extractedFieldKeys.has('asking_price')
                        ? '0 0 0 0.125rem rgba(var(--cui-primary-rgb), 0.25)'
                        : undefined,
                    }}
                  />
                  <label
                    htmlFor="asking-price"
                    className="position-absolute start-0 pointer-events-none"
                    style={{
                      marginLeft: '0.75rem',
                      transition: 'all 0.2s ease',
                      top: watch('asking_price') ? '0.25rem' : '0.625rem',
                      fontSize: watch('asking_price') ? '0.625rem' : '0.75rem',
                      color: watch('asking_price') ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                    }}
                  >
                    Asking Price (optional)
                  </label>
                  {extractedFieldKeys.has('asking_price') && (
                    <span
                      className="position-absolute top-50 translate-middle-y end-0 me-3"
                      style={{ fontSize: '0.75rem', color: 'var(--cui-primary)' }}
                    >
                      Auto-filled
                    </span>
                  )}
                </div>
                <p className="mt-1 small" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
                  Initial estimate. Will be replaced by actual costs once acquisition closes.
                </p>
              </div>

              {/* Implied Density Display */}
              {propertyCategory === 'Land Development' && impliedDensity && (
                <div className="rounded px-4 py-3" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>Implied Density</span>
                    <span className="fw-semibold" style={{ fontSize: '1.125rem', color: 'var(--cui-body-color)' }}>
                      {impliedDensity} DU/AC
                    </span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {globalError && (
                <div className="alert alert-danger py-2 mb-0">
                  {globalError}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Landscaper (40%) */}
          <div className="overflow-hidden p-4" style={{ flexBasis: '40%' }}>
            <LandscaperPanel
              analysisType={propertyCategory} // Pass property category for extraction context
              formData={formData}
              onDocumentExtracted={handleDocumentExtracted}
              isDark={false}
              initialFiles={initialFiles}
            />
          </div>
        </div>

        {/* Footer */}
        <footer
          className="d-flex align-items-center justify-content-between border-top px-4 py-3"
          style={{ borderColor: 'var(--cui-border-color)' }}
        >
          <button
            type="button"
            onClick={() => {
              resetFormState()
              setExtractedFieldKeys(new Set())
              setPendingDocuments([])
            }}
            disabled={isSubmitting}
            className="btn btn-link p-0 small"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Clear form
          </button>
          <div className="d-flex align-items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitProject}
              disabled={isSubmitting || !analysisType}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default NewProjectModal
