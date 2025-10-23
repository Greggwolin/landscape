"""
Unit tests for Projects app models.
Phase 6: Testing Enhancement
"""
import pytest
from datetime import date, datetime
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from apps.projects.models import Project
from apps.projects.lookups import LookupFamily, LookupType, LookupSubtype, PropertyTypeConfig
from apps.projects.models_user import User, UserProfile, APIKey, PasswordResetToken


@pytest.mark.django_db
class TestProjectModel:
    """Test Project model functionality."""
    
    def test_create_project_minimal(self):
        """Test creating a project with minimal required fields."""
        project = Project.objects.create(
            project_name="Test Project"
        )
        assert project.project_id is not None
        assert project.project_name == "Test Project"
        assert project.is_active is True
        
    def test_create_project_full(self):
        """Test creating a project with all fields."""
        project = Project.objects.create(
            project_name="Full Test Project",
            project_type="SFD",
            development_type="Master-Planned Community",
            property_type_code="MPC",
            financial_model_type="DCF",
            acres_gross=100.50,
            location_lat=33.7490,
            location_lon=-84.3880,
            location_description="Atlanta metro area",
            project_address="123 Main St, Atlanta, GA 30303",
            jurisdiction_city="Atlanta",
            jurisdiction_county="Fulton",
            jurisdiction_state="GA",
            target_units=500,
            price_range_low=Decimal("250000.00"),
            price_range_high=Decimal("450000.00"),
            description="Large master-planned community",
            discount_rate_pct=Decimal("0.1000"),
            cost_of_capital_pct=Decimal("0.0800"),
            calculation_frequency="Monthly",
            gis_metadata={"boundary_type": "polygon", "coordinates": []},
            is_active=True
        )
        
        assert project.project_id is not None
        assert project.project_name == "Full Test Project"
        assert project.project_type == "SFD"
        assert project.acres_gross == 100.50
        assert project.target_units == 500
        assert project.discount_rate_pct == Decimal("0.1000")
        assert project.gis_metadata["boundary_type"] == "polygon"
        
    def test_project_str_method(self):
        """Test Project __str__ method."""
        project = Project.objects.create(project_name="String Test Project")
        assert str(project) == "String Test Project"
        
        # Test with no name
        project_no_name = Project.objects.create(project_name="")
        assert f"Project {project_no_name.project_id}" in str(project_no_name)
        
    def test_project_ordering(self):
        """Test that projects are ordered by created_at descending."""
        p1 = Project.objects.create(
            project_name="Project 1",
            created_at=datetime(2025, 1, 1, 12, 0, 0)
        )
        p2 = Project.objects.create(
            project_name="Project 2",
            created_at=datetime(2025, 1, 2, 12, 0, 0)
        )
        
        projects = list(Project.objects.all())
        # Should be ordered newest first
        assert projects[0].project_id == p2.project_id
        assert projects[1].project_id == p1.project_id
        
    def test_project_json_field(self):
        """Test gis_metadata JSON field."""
        metadata = {
            "boundary_type": "polygon",
            "area_sqft": 4356000,
            "coordinates": [[33.7490, -84.3880], [33.7500, -84.3890]]
        }
        project = Project.objects.create(
            project_name="GIS Test",
            gis_metadata=metadata
        )
        
        retrieved = Project.objects.get(project_id=project.project_id)
        assert retrieved.gis_metadata == metadata
        assert retrieved.gis_metadata["area_sqft"] == 4356000


@pytest.mark.django_db
class TestLookupModels:
    """Test lookup table models."""
    
    def test_lookup_family(self):
        """Test LookupFamily model."""
        family = LookupFamily.objects.create(
            family_code="RES",
            family_name="Residential"
        )
        assert str(family) == "RES - Residential"
        
    def test_lookup_type(self):
        """Test LookupType model."""
        family = LookupFamily.objects.create(
            family_code="RES",
            family_name="Residential"
        )
        lookup_type = LookupType.objects.create(
            type_code="SFD",
            type_name="Single Family Detached",
            family=family
        )
        assert str(lookup_type) == "SFD - Single Family Detached"
        assert lookup_type.family.family_code == "RES"
        
    def test_lookup_subtype(self):
        """Test LookupSubtype model."""
        family = LookupFamily.objects.create(
            family_code="RES",
            family_name="Residential"
        )
        subtype = LookupSubtype.objects.create(
            subtype_code="SFD_LUXURY",
            subtype_name="Luxury Single Family",
            family=family,
            active=True
        )
        assert str(subtype) == "SFD_LUXURY - Luxury Single Family"
        assert subtype.active is True
        
    def test_property_type_config(self):
        """Test PropertyTypeConfig model."""
        config = PropertyTypeConfig.objects.create(
            property_type_code="MPC",
            property_type_label="Master Planned Community",
            is_active=True
        )
        assert str(config) == "MPC - Master Planned Community"
        assert config.is_active is True


@pytest.mark.django_db
class TestUserModel:
    """Test User and related models."""
    
    def test_create_user(self):
        """Test creating a basic user."""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.check_password("testpass123")
        assert user.role == "user"
        assert user.is_verified is False
        
    def test_create_superuser(self):
        """Test creating a superuser."""
        user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="admin123"
        )
        assert user.is_superuser is True
        assert user.is_staff is True
        assert user.role == "admin"
        
    def test_user_str_method(self):
        """Test User __str__ method."""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="test123"
        )
        assert str(user) == "testuser (test@example.com)"
        
    def test_user_profile_creation(self):
        """Test UserProfile creation."""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="test123"
        )
        profile = UserProfile.objects.create(
            user=user,
            bio="Test bio",
            timezone="America/New_York",
            preferences={"theme": "dark"}
        )
        assert profile.user.username == "testuser"
        assert profile.bio == "Test bio"
        assert profile.timezone == "America/New_York"
        assert profile.preferences["theme"] == "dark"
        
    def test_api_key_creation(self):
        """Test APIKey creation and validation."""
        user = User.objects.create_user(
            username="apiuser",
            email="api@example.com",
            password="test123"
        )
        api_key = APIKey.objects.create(
            user=user,
            name="Test API Key"
        )
        
        # generate_key should be called automatically
        assert api_key.key_hash is not None
        assert len(api_key.key_hash) == 64  # SHA-256 hex
        assert api_key.is_active is True
        assert api_key.last_used_at is None
        
    def test_password_reset_token_creation(self):
        """Test PasswordResetToken creation."""
        user = User.objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="test123"
        )
        token = PasswordResetToken.objects.create(user=user)
        
        assert token.user.username == "resetuser"
        assert token.token is not None
        assert len(token.token) == 64  # 32 bytes = 64 hex chars
        assert token.used is False
        assert token.expires_at is not None


@pytest.mark.django_db
class TestModelRelationships:
    """Test model relationships and foreign keys."""
    
    def test_lookup_type_family_relationship(self):
        """Test LookupType to LookupFamily relationship."""
        family = LookupFamily.objects.create(
            family_code="RES",
            family_name="Residential"
        )
        type1 = LookupType.objects.create(
            type_code="SFD",
            type_name="Single Family",
            family=family
        )
        type2 = LookupType.objects.create(
            type_code="MFR",
            type_name="Multifamily",
            family=family
        )
        
        # Access related types from family
        types = family.lookuptype_set.all()
        assert types.count() == 2
        assert type1 in types
        assert type2 in types
        
    def test_user_profile_relationship(self):
        """Test User to UserProfile one-to-one relationship."""
        user = User.objects.create_user(
            username="profileuser",
            email="profile@example.com",
            password="test123"
        )
        profile = UserProfile.objects.create(
            user=user,
            bio="Profile test"
        )
        
        # Access profile from user
        assert user.userprofile.bio == "Profile test"
        
    def test_user_api_keys_relationship(self):
        """Test User to APIKey one-to-many relationship."""
        user = User.objects.create_user(
            username="apiuser",
            email="api@example.com",
            password="test123"
        )
        key1 = APIKey.objects.create(user=user, name="Key 1")
        key2 = APIKey.objects.create(user=user, name="Key 2")
        
        # Access keys from user
        keys = user.api_keys.all()
        assert keys.count() == 2
        assert key1 in keys
        assert key2 in keys


@pytest.mark.django_db
class TestModelValidation:
    """Test model field validation."""
    
    def test_project_decimal_precision(self):
        """Test decimal field precision validation."""
        project = Project.objects.create(
            project_name="Decimal Test",
            discount_rate_pct=Decimal("0.1234"),
            cost_of_capital_pct=Decimal("0.0856")
        )
        assert project.discount_rate_pct == Decimal("0.1234")
        assert project.cost_of_capital_pct == Decimal("0.0856")
        
    def test_user_email_uniqueness(self):
        """Test that user emails must be unique."""
        User.objects.create_user(
            username="user1",
            email="duplicate@example.com",
            password="test123"
        )
        
        # Second user with same email should raise error
        with pytest.raises(IntegrityError):
            User.objects.create_user(
                username="user2",
                email="duplicate@example.com",
                password="test123"
            )
