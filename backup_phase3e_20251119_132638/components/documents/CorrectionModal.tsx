'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CorrectionModalProps {
  field: {
    field_path: string;
    field_label: string;
    value: any;
    confidence: number;
  };
  onSave: (field: any, newValue: any, correctionType: string, notes?: string) => Promise<void>;
  onClose: () => void;
}

export function CorrectionModal({ field, onSave, onClose }: CorrectionModalProps) {
  const [newValue, setNewValue] = useState(String(field.value));
  const [correctionType, setCorrectionType] = useState('value_wrong');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(field, newValue, correctionType, notes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Field: {field.field_label}</DialogTitle>
          <DialogDescription>
            Make corrections to improve AI accuracy in future extractions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI Extracted Value */}
          <div>
            <Label>AI Extracted Value</Label>
            <div className="mt-1 p-3 bg-muted rounded-md">
              {String(field.value)}
              <span className="text-sm text-muted-foreground ml-2">
                (Confidence: {(field.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* User Correction */}
          <div>
            <Label htmlFor="correction">Your Correction *</Label>
            <Input
              id="correction"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter corrected value"
              className="mt-1"
            />
          </div>

          {/* Correction Type */}
          <div>
            <Label htmlFor="correction-type">Correction Type *</Label>
            <Select value={correctionType} onValueChange={setCorrectionType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value_wrong">Value Wrong - OCR/parsing error</SelectItem>
                <SelectItem value="field_missed">Field Missed - AI didn't see it</SelectItem>
                <SelectItem value="confidence_too_high">Confidence Too High</SelectItem>
                <SelectItem value="unit_conversion">Unit Conversion - Wrong units</SelectItem>
                <SelectItem value="formatting">Formatting - Format issue</SelectItem>
                <SelectItem value="ocr_error">OCR Error - Scanned text misread</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., AI read '9' as '0', or field was on page 2 not page 1"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Log Correction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
