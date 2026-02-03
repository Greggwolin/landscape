# Generated manually for Alpha Assistant enhancements
# Extends tester_feedback with Landscaper digestion fields
# Adds tbl_changelog for version tracking

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('feedback', '0001_initial'),
    ]

    operations = [
        # Remove is_resolved in favor of status field
        migrations.RemoveField(
            model_name='testerfeedback',
            name='is_resolved',
        ),
        migrations.RemoveField(
            model_name='testerfeedback',
            name='resolved_at',
        ),
        migrations.RemoveField(
            model_name='testerfeedback',
            name='resolved_by',
        ),

        # Add new status field
        migrations.AddField(
            model_name='testerfeedback',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('submitted', 'Submitted'),
                    ('under_review', 'Under Review'),
                    ('addressed', 'Addressed'),
                ],
                default='submitted',
                help_text='Current status of the feedback item'
            ),
        ),

        # Add internal_id for cross-reference/deduplication
        migrations.AddField(
            model_name='testerfeedback',
            name='internal_id',
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                help_text='Internal UUID for cross-reference'
            ),
        ),

        # Add category (Landscaper-classified)
        migrations.AddField(
            model_name='testerfeedback',
            name='category',
            field=models.CharField(
                max_length=50,
                null=True,
                blank=True,
                choices=[
                    ('bug', 'Bug'),
                    ('feature_request', 'Feature Request'),
                    ('ux_confusion', 'UX Confusion'),
                    ('question', 'Question'),
                ],
                help_text='Landscaper-classified category'
            ),
        ),

        # Add affected_module
        migrations.AddField(
            model_name='testerfeedback',
            name='affected_module',
            field=models.CharField(
                max_length=100,
                null=True,
                blank=True,
                help_text='Page/component where feedback originated'
            ),
        ),

        # Add landscaper_summary
        migrations.AddField(
            model_name='testerfeedback',
            name='landscaper_summary',
            field=models.TextField(
                null=True,
                blank=True,
                help_text='Digested summary from Landscaper'
            ),
        ),

        # Add landscaper_raw_chat
        migrations.AddField(
            model_name='testerfeedback',
            name='landscaper_raw_chat',
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='Full conversation that led to feedback'
            ),
        ),

        # Add browser_context
        migrations.AddField(
            model_name='testerfeedback',
            name='browser_context',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='Browser, screen size, URL context'
            ),
        ),

        # Add duplicate_of for deduplication
        migrations.AddField(
            model_name='testerfeedback',
            name='duplicate_of',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='duplicates',
                to='feedback.testerfeedback',
                help_text='Links to original if this is a duplicate'
            ),
        ),

        # Add report_count
        migrations.AddField(
            model_name='testerfeedback',
            name='report_count',
            field=models.PositiveIntegerField(
                default=1,
                help_text='How many users reported same issue'
            ),
        ),

        # Add admin_response (public reply to tester)
        migrations.AddField(
            model_name='testerfeedback',
            name='admin_response',
            field=models.TextField(
                null=True,
                blank=True,
                help_text='Public reply visible to tester'
            ),
        ),

        # Add admin_responded_at
        migrations.AddField(
            model_name='testerfeedback',
            name='admin_responded_at',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='When admin responded'
            ),
        ),

        # Add index on internal_id
        migrations.AddIndex(
            model_name='testerfeedback',
            index=models.Index(fields=['internal_id'], name='idx_feedback_internal_id'),
        ),

        # Add index on status
        migrations.AddIndex(
            model_name='testerfeedback',
            index=models.Index(fields=['status'], name='idx_feedback_status'),
        ),

        # Add index on category
        migrations.AddIndex(
            model_name='testerfeedback',
            index=models.Index(fields=['category'], name='idx_feedback_category'),
        ),

        # Create Changelog model
        migrations.CreateModel(
            name='Changelog',
            fields=[
                ('changelog_id', models.AutoField(primary_key=True, serialize=False)),
                ('version', models.CharField(max_length=20, help_text='e.g., v0.1.24')),
                ('deployed_at', models.DateTimeField(auto_now_add=True)),
                ('auto_generated_notes', models.TextField(
                    null=True,
                    blank=True,
                    help_text='From git commits'
                )),
                ('published_notes', models.TextField(
                    null=True,
                    blank=True,
                    help_text='Edited/approved version'
                )),
                ('is_published', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Changelog',
                'verbose_name_plural': 'Changelog Entries',
                'db_table': 'landscape"."tbl_changelog',
                'ordering': ['-deployed_at'],
            },
        ),

        # Add indexes for changelog
        migrations.AddIndex(
            model_name='changelog',
            index=models.Index(fields=['version'], name='idx_changelog_version'),
        ),
        migrations.AddIndex(
            model_name='changelog',
            index=models.Index(fields=['-deployed_at'], name='idx_changelog_deployed'),
        ),
    ]
