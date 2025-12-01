'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

interface FloorplanDifference {
  floorplan: number
  proposed: number
}

interface FloorplanData {
  unit_type_id: number
  unit_type_code: string
  bedrooms: number
  bathrooms: number
  avg_square_feet: number
  total_units: number
}

interface FloorplanCheckResponse {
  differs_from_floorplan: boolean
  floorplan: FloorplanData | null
  differences: {
    bedrooms?: FloorplanDifference
    bathrooms?: FloorplanDifference
    square_feet?: FloorplanDifference
    message?: string
  }
  unit_type: string
}

interface FloorplanUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floorplanCheck: FloorplanCheckResponse | null
  proposedChanges: {
    unit_type?: string
    bedrooms?: number
    bathrooms?: number
    square_feet?: number
  }
  onConfirm: (action: 'create' | 'update' | 'none', newUnitTypeCode?: string) => Promise<void>
  onCancel: () => void
}

export function FloorplanUpdateDialog({
  open,
  onOpenChange,
  floorplanCheck,
  proposedChanges,
  onConfirm,
  onCancel,
}: FloorplanUpdateDialogProps) {
  const [action, setAction] = useState<'create' | 'update' | 'none'>('none')
  const [newUnitTypeCode, setNewUnitTypeCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!floorplanCheck) return null

  const hasFloorplan = floorplanCheck.floorplan !== null
  const differences = floorplanCheck.differences

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(action, action === 'create' ? newUnitTypeCode : undefined)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Floorplan Update Required</DialogTitle>
          <DialogDescription>
            The unit specifications you entered differ from the current floorplan.
            How would you like to proceed?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Show what changed */}
          <div className="rounded-md border p-4">
            <h4 className="font-medium mb-2">Changes Detected:</h4>
            <div className="space-y-2 text-sm">
              {differences.message ? (
                <p className="text-muted-foreground">{differences.message}</p>
              ) : (
                <>
                  {differences.bedrooms && (
                    <div className="flex justify-between">
                      <span>Bedrooms:</span>
                      <span>
                        <span className="text-muted-foreground">{differences.bedrooms.floorplan}</span>
                        {' → '}
                        <span className="font-medium">{differences.bedrooms.proposed}</span>
                      </span>
                    </div>
                  )}
                  {differences.bathrooms && (
                    <div className="flex justify-between">
                      <span>Bathrooms:</span>
                      <span>
                        <span className="text-muted-foreground">{differences.bathrooms.floorplan}</span>
                        {' → '}
                        <span className="font-medium">{differences.bathrooms.proposed}</span>
                      </span>
                    </div>
                  )}
                  {differences.square_feet && (
                    <div className="flex justify-between">
                      <span>Square Feet:</span>
                      <span>
                        <span className="text-muted-foreground">{differences.square_feet.floorplan}</span>
                        {' → '}
                        <span className="font-medium">{differences.square_feet.proposed}</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action selection */}
          <RadioGroup value={action} onValueChange={(val) => setAction(val as 'create' | 'update' | 'none')}>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="none" id="none" />
                <div className="flex-1">
                  <Label htmlFor="none" className="font-medium cursor-pointer">
                    Just update this unit
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only change this specific unit. The floorplan will remain unchanged.
                  </p>
                </div>
              </div>

              {hasFloorplan && (
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <div className="flex-1">
                    <Label htmlFor="update" className="font-medium cursor-pointer">
                      Update existing floorplan "{floorplanCheck.unit_type}"
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Update the floorplan to match these new values. This will affect{' '}
                      {floorplanCheck.floorplan?.total_units || 0} unit(s) of this type.
                    </p>
                    <Alert className="mt-2">
                      <InfoIcon className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        This will update the master floorplan used for auto-fill when selecting this unit type.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="create" id="create" />
                <div className="flex-1">
                  <Label htmlFor="create" className="font-medium cursor-pointer">
                    Create new floorplan
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Save these specifications as a new floorplan type.
                  </p>
                  {action === 'create' && (
                    <div className="space-y-2">
                      <Label htmlFor="newUnitTypeCode">New Unit Type Code</Label>
                      <Input
                        id="newUnitTypeCode"
                        placeholder={`e.g., ${floorplanCheck.unit_type}-Custom`}
                        value={newUnitTypeCode}
                        onChange={(e) => setNewUnitTypeCode(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Suggested: {floorplanCheck.unit_type}-Custom or {floorplanCheck.unit_type}-Renovated
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || (action === 'create' && !newUnitTypeCode.trim())}
          >
            {isSubmitting ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
