"""
Management command to manually clone demo projects for a user.

Usage:
    python manage.py clone_demo_projects <username>
    python manage.py clone_demo_projects <username> --project chadron
    python manage.py clone_demo_projects <username> --project peoria_lakes
    python manage.py clone_demo_projects <username> --force
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from apps.projects.models_user import User
from apps.projects.services.project_cloner import ProjectCloner


class Command(BaseCommand):
    help = 'Clone demo projects for a user'

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            type=str,
            help='Username of the user to provision demo projects for'
        )
        parser.add_argument(
            '--project',
            type=str,
            choices=['chadron', 'peoria_lakes', 'all'],
            default='all',
            help='Which demo project to clone (default: all)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-provisioning even if already provisioned'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually cloning'
        )

    def handle(self, *args, **options):
        username = options['username']
        project_choice = options['project']
        force = options['force']
        dry_run = options['dry_run']

        # Get user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f"User '{username}' not found")

        # Check if already provisioned
        if user.demo_projects_provisioned and not force:
            self.stdout.write(
                self.style.WARNING(
                    f"User '{username}' already has demo projects provisioned. "
                    f"Use --force to re-provision."
                )
            )
            return

        # Get demo project IDs
        demo_ids = getattr(settings, 'DEMO_PROJECT_IDS', {})
        if not demo_ids:
            raise CommandError(
                "DEMO_PROJECT_IDS not configured in settings. "
                "Add DEMO_PROJECT_IDS = {'chadron': 17, 'peoria_lakes': 7} to settings.py"
            )

        # Determine which projects to clone
        projects_to_clone = []
        if project_choice == 'all':
            projects_to_clone = list(demo_ids.items())
        else:
            project_id = demo_ids.get(project_choice)
            if not project_id:
                raise CommandError(f"Demo project '{project_choice}' not found in DEMO_PROJECT_IDS")
            projects_to_clone = [(project_choice, project_id)]

        # Report what we'll do
        self.stdout.write(f"\nProvisioning demo projects for user: {username}")
        self.stdout.write(f"  Role: {user.role}")
        self.stdout.write(f"  Already provisioned: {user.demo_projects_provisioned}")
        self.stdout.write(f"\nProjects to clone:")
        for name, project_id in projects_to_clone:
            self.stdout.write(f"  - {name} (ID: {project_id})")

        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] No changes made"))
            return

        # Clone projects
        cloner = ProjectCloner()
        cloned_projects = []

        for name, project_id in projects_to_clone:
            try:
                self.stdout.write(f"\nCloning {name} (ID: {project_id})...")
                cloned = cloner.clone_project(
                    project_id,
                    user,
                    name_suffix=f"(Demo - {username})"
                )
                cloned_projects.append((name, cloned))
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Created: {cloned.project_name} (ID: {cloned.project_id})"
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  Failed to clone {name}: {e}")
                )

        # Mark user as provisioned if we cloned all projects
        if project_choice == 'all' and len(cloned_projects) == len(projects_to_clone):
            user.demo_projects_provisioned = True
            user.save(update_fields=['demo_projects_provisioned'])
            self.stdout.write(
                self.style.SUCCESS(f"\nMarked {username} as provisioned")
            )

        # Summary
        self.stdout.write(f"\nSummary:")
        self.stdout.write(f"  Total cloned: {len(cloned_projects)}/{len(projects_to_clone)}")
        for name, project in cloned_projects:
            self.stdout.write(f"  - {project.project_name} (ID: {project.project_id})")
