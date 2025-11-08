"""Base class for synthetic document generation."""

from abc import ABC, abstractmethod
from faker import Faker
from datetime import datetime, timedelta
import random
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
import pandas as pd


class BaseDocumentGenerator(ABC):
    """Base class for synthetic document generation"""

    def __init__(self, tier='institutional', seed=None):
        """
        Args:
            tier: 'institutional', 'regional', or 'owner_generated'
            seed: Random seed for reproducibility
        """
        self.tier = tier
        self.fake = Faker()
        if seed:
            Faker.seed(seed)
            random.seed(seed)

    def add_typos(self, text, typo_rate=0.02):
        """Add realistic typos (transpose adjacent letters)"""
        if random.random() > typo_rate:
            return text

        words = text.split()
        if not words:
            return text

        # Pick random word
        word_idx = random.randint(0, len(words)-1)
        word = words[word_idx]

        if len(word) < 3:
            return text

        # Transpose two adjacent letters
        pos = random.randint(0, len(word)-2)
        typo_word = word[:pos] + word[pos+1] + word[pos] + word[pos+2:]
        words[word_idx] = typo_word

        return ' '.join(words)

    def get_formatting_quirks(self):
        """Return tier-appropriate formatting quirks"""
        if self.tier == 'institutional':
            return {
                'font': 'Helvetica',
                'font_size': 10,
                'use_borders': True,
                'alternating_rows': True,
                'typo_rate': 0.01
            }
        elif self.tier == 'regional':
            return {
                'font': random.choice(['Helvetica', 'Times-Roman']),
                'font_size': random.choice([9, 10, 11]),
                'use_borders': random.choice([True, False]),
                'alternating_rows': False,
                'typo_rate': 0.03
            }
        else:  # owner_generated
            return {
                'font': random.choice(['Helvetica', 'Times-Roman', 'Courier']),
                'font_size': random.choice([8, 9, 10]),
                'use_borders': False,
                'alternating_rows': False,
                'typo_rate': 0.05
            }

    @abstractmethod
    def generate_pdf(self, output_path, **kwargs):
        """Generate PDF document"""
        pass

    @abstractmethod
    def generate_excel(self, output_path, **kwargs):
        """Generate Excel document"""
        pass

    @abstractmethod
    def generate_answer_key(self, output_path, **kwargs):
        """Generate answer key CSV with expected extraction results"""
        pass
