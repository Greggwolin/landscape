# Frontend Correction UI - Complete Implementation Guide

## Overview

This document contains all the code needed to implement the AI Correction Logging frontend UI.

**Backend Status:** ✅ Complete (APIs ready at `/api/extractions/*`)
**Frontend Status:** 📝 Ready to implement (copy/paste code below)

---

## File 1: Review Queue Page

**Path:** `src/app/documents/review/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface ExtractionQueueItem {
  extraction_id: number;
  document_id: number;
  document_name: string;
  document_type: string;
  extraction_type: 'rent_roll' | 'operating_statement' | 'parcel_table';
  overall_confidence: number;
  review_status: 'pending' | 'in_review' | 'corrected' | 'committed';
  correction_count: number;
  extracted_at: string;
  page_count: number;
  error_count: number;
  warning_count: number;
}

export default function ExtractionReviewQueuePage() {
  const router = useRouter();
  const [extractions, setExtractions] = useState<ExtractionQueueItem[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExtractions();
  }, [filter]);

  const fetchExtractions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/extractions/queue?status=${filter}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setExtractions(data.queue || []);
    } catch (error) {
      console.error('Failed to fetch extractions:', error);
      setExtractions([]);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.85) {
      return <Badge className="bg-green-600 hover:bg-green-700">✓ {(confidence * 100).toFixed(0)}%</Badge>;
    } else if (confidence >= 0.70) {
      return <Badge className="bg-yellow-600 hover:bg-yellow-700">⚠ {(confidence * 100).toFixed(0)}%</Badge>;
    } else {
      return <Badge variant="destructive">⚠ {(confidence * 100).toFixed(0)}%</Badge>;
    }
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.85) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (confidence >= 0.70) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  const formatExtractionType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Extraction Review Queue</h1>
            <p className="text-muted-foreground mt-1">
              Review AI extractions and make corrections to improve accuracy
            </p>
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Extractions</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="corrected">Corrected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading extractions...</div>
        </div>
      ) : extractions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No extractions found</p>
            <Button onClick={() => router.push('/documents/upload')}>
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {extractions.map((extraction) => (
            <Card
              key={extraction.extraction_id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push(`/documents/review/${extraction.extraction_id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {getConfidenceIcon(extraction.overall_confidence)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{extraction.document_name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {extraction.page_count && `${extraction.page_count} pages • `}
                      {formatExtractionType(extraction.extraction_type)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {getConfidenceBadge(extraction.overall_confidence)}

                    {extraction.warning_count > 0 && (
                      <Badge variant="outline" className="text-yellow-600">
                        {extraction.warning_count} warnings
                      </Badge>
                    )}

                    {extraction.error_count > 0 && (
                      <Badge variant="destructive">
                        {extraction.error_count} errors
                      </Badge>
                    )}

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(extraction.extracted_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## File 2: Review Detail Page

**Path:** `src/app/documents/review/[id]/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle, Edit, Save, Check } from 'lucide-react';
import { CorrectionModal } from '@/components/documents/CorrectionModal';

interface ExtractedField {
  field_path: string;
  field_label: string;
  value: any;
  confidence: number;
  is_corrected?: boolean;
  corrected_value?: any;
}

interface ExtractedSection {
  section_name: string;
  section_label: string;
  fields: ExtractedField[];
}

interface ValidationWarning {
  field_path: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggested_value?: any;
}

interface ExtractionDetail {
  extraction_id: number;
  document_id: number;
  document_name: string;
  extraction_type: string;
  overall_confidence: number;
  sections: ExtractedSection[];
  warnings: ValidationWarning[];
  extracted_at: string;
  review_status: string;
}

export default function ExtractionReviewPage() {
  const router = useRouter();
  const params = useParams();
  const extractionId = parseInt(params.id as string);

  const [extraction, setExtraction] = useState<ExtractionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<ExtractedField | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExtraction();
  }, [extractionId]);

  const fetchExtraction = async () => {
    try {
      const response = await fetch(`/api/extractions/${extractionId}/review`);
      const data = await response.json();

      // Transform data into sections format
      const sections = transformDataToSections(data);
      setExtraction({
        ...data,
        sections
      });
    } catch (error) {
      console.error('Failed to fetch extraction:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformDataToSections = (data: any): ExtractedSection[] => {
    // Transform flat data structure into tabbed sections
    const sections: ExtractedSection[] = [];

    if (data.data) {
      // Extract sections from data structure
      Object.keys(data.data).forEach(sectionKey => {
        const sectionData = data.data[sectionKey];
        const fields: ExtractedField[] = [];

        if (typeof sectionData === 'object') {
          Object.keys(sectionData).forEach(fieldKey => {
            const fieldData = sectionData[fieldKey];
            fields.push({
              field_path: `${sectionKey}.${fieldKey}`,
              field_label: formatFieldLabel(fieldKey),
              value: fieldData.value || fieldData,
              confidence: fieldData.confidence || 0
            });
          });
        }

        sections.push({
          section_name: sectionKey,
          section_label: formatFieldLabel(sectionKey),
          fields
        });
      });
    }

    return sections;
  };

  const formatFieldLabel = (str: string) => {
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleCorrection = async (
    field: ExtractedField,
    newValue: any,
    correctionType: string,
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/extractions/${extractionId}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_path: field.field_path,
          old_value: field.value,
          new_value: newValue,
          correction_type: correctionType,
          notes: notes
        })
      });

      if (response.ok) {
        fetchExtraction(); // Refresh data
        setEditingField(null);
      }
    } catch (error) {
      console.error('Error logging correction:', error);
    }
  };

  const handleCommit = async () => {
    if (!confirm('Commit this extraction to the database? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/extractions/${extractionId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commit_notes: 'Reviewed and corrected via UI'
        })
      });

      if (response.ok) {
        router.push('/documents/review');
      }
    } catch (error) {
      console.error('Error committing extraction:', error);
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: number, isCorrected?: boolean) => {
    if (isCorrected) {
      return <Badge className="bg-green-600"><Check className="h-3 w-3 mr-1" /> Corrected</Badge>;
    }
    if (confidence >= 0.85) {
      return <Badge className="bg-green-600">{(confidence * 100).toFixed(0)}%</Badge>;
    } else if (confidence >= 0.70) {
      return <Badge className="bg-yellow-600">{(confidence * 100).toFixed(0)}%</Badge>;
    } else {
      return <Badge variant="destructive">{(confidence * 100).toFixed(0)}%</Badge>;
    }
  };

  const getWarningsForField = (fieldPath: string) => {
    return extraction?.warnings.filter(w => w.field_path === fieldPath) || [];
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading extraction...</div>;
  }

  if (!extraction) {
    return <div className="container mx-auto p-6">Extraction not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/documents/review')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Queue
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{extraction.document_name}</h1>
            <p className="text-muted-foreground">
              {formatFieldLabel(extraction.extraction_type)}
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">Overall Confidence</div>
            <div className="text-3xl font-bold">
              {(extraction.overall_confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Global Warnings */}
      {extraction.warnings.filter(w => !w.field_path).length > 0 && (
        <Alert className="mb-4" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {extraction.warnings.filter(w => !w.field_path).map((warning, idx) => (
                <li key={idx}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabbed Sections */}
      <Tabs defaultValue={extraction.sections[0]?.section_name} className="mb-6">
        <TabsList>
          {extraction.sections.map(section => (
            <TabsTrigger key={section.section_name} value={section.section_name}>
              {section.section_label}
            </TabsTrigger>
          ))}
        </TabsList>

        {extraction.sections.map(section => (
          <TabsContent key={section.section_name} value={section.section_name}>
            <Card>
              <CardHeader>
                <CardTitle>{section.section_label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {section.fields.map(field => {
                    const fieldWarnings = getWarningsForField(field.field_path);

                    return (
                      <div key={field.field_path} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{field.field_label}</span>
                              {getConfidenceBadge(field.confidence, field.is_corrected)}
                            </div>

                            <div className="text-lg">
                              {field.is_corrected ? (
                                <>
                                  <span className="line-through text-muted-foreground mr-2">
                                    {String(field.value)}
                                  </span>
                                  <span className="text-green-600 font-semibold">
                                    {String(field.corrected_value)}
                                  </span>
                                </>
                              ) : (
                                <span>{String(field.value)}</span>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingField(field)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>

                        {/* Field warnings */}
                        {fieldWarnings.map((warning, idx) => (
                          <Alert
                            key={idx}
                            className="mt-2"
                            variant={warning.severity === 'error' ? 'destructive' : 'default'}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {warning.message}
                              {warning.suggested_value && (
                                <span className="block mt-1 text-sm">
                                  Suggested: {String(warning.suggested_value)}
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <Save className="h-4 w-4 mr-2" />
          Refresh
        </Button>

        <Button onClick={handleCommit} disabled={saving}>
          <Check className="h-4 w-4 mr-2" />
          {saving ? 'Committing...' : 'Commit to Database'}
        </Button>
      </div>

      {/* Correction Modal */}
      {editingField && (
        <CorrectionModal
          field={editingField}
          onSave={handleCorrection}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  );
}
```

---

## File 3: Correction Modal Component

**Path:** `src/components/documents/CorrectionModal.tsx`

```typescript
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
```

---

## File 4: Analytics Dashboard

**Path:** `src/app/documents/analytics/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface TopCorrectedField {
  field: string;
  correction_count: number;
  avg_ai_confidence: number;
  pattern: string;
  recommendation: string;
}

interface AccuracyTrendPoint {
  date: string;
  accuracy: number;
  extractions: number;
  corrections: number;
}

interface CorrectionType {
  type: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  period: string;
  total_corrections: number;
  total_extractions: number;
  correction_rate: number;
  top_corrected_fields: TopCorrectedField[];
  accuracy_trend: AccuracyTrendPoint[];
  correction_types: CorrectionType[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('7');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/corrections/analytics?days=${period}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFieldName = (fieldPath: string) => {
    const parts = fieldPath.split('.');
    return parts[parts.length - 1]
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  if (loading || !analytics) {
    return <div className="container mx-auto p-6">Loading analytics...</div>;
  }

  const overallAccuracy = analytics.total_extractions > 0
    ? 1 - (analytics.total_corrections / (analytics.total_extractions * 20))
    : 0;

  const previousAccuracy = analytics.accuracy_trend.length > 0
    ? analytics.accuracy_trend[0].accuracy
    : 0;

  const accuracyChange = overallAccuracy - previousAccuracy;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI Training Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track correction patterns and accuracy improvements
            </p>
          </div>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{(overallAccuracy * 100).toFixed(1)}%</span>
              {accuracyChange !== 0 && (
                <Badge variant={accuracyChange > 0 ? 'default' : 'destructive'} className={accuracyChange > 0 ? 'bg-green-600' : ''}>
                  {accuracyChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(accuracyChange * 100).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {accuracyChange > 0 ? 'up' : 'down'} from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Corrections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.total_corrections}</div>
            <p className="text-xs text-muted-foreground mt-1">
              across {analytics.total_extractions} documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Correction Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(analytics.correction_rate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.total_extractions > 0
                ? (analytics.total_corrections / analytics.total_extractions).toFixed(1)
                : 0} corrections per document
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Trend Chart */}
      {analytics.accuracy_trend.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Accuracy Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.accuracy_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                <Tooltip
                  formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Correction Types Breakdown */}
      {analytics.correction_types.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Correction Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.correction_types.map((ct) => (
                <div key={ct.type} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{formatFieldName(ct.type)}</div>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${ct.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-sm text-muted-foreground">
                    {ct.count} ({ct.percentage.toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Corrected Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Top Corrected Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {analytics.top_corrected_fields.slice(0, 5).map((field, index) => (
              <div key={field.field} className="border-b pb-4 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{formatFieldName(field.field)}</h3>
                      <Badge variant="outline">
                        {field.correction_count} corrections
                      </Badge>
                      <Badge variant="outline">
                        Avg confidence: {(field.avg_ai_confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        {field.field}
                      </code>
                    </div>

                    {field.pattern && (
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium">Pattern Detected:</div>
                          <div className="text-sm text-muted-foreground">
                            {formatFieldName(field.pattern)}
                          </div>
                        </div>
                      </div>
                    )}

                    {field.recommendation && (
                      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                        <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium">Recommendation:</div>
                          <div className="text-sm text-muted-foreground">{field.recommendation}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## File 5: Create directories

Create these directories first:

```bash
mkdir -p src/app/documents/review/[id]
mkdir -p src/app/documents/analytics
mkdir -p src/components/documents
```

---

## Installation Steps

1. **Create directories:**
```bash
cd /Users/5150east/landscape
mkdir -p src/app/documents/review/\[id\]
mkdir -p src/app/documents/analytics
mkdir -p src/components/documents
```

2. **Copy files:**
- Copy File 1 code to `src/app/documents/review/page.tsx`
- Copy File 2 code to `src/app/documents/review/[id]/page.tsx`
- Copy File 3 code to `src/components/documents/CorrectionModal.tsx`
- Copy File 4 code to `src/app/documents/analytics/page.tsx`

3. **Install dependencies (if not already installed):**
```bash
npm install recharts date-fns
```

4. **Update Navigation (Optional)**

Add to your navigation menu:
```typescript
{
  label: 'Review Queue',
  href: '/documents/review',
  icon: AlertCircle
},
{
  label: 'Training Analytics',
  href: '/documents/analytics',
  icon: TrendingUp
}
```

---

## API Endpoints Expected

These backend endpoints should already exist from the backend implementation:

```
GET  /api/extractions/queue?status={status}&limit={limit}
GET  /api/extractions/{id}/review
POST /api/extractions/{id}/correct
POST /api/extractions/{id}/commit
GET  /api/corrections/analytics?days={days}
```

---

## Testing Checklist

After copying all files:

- [ ] Review queue page loads at `/documents/review`
- [ ] Extractions display with confidence badges
- [ ] Clicking extraction navigates to detail page
- [ ] Detail page shows all fields with confidence scores
- [ ] Edit button opens correction modal
- [ ] Correction saves to backend
- [ ] Commit button works
- [ ] Analytics page loads at `/documents/analytics`
- [ ] Charts render correctly
- [ ] Top corrected fields display

---

## Next Steps

1. Copy all code files
2. Run `npm install recharts date-fns`
3. Test the review queue page
4. Upload a test document to create an extraction
5. Review and correct the extraction
6. View analytics dashboard

**Status:** Frontend implementation complete! 🎉
