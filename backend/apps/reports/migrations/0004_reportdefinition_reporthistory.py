# Generated manually — creates ReportDefinition and ReportHistory tables,
# and adds report_definition FK + property_types + report_category to ReportTemplate.

import django.contrib.postgres.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportDefinition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('report_code', models.CharField(max_length=50, unique=True)),
                ('report_name', models.CharField(max_length=200)),
                ('report_category', models.CharField(max_length=50)),
                ('property_types', django.contrib.postgres.fields.ArrayField(
                    base_field=models.CharField(max_length=10),
                    default=list,
                    help_text='Project type codes: LAND, MF, OFF, RET, IND, HTL, MXU',
                    size=None,
                )),
                ('report_tier', models.CharField(
                    choices=[('essential', 'Essential'), ('advanced', 'Advanced'), ('premium', 'Premium')],
                    default='essential',
                    max_length=20,
                )),
                ('description', models.TextField(blank=True, default='')),
                ('argus_equivalent', models.CharField(blank=True, default='', max_length=200)),
                ('spec_file', models.CharField(blank=True, default='', max_length=100)),
                ('data_readiness', models.CharField(
                    choices=[('ready', 'Ready'), ('partial', 'Partial'), ('not_ready', 'Not Ready')],
                    default='not_ready',
                    max_length=20,
                )),
                ('generator_class', models.CharField(blank=True, default='', max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'landscape"."tbl_report_definition',
                'managed': True,
                'ordering': ['sort_order'],
            },
        ),
        migrations.CreateModel(
            name='ReportHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('project_id', models.BigIntegerField()),
                ('parameters', models.JSONField(blank=True, default=dict)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('export_format', models.CharField(default='html', max_length=20)),
                ('file_path', models.TextField(blank=True, default='')),
                ('generation_time_ms', models.IntegerField(blank=True, null=True)),
                ('report_definition', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='history',
                    to='reports.reportdefinition',
                )),
            ],
            options={
                'db_table': 'landscape"."tbl_report_history',
                'managed': True,
                'ordering': ['-generated_at'],
            },
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='report_definition',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='templates',
                to='reports.reportdefinition',
            ),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='property_types',
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=10),
                blank=True,
                default=list,
                size=None,
            ),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='report_category',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
