"""
Landscaper AI models for chat history and advice tracking.

These models store:
- Chat message history between users and Landscaper AI
- AI-suggested assumptions and their confidence levels
- Variance tracking between AI advice and user decisions
"""

from django.db import models
from django.contrib.auth import get_user_model
import time
import random

User = get_user_model()


class ChatMessage(models.Model):
    """
    Stores individual chat messages in Landscaper AI conversations.

    Maps to landscape.landscaper_chat_message table.
    """

    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    message_id = models.CharField(
        max_length=100,
        primary_key=True,
        help_text='Format: msg_{timestamp}_{random4}'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='landscaper_messages'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='User who sent the message (null for assistant messages)'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        help_text='Message sender: user or assistant'
    )
    content = models.TextField(
        help_text='Message content'
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text='When message was created'
    )
    metadata = models.JSONField(
        null=True,
        blank=True,
        help_text='Additional metadata (e.g., confidence scores, suggestions)'
    )

    class Meta:
        db_table = 'landscape"."landscaper_chat_message'
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['project', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'

    def save(self, *args, **kwargs):
        """Auto-generate message_id if not provided."""
        if not self.message_id:
            timestamp_ms = int(time.time() * 1000)
            random_suffix = random.randint(1000, 9999)
            self.message_id = f"msg_{timestamp_ms}_{random_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.role} - {self.project.project_name} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"


class LandscaperAdvice(models.Model):
    """
    Stores AI-suggested assumptions and recommendations.

    Used to calculate variance between what Landscaper AI suggested
    and what the user actually entered in their project assumptions.

    Maps to landscape.landscaper_advice table.
    """

    CONFIDENCE_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
        ('placeholder', 'Placeholder'),  # For stubbed Phase 6 data
    ]

    advice_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='landscaper_advice'
    )
    message = models.ForeignKey(
        ChatMessage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='message_id',
        help_text='Chat message that generated this advice'
    )
    assumption_key = models.CharField(
        max_length=100,
        help_text='Key identifying the assumption (e.g., land_price_per_acre, grading_cost_per_sf)'
    )
    lifecycle_stage = models.CharField(
        max_length=50,
        help_text='Development stage (e.g., ACQUISITION, PLANNING, CONSTRUCTION)'
    )
    suggested_value = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        help_text='AI-suggested value for the assumption'
    )
    confidence_level = models.CharField(
        max_length=20,
        choices=CONFIDENCE_CHOICES,
        help_text='AI confidence in this suggestion'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When advice was generated'
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text='Additional context or reasoning for the suggestion'
    )

    class Meta:
        db_table = 'landscape"."landscaper_advice'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'assumption_key']),
            models.Index(fields=['project', 'lifecycle_stage']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Landscaper Advice'
        verbose_name_plural = 'Landscaper Advice'

    def __str__(self):
        return f"{self.project.project_name} - {self.assumption_key}: {self.suggested_value}"
