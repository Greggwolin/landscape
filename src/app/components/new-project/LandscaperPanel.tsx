'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import type { NewProjectFormData } from './types'

export interface LandscaperMessage {
  id: string
  role: 'landscaper' | 'user'
  content: string
  timestamp: Date
}

interface LandscaperPanelProps {
  analysisType: 'Land Development' | 'Income Property' | ''
  formData: NewProjectFormData
  onSuggestionApply?: (field: string, value: string) => void
}

// Rule-based response triggers for MVP
const generateLandscaperResponses = (
  formData: NewProjectFormData,
  analysisType: string
): LandscaperMessage[] => {
  const messages: LandscaperMessage[] = []
  const now = new Date()

  // Initial prompt - always shown
  messages.push({
    id: 'initial',
    role: 'landscaper',
    content: "Drop a pin on the map or enter cross streets — I'll pull market context for you.",
    timestamp: new Date(now.getTime() - 60000)
  })

  // Check if location is set
  const hasLocation = !!(
    (formData.latitude && formData.longitude) ||
    formData.cross_streets ||
    (formData.street_address && formData.city && formData.state)
  )

  const city = formData.city || ''
  const siteArea = formData.site_area ? Number(formData.site_area) : 0
  const totalUnits = formData.total_lots_units ? Number(formData.total_lots_units) : 0
  const density = formData.density ? Number(formData.density) : 0

  if (hasLocation && city) {
    if (analysisType === 'Land Development') {
      // Location-based response for Land Development
      const westValleyCities = ['Peoria', 'Goodyear', 'Buckeye', 'Surprise', 'Avondale', 'Glendale']
      const eastValleyCities = ['Mesa', 'Gilbert', 'Chandler', 'Queen Creek', 'Apache Junction']
      const isWestValley = westValleyCities.some(c => city.toLowerCase().includes(c.toLowerCase()))
      const isEastValley = eastValleyCities.some(c => city.toLowerCase().includes(c.toLowerCase()))

      if (isWestValley) {
        messages.push({
          id: 'location-west',
          role: 'landscaper',
          content: `I see you're looking at ${city} — that's a strong West Valley submarket. Recent new construction averaging $450-550k in a 3-mile radius. Good infrastructure momentum with Loop 303 access.`,
          timestamp: new Date(now.getTime() - 30000)
        })
      } else if (isEastValley) {
        messages.push({
          id: 'location-east',
          role: 'landscaper',
          content: `${city} is a competitive East Valley market. Strong school districts driving demand. Expect land basis to be higher but absorption tends to be faster here.`,
          timestamp: new Date(now.getTime() - 30000)
        })
      } else if (city) {
        messages.push({
          id: 'location-general',
          role: 'landscaper',
          content: `Got it — ${city}. Let me know the site size and I'll help you think through density and product mix.`,
          timestamp: new Date(now.getTime() - 30000)
        })
      }
    } else if (analysisType === 'Income Property') {
      messages.push({
        id: 'location-income',
        role: 'landscaper',
        content: `${city} noted. I'll factor in local rent comps and cap rates when we get to the analysis. What's the property type?`,
        timestamp: new Date(now.getTime() - 30000)
      })
    }
  }

  // Acreage-based responses for Land Development
  if (analysisType === 'Land Development' && siteArea > 0) {
    if (siteArea >= 400) {
      messages.push({
        id: 'acreage-large',
        role: 'landscaper',
        content: `At ${siteArea} acres, you're in MPC territory — multiple phases likely. What density are you thinking? Most West Valley MPCs are running 3-4 DU/AC gross.`,
        timestamp: new Date(now.getTime() - 20000)
      })
    } else if (siteArea >= 100) {
      messages.push({
        id: 'acreage-medium',
        role: 'landscaper',
        content: `${siteArea} acres gives you room for a nice community. Single-phase or are you thinking phased delivery?`,
        timestamp: new Date(now.getTime() - 20000)
      })
    } else if (siteArea >= 20) {
      messages.push({
        id: 'acreage-small',
        role: 'landscaper',
        content: `${siteArea} acres — good infill size. This could work well as a single-phase subdivision. What's your target lot count?`,
        timestamp: new Date(now.getTime() - 20000)
      })
    }
  }

  // Density/units response
  if (analysisType === 'Land Development' && siteArea > 0 && (totalUnits > 0 || density > 0)) {
    const calculatedDensity = totalUnits > 0 && siteArea > 0
      ? (totalUnits / siteArea).toFixed(1)
      : density.toFixed(1)

    if (Number(calculatedDensity) >= 4) {
      messages.push({
        id: 'density-high',
        role: 'landscaper',
        content: `~${calculatedDensity} DU/AC is on the denser side — likely looking at 40' and 45' products, maybe some attached. Make sure zoning supports this.`,
        timestamp: new Date(now.getTime() - 10000)
      })
    } else if (Number(calculatedDensity) >= 3) {
      messages.push({
        id: 'density-medium',
        role: 'landscaper',
        content: `~${calculatedDensity} DU/AC suggests 50' and 45' products would work. Anything unusual about the site I should know — terrain, offsite requirements?`,
        timestamp: new Date(now.getTime() - 10000)
      })
    } else if (Number(calculatedDensity) >= 2) {
      messages.push({
        id: 'density-low',
        role: 'landscaper',
        content: `${calculatedDensity} DU/AC gives you room for larger lots — 55'-65' products. Premium positioning but watch your basis.`,
        timestamp: new Date(now.getTime() - 10000)
      })
    }
  }

  return messages
}

const LandscaperPanel = ({ analysisType, formData, onSuggestionApply }: LandscaperPanelProps) => {
  const [userInput, setUserInput] = useState('')
  const [userMessages, setUserMessages] = useState<LandscaperMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Generate rule-based messages from form state
  const systemMessages = useMemo(
    () => generateLandscaperResponses(formData, analysisType),
    [formData, analysisType]
  )

  // Combine system and user messages, sorted by timestamp
  const allMessages = useMemo(() => {
    return [...systemMessages, ...userMessages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )
  }, [systemMessages, userMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages])

  const handleSendMessage = () => {
    if (!userInput.trim()) return

    const userMessage: LandscaperMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput.trim(),
      timestamp: new Date()
    }

    setUserMessages(prev => [...prev, userMessage])

    // Generate a simple response (MVP - rule-based)
    setTimeout(() => {
      const responseContent = generateUserResponse(userInput.trim(), analysisType)
      const response: LandscaperMessage = {
        id: `response-${Date.now()}`,
        role: 'landscaper',
        content: responseContent,
        timestamp: new Date()
      }
      setUserMessages(prev => [...prev, response])
    }, 800)

    setUserInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        <span className="font-medium text-slate-900">Landscaper</span>
        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
          Online
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim()}
            className="rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple rule-based responses for user questions (MVP)
function generateUserResponse(question: string, analysisType: string): string {
  const q = question.toLowerCase()

  if (q.includes('absorption') || q.includes('velocity')) {
    if (analysisType === 'Land Development') {
      return "Based on active MPCs in the Phoenix metro, 120-180 lots/year is typical for a well-positioned community. Premium locations can hit 200+. What's your target price point?"
    }
    return "Multifamily absorption varies by submarket — Class A typically stabilizes in 12-18 months. I can pull specific comps once we have the location dialed in."
  }

  if (q.includes('price') || q.includes('pricing') || q.includes('cost')) {
    return "Pricing depends heavily on location and lot size. West Valley 50' lots are trading $85-110k finished lot value. Want me to run some scenarios once you've set the site details?"
  }

  if (q.includes('zoning') || q.includes('entitle')) {
    return "Zoning timelines in Maricopa County typically run 6-12 months for rezoning, less for PADs with density already approved. Do you know the current zoning?"
  }

  if (q.includes('infrastructure') || q.includes('offsite')) {
    return "Offsite costs vary widely — $5-15k/lot is common for smaller subdivisions. MPCs can see $20k+ when you're building arterials. Any known offsite requirements?"
  }

  if (q.includes('builder') || q.includes('buyer')) {
    return "National builders are active in the market — Meritage, Taylor Morrison, Lennar all buying lots. Lot sizes they're targeting depend on their current inventory. What product type are you thinking?"
  }

  if (q.includes('thank')) {
    return "You're welcome! Let me know if you need anything else as you build out the project."
  }

  // Default response
  return "Good question. Once you've filled in the basic project details, I can give you more specific guidance. What else would you like to know?"
}

export default LandscaperPanel
