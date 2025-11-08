"""
Budget Category Hierarchy Models

User-defined 4-level category taxonomy for budget classification.
Maps to landscape.core_budget_category table.

Created: 2025-11-02
"""

from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Q, Count


class BudgetCategory(models.Model):
    """
    Hierarchical budget category taxonomy (4 levels max).

    Supports both global templates and project-specific categories.

    Examples:
    - Land Development: Acquisition → Due Diligence → Environmental → Phase I ESA
    - Multifamily: Revenue → Rental Income → Base Rent → Market Rate

    Levels:
    - Level 1: Top-level (Revenue, OpEx, CapEx, Acquisition, etc.)
    - Level 2: Major categories (Land, Vertical, Utilities, etc.)
    - Level 3: Sub-categories (Engineering, Permits, Impact Fees, etc.)
    - Level 4: Detail items (Geotechnical, Civil, Traffic Study, etc.)
    """

    category_id = models.BigAutoField(primary_key=True)

    # Hierarchy
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        db_column='parent_id',
        help_text='Parent category (null for Level 1)'
    )
    level = models.SmallIntegerField(
        help_text='Hierarchy level: 1 (top), 2, 3, 4 (bottom)',
        choices=[
            (1, 'Level 1'),
            (2, 'Level 2'),
            (3, 'Level 3'),
            (4, 'Level 4'),
        ]
    )

    # Identity
    code = models.CharField(
        max_length=50,
        help_text='Unique code (e.g., LAND_ACQ, MF_REV_RENT)'
    )
    name = models.CharField(
        max_length=200,
        help_text='Display name'
    )
    description = models.TextField(
        null=True,
        blank=True,
        help_text='Detailed description or usage notes'
    )

    # Scope (Template vs Project-Specific)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='project_id',
        related_name='budget_categories',
        help_text='Project ID for custom categories (null for templates)'
    )
    is_template = models.BooleanField(
        default=False,
        help_text='True for global templates, False for project-specific'
    )
    template_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Template name (e.g., "Land Development", "Multifamily")'
    )
    project_type_code = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text='Project type code (LAND, MF, RET, OFF, etc.)'
    )

    # Display & Ordering
    sort_order = models.IntegerField(
        default=0,
        help_text='Display order within same parent'
    )
    icon = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text='Icon class name (optional)'
    )
    color = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text='Display color (hex or CSS color name)'
    )

    # Metadata
    is_active = models.BooleanField(
        default=True,
        help_text='Active/archived status'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    class Meta:
        managed = False  # Managed by SQL migrations
        db_table = 'core_budget_category'
        ordering = ['sort_order', 'name']
        unique_together = [
            ['code', 'project', 'level'],  # Unique code per project per level
        ]
        indexes = [
            models.Index(fields=['parent'], name='idx_budget_cat_parent'),
            models.Index(fields=['project'], name='idx_budget_cat_project'),
            models.Index(fields=['level'], name='idx_budget_cat_level'),
            models.Index(fields=['template_name', 'project_type_code'], name='idx_budget_cat_template'),
        ]
        verbose_name = 'Budget Category'
        verbose_name_plural = 'Budget Categories'

    def __str__(self):
        if self.is_template:
            return f"[{self.template_name}] {self.name} (L{self.level})"
        return f"{self.name} (L{self.level})"

    def clean(self):
        """
        Validate hierarchy consistency.

        Rules:
        1. Level 1 categories must have no parent
        2. Level 2-4 categories must have a parent
        3. Parent level must be exactly (child level - 1)
        4. Template categories must have template_name
        5. Project categories must have project_id
        """
        # Rule 1: Level 1 categories have no parent
        if self.level == 1 and self.parent is not None:
            raise ValidationError('Level 1 categories cannot have a parent')

        # Rule 2: Level 2-4 categories must have a parent
        if self.level > 1 and self.parent is None:
            raise ValidationError(f'Level {self.level} categories must have a parent')

        # Rule 3: Parent level consistency
        if self.parent and self.parent.level != self.level - 1:
            raise ValidationError(
                f'Parent level ({self.parent.level}) must be exactly one level '
                f'above child level ({self.level})'
            )

        # Rule 4: Template validation
        if self.is_template and not self.template_name:
            raise ValidationError('Template categories must have a template_name')

        # Rule 5: Project validation
        if not self.is_template and not self.project:
            raise ValidationError('Project-specific categories must have a project_id')

        # Prevent mix of template and project
        if self.is_template and self.project:
            raise ValidationError('Template categories cannot be assigned to a project')

    def save(self, *args, **kwargs):
        """Run validation before saving."""
        self.full_clean()
        super().save(*args, **kwargs)

    def get_path(self):
        """
        Get full category path (breadcrumb).

        Returns:
            str: "Acquisition > Due Diligence > Environmental > Phase I ESA"
        """
        path_parts = []
        current = self

        while current:
            path_parts.insert(0, current.name)
            current = current.parent

        return ' > '.join(path_parts)

    def get_code_path(self):
        """
        Get full code path.

        Returns:
            str: "LAND_ACQ.LAND_ACQ_DD.LAND_ACQ_DD_ENV.LAND_ACQ_DD_ENV_P1"
        """
        path_parts = []
        current = self

        while current:
            path_parts.insert(0, current.code)
            current = current.parent

        return '.'.join(path_parts)

    def get_descendants(self, include_self=False):
        """
        Get all descendant categories (children, grandchildren, etc.).

        Args:
            include_self (bool): Include this category in results

        Returns:
            QuerySet: All descendant categories
        """
        descendants = BudgetCategory.objects.none()

        if include_self:
            descendants = BudgetCategory.objects.filter(pk=self.pk)

        # Get all children
        children = self.children.all()
        descendants = descendants | children

        # Recursively get children's descendants
        for child in children:
            descendants = descendants | child.get_descendants()

        return descendants.distinct()

    def get_ancestors(self, include_self=False):
        """
        Get all ancestor categories (parent, grandparent, etc.).

        Args:
            include_self (bool): Include this category in results

        Returns:
            QuerySet: All ancestor categories
        """
        ancestors = []

        if include_self:
            ancestors.append(self)

        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent

        # Return as QuerySet
        if ancestors:
            return BudgetCategory.objects.filter(
                pk__in=[cat.pk for cat in ancestors]
            )
        return BudgetCategory.objects.none()

    def get_siblings(self, include_self=False):
        """
        Get sibling categories (same parent, same level).

        Args:
            include_self (bool): Include this category in results

        Returns:
            QuerySet: Sibling categories
        """
        siblings = BudgetCategory.objects.filter(
            parent=self.parent,
            level=self.level,
            is_active=True
        )

        if not include_self:
            siblings = siblings.exclude(pk=self.pk)

        return siblings

    def has_budget_items(self):
        """
        Check if this category is referenced by any budget items.

        Returns:
            bool: True if budget items reference this category
        """
        from .models import BudgetItem

        # Check all 4 levels for references
        return BudgetItem.objects.filter(
            Q(category_l1_id=self.pk) |
            Q(category_l2_id=self.pk) |
            Q(category_l3_id=self.pk) |
            Q(category_l4_id=self.pk)
        ).exists()

    @classmethod
    def get_tree_for_project(cls, project_id, include_templates=False):
        """
        Get category tree for a project.

        Args:
            project_id (int): Project ID
            include_templates (bool): Include global templates

        Returns:
            QuerySet: All categories for the project (optionally including templates)
        """
        filters = Q(project_id=project_id, is_template=False)

        if include_templates:
            # Also include templates matching project type
            from apps.projects.models import Project
            try:
                project = Project.objects.get(pk=project_id)
                filters |= Q(
                    is_template=True,
                    project_type_code=project.project_type_code
                )
            except Project.DoesNotExist:
                pass

        return cls.objects.filter(filters).order_by('level', 'sort_order', 'name')

    @classmethod
    def get_template_categories(cls, template_name=None, project_type_code=None):
        """
        Get template categories.

        Args:
            template_name (str, optional): Filter by template name
            project_type_code (str, optional): Filter by project type

        Returns:
            QuerySet: Template categories
        """
        qs = cls.objects.filter(is_template=True)

        if template_name:
            qs = qs.filter(template_name=template_name)

        if project_type_code:
            qs = qs.filter(project_type_code=project_type_code)

        return qs.order_by('level', 'sort_order', 'name')

    @classmethod
    def copy_template_to_project(cls, template_name, project_type_code, project_id):
        """
        Copy template categories to a project (create project-specific copies).

        Args:
            template_name (str): Template name to copy
            project_type_code (str): Project type code
            project_id (int): Target project ID

        Returns:
            int: Number of categories created
        """
        from apps.projects.models import Project

        # Get project
        project = Project.objects.get(pk=project_id)

        # Get template categories
        templates = cls.get_template_categories(template_name, project_type_code)

        # Map old IDs to new objects (for parent references)
        id_map = {}
        created_count = 0

        # Process in level order to ensure parents exist first
        for level in [1, 2, 3, 4]:
            level_templates = templates.filter(level=level)

            for template in level_templates:
                # Create project-specific copy
                new_cat = BudgetCategory(
                    parent=id_map.get(template.parent_id) if template.parent_id else None,
                    level=template.level,
                    code=template.code,
                    name=template.name,
                    description=template.description,
                    project=project,
                    is_template=False,
                    template_name=None,  # Not a template anymore
                    project_type_code=None,
                    sort_order=template.sort_order,
                    icon=template.icon,
                    color=template.color,
                    is_active=True
                )
                new_cat.save()

                # Map old template ID to new category for children
                id_map[template.pk] = new_cat
                created_count += 1

        return created_count

    @classmethod
    def get_level_statistics(cls, project_id=None, template_name=None):
        """
        Get count of categories at each level.

        Args:
            project_id (int, optional): Filter by project
            template_name (str, optional): Filter by template

        Returns:
            dict: Level counts like {'level_1': 4, 'level_2': 12, ...}
        """
        qs = cls.objects.filter(is_active=True)

        if project_id:
            qs = qs.filter(project_id=project_id)

        if template_name:
            qs = qs.filter(template_name=template_name)

        level_counts = qs.values('level').annotate(
            count=Count('category_id')
        ).order_by('level')

        return {
            f'level_{item["level"]}': item['count']
            for item in level_counts
        }


# Re-export for convenience
__all__ = ['BudgetCategory']
