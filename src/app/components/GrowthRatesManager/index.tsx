'use client'

import React, { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'

interface GrowthRateStep {
  step_id?: number
  step_number: number
  from_period: number | null
  periods: number | null
  rate: number | null
  thru_period?: number | null
}

interface GrowthRateSet {
  set_id: number
  project_id: number
  card_type: string
  set_name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

interface GrowthRatesManagerProps {
  projectId: number
  cardType: 'cost' | 'revenue' | 'absorption'
  onGrowthRateChange?: (setId: number, steps: GrowthRateStep[]) => void
}

const GrowthRatesManager: React.FC<GrowthRatesManagerProps> = ({
  projectId,
  cardType,
  onGrowthRateChange
}) => {
  const [growthSets, setGrowthSets] = useState<GrowthRateSet[]>([])
  const [activeSetId, setActiveSetId] = useState<number | null>(null)
  const [activeSteps, setActiveSteps] = useState<GrowthRateStep[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  // Default step structure for growth rates
  const defaultSteps: GrowthRateStep[] = [
    { step_number: 1, from_period: 1, periods: 16, rate: 2.0 },
    { step_number: 2, from_period: 17, periods: 24, rate: 3.0 },
    { step_number: 3, from_period: 41, periods: 20, rate: 2.5 },
    { step_number: 4, from_period: 61, periods: null, rate: 2.0 },
    { step_number: 5, from_period: null, periods: null, rate: null }
  ]

  useEffect(() => {
    loadGrowthSets()
  }, [projectId, cardType])

  const loadGrowthSets = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/growth-rates/${cardType}`)
      if (!response.ok) {
        throw new Error(`Failed to load growth sets: ${response.statusText}`)
      }

      const sets = await response.json()
      setGrowthSets(sets)

      const defaultSet = sets.find((s: GrowthRateSet) => s.is_default) || sets[0]
      if (defaultSet) {
        setActiveSetId(defaultSet.set_id)
        setActiveTab(0)
        await loadStepsForSet(defaultSet.set_id)
      }
    } catch (error) {
      console.error('Failed to load growth sets:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStepsForSet = async (setId: number) => {
    try {
      const response = await fetch(`/api/growth-rate-sets/${setId}/steps`)
      if (!response.ok) {
        throw new Error(`Failed to load growth steps: ${response.statusText}`)
      }

      const steps = await response.json()
      setActiveSteps(steps.length > 0 ? steps : defaultSteps)
    } catch (error) {
      console.error('Failed to load growth steps:', error)
      setActiveSteps(defaultSteps)
    }
  }

  const handleStepChange = (stepIndex: number, field: keyof GrowthRateStep, value: number | null) => {
    const updatedSteps = [...activeSteps]
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      [field]: value
    }

    // Auto-calculate from_period for subsequent steps
    if (field === 'periods' && stepIndex < updatedSteps.length - 1) {
      const currentStep = updatedSteps[stepIndex]
      if (currentStep.from_period && currentStep.periods) {
        const nextFromPeriod = currentStep.from_period + currentStep.periods
        updatedSteps[stepIndex + 1] = {
          ...updatedSteps[stepIndex + 1],
          from_period: nextFromPeriod
        }
      }
    }

    setActiveSteps(updatedSteps)
  }

  const saveSteps = async () => {
    if (!activeSetId) return

    try {
      const validSteps = activeSteps.filter(step =>
        step.from_period !== null && step.rate !== null
      )

      const response = await fetch(`/api/growth-rate-sets/${activeSetId}/steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: validSteps })
      })

      if (!response.ok) {
        throw new Error(`Failed to save growth steps: ${response.statusText}`)
      }

      const result = await response.json()
      setActiveSteps(result.steps || validSteps)
      setIsEditing(false)
      onGrowthRateChange?.(activeSetId, result.steps || validSteps)
    } catch (error) {
      console.error('Failed to save growth steps:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const getCardTitle = () => {
    switch (cardType) {
      case 'cost': return 'Development Costs'
      case 'revenue': return 'Revenue Growth'
      case 'absorption': return 'Absorption Rates'
      default: return 'Growth Rates'
    }
  }

  const getCurrentRate = () => {
    const firstValidStep = activeSteps.find(s => s.rate !== null)
    return firstValidStep ? `${firstValidStep.rate}%` : '0.00%'
  }

  const getAvatarIcon = () => {
    switch (cardType) {
      case 'cost': return 'ri-money-dollar-circle-line'
      case 'revenue': return 'ri-line-chart-line'
      case 'absorption': return 'ri-bar-chart-line'
      default: return 'ri-line-chart-line'
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
    const selectedSet = growthSets[newValue]
    if (selectedSet) {
      setActiveSetId(selectedSet.set_id)
      loadStepsForSet(selectedSet.set_id)
      setIsEditing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className='bs-full'>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className='bs-full'>
        <CardContent>
          <Typography color="error">Error: {error}</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='bs-full'>
      <CardContent>
        <div className='flex justify-between items-center is-full mbe-5'>
          <div className='flex items-center gap-3'>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              <i className={getAvatarIcon()} />
            </Avatar>
            <Typography variant="h6" color="text.primary" className='font-medium'>
              {getCardTitle()}
            </Typography>
          </div>
          <Chip
            label={getCurrentRate()}
            color="primary"
            size="small"
          />
        </div>

        {/* Growth Rate Set Tabs */}
        {growthSets.length > 0 && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="growth rate sets">
              {growthSets.map((set, index) => (
                <Tab key={set.set_id} label={set.set_name} />
              ))}
            </Tabs>
          </Box>
        )}

        {/* Current Set Configuration */}
        {activeSetId && (
          <Box>
            <div className='flex justify-between items-center mb-3'>
              <Typography variant="body2" color="text.secondary">
                Step-based growth assumptions:
              </Typography>
              <div className='flex gap-2'>
                {isEditing ? (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={saveSteps}
                    >
                      Save / Update
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Steps Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Step</TableCell>
                    <TableCell>From Period</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>Periods</TableCell>
                    <TableCell>Thru Period</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeSteps.map((step, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {step.step_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            type="number"
                            size="small"
                            value={step.from_period || ''}
                            onChange={(e) => handleStepChange(index, 'from_period', parseInt(e.target.value) || null)}
                            sx={{ width: 80 }}
                          />
                        ) : (
                          step.from_period || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{ step: 0.1 }}
                              value={step.rate || ''}
                              onChange={(e) => handleStepChange(index, 'rate', parseFloat(e.target.value) || null)}
                              sx={{ width: 80 }}
                            />
                            <Typography variant="body2" color="primary">%</Typography>
                          </Box>
                        ) : (
                          step.rate ? (
                            <Typography variant="body2" color="primary">{step.rate}%</Typography>
                          ) : '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            type="number"
                            size="small"
                            value={step.periods || ''}
                            onChange={(e) => handleStepChange(index, 'periods', parseInt(e.target.value) || null)}
                            placeholder="E"
                            sx={{ width: 80 }}
                          />
                        ) : (
                          step.periods || 'E'
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {step.periods && step.from_period
                            ? step.from_period + step.periods - 1
                            : step.periods === null ? 'E' : '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              E = End of Analysis
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default GrowthRatesManager