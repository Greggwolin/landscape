"""
Document classifier service using Claude API to identify document types.
"""

import anthropic
import os
from typing import Dict, Tuple
import pandas as pd
import json


class DocumentClassifier:
    """
    Classify uploaded documents to determine extraction strategy
    """

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

    def classify_excel(self, file_path: str) -> Tuple[str, float, Dict]:
        """
        Classify Excel/CSV file by examining structure

        Args:
            file_path: Path to the Excel/CSV file

        Returns:
            Tuple of (doc_type, confidence, metadata)
            doc_type: "rent_roll", "t12_operating", "market_study", "budget", or "other"
            confidence: 0.0-1.0
            metadata: Additional classification info
        """
        try:
            # Read first 10 rows to analyze structure
            df = pd.read_excel(file_path, nrows=10)

            # Build sample for Claude
            sample_text = f"Columns: {list(df.columns)}\n\n"
            sample_text += "First 5 rows:\n"
            sample_text += df.head(5).to_string()

            prompt = f"""Analyze this spreadsheet sample and classify the document type.

{sample_text}

Respond with ONLY a JSON object (no markdown, no explanation):
{{
    "doc_type": "rent_roll" | "t12_operating" | "market_study" | "budget" | "other",
    "confidence": 0.0-1.0,
    "property_type": "multifamily" | "office" | "retail" | "land" | "mixed" | "unknown",
    "reasoning": "brief explanation",
    "metadata": {{
        "has_unit_column": true/false,
        "has_tenant_column": true/false,
        "has_rent_column": true/false,
        "estimated_header_row": 0-10
    }}
}}"""

            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response
            response_text = message.content[0].text.strip()
            # Strip markdown if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)

            return (
                result['doc_type'],
                float(result['confidence']),
                result
            )

        except Exception as e:
            print(f"Classification error: {e}")
            return ('unknown', 0.0, {'error': str(e)})
