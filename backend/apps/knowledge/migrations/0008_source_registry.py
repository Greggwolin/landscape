from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


SEED_SOURCES = [
    {
        'source_name': 'CBRE',
        'source_type': 'brokerage',
        'aliases': ['CBRE Research', 'Coldwell Banker Richard Ellis', 'CB Richard Ellis'],
    },
    {
        'source_name': 'Marcus & Millichap',
        'source_type': 'brokerage',
        'aliases': ['M&M', 'Marcus and Millichap'],
    },
    {
        'source_name': 'Colliers',
        'source_type': 'brokerage',
        'aliases': ['Colliers International'],
    },
    {
        'source_name': 'Cushman & Wakefield',
        'source_type': 'brokerage',
        'aliases': ['C&W'],
    },
    {
        'source_name': 'JLL',
        'source_type': 'brokerage',
        'aliases': ['Jones Lang LaSalle', 'Jones Lang Lasalle'],
    },
    {
        'source_name': 'Newmark',
        'source_type': 'brokerage',
        'aliases': ['Newmark Knight Frank', 'Newmark Group', 'NKF'],
    },
    {
        'source_name': 'Berkadia',
        'source_type': 'brokerage',
        'aliases': ['Berkadia Commercial Mortgage'],
    },
    {
        'source_name': 'Eastdil Secured',
        'source_type': 'brokerage',
        'aliases': [],
    },
    {
        'source_name': 'Walker & Dunlop',
        'source_type': 'brokerage',
        'aliases': ['Walker Dunlop'],
    },
    {
        'source_name': 'IREM',
        'source_type': 'trade_association',
        'aliases': ['Institute of Real Estate Management'],
    },
    {
        'source_name': 'NAR',
        'source_type': 'trade_association',
        'aliases': ['National Association of Realtors'],
    },
    {
        'source_name': 'ULI',
        'source_type': 'trade_association',
        'aliases': ['Urban Land Institute'],
    },
    {
        'source_name': 'Appraisal Institute',
        'source_type': 'trade_association',
        'aliases': ['AI'],
    },
    {
        'source_name': 'CoStar',
        'source_type': 'data_provider',
        'aliases': ['CoStar Group', 'CoStar Analytics'],
    },
    {
        'source_name': 'RealPage',
        'source_type': 'data_provider',
        'aliases': ['RealPage Analytics'],
    },
    {
        'source_name': 'Yardi',
        'source_type': 'data_provider',
        'aliases': ['Yardi Matrix'],
    },
    {
        'source_name': 'REIS',
        'source_type': 'data_provider',
        'aliases': ['Reis Inc', "Moody's Analytics REIS"],
    },
    {
        'source_name': 'Zonda',
        'source_type': 'data_provider',
        'aliases': ['Zonda Home', 'Meyers Research', 'Metrostudy'],
    },
    {
        'source_name': 'RealtyTrac',
        'source_type': 'data_provider',
        'aliases': ['ATTOM Data'],
    },
    {
        'source_name': 'Federal Reserve',
        'source_type': 'government',
        'aliases': ['Fed', 'The Fed', 'Federal Reserve Board'],
    },
    {
        'source_name': 'Freddie Mac',
        'source_type': 'government',
        'aliases': ['Federal Home Loan Mortgage Corporation', 'FHLMC'],
    },
    {
        'source_name': 'Fannie Mae',
        'source_type': 'government',
        'aliases': ['Federal National Mortgage Association', 'FNMA'],
    },
    {
        'source_name': 'HUD',
        'source_type': 'government',
        'aliases': ['U.S. Department of Housing and Urban Development'],
    },
    {
        'source_name': 'Census Bureau',
        'source_type': 'government',
        'aliases': ['U.S. Census Bureau', 'American Community Survey'],
    },
    {
        'source_name': 'BLS',
        'source_type': 'government',
        'aliases': ['Bureau of Labor Statistics'],
    },
]


def seed_sources(apps, schema_editor):
    KnowledgeSource = apps.get_model('knowledge', 'KnowledgeSource')
    for seed in SEED_SOURCES:
        KnowledgeSource.objects.update_or_create(
            source_name=seed['source_name'],
            defaults={
                'source_type': seed['source_type'],
                'aliases': seed['aliases'],
                'created_by': 'system',
                'is_active': True,
            },
        )


def unseed_sources(apps, schema_editor):
    KnowledgeSource = apps.get_model('knowledge', 'KnowledgeSource')
    names = [s['source_name'] for s in SEED_SOURCES]
    KnowledgeSource.objects.filter(source_name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0007_add_extraction_job'),
    ]

    operations = [
        migrations.CreateModel(
            name='KnowledgeSource',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source_name', models.CharField(max_length=200, unique=True)),
                ('source_type', models.CharField(choices=[('publisher', 'Publisher'), ('brokerage', 'Brokerage'), ('government', 'Government'), ('academic', 'Academic'), ('trade_association', 'Trade Association'), ('data_provider', 'Data Provider'), ('other', 'Other')], default='other', max_length=50)),
                ('aliases', models.JSONField(default=list)),
                ('website', models.CharField(blank=True, max_length=500, null=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('document_count', models.IntegerField(default=0)),
                ('first_seen_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('last_seen_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('created_by', models.CharField(default='system', max_length=100)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'db_table': 'landscape"."tbl_knowledge_source',
                'ordering': ['source_name'],
                'constraints': [
                    models.CheckConstraint(
                        check=models.Q(
                            source_type__in=[
                                'publisher',
                                'brokerage',
                                'government',
                                'academic',
                                'trade_association',
                                'data_provider',
                                'other',
                            ]
                        ),
                        name='tbl_knowledge_source_type_chk'
                    )
                ],
            },
        ),
        migrations.AddField(
            model_name='platformknowledge',
            name='metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='platformknowledge',
            name='source',
            field=models.ForeignKey(blank=True, db_column='source_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='platform_documents', to='knowledge.knowledgesource'),
        ),
        migrations.RunPython(seed_sources, unseed_sources),
    ]
