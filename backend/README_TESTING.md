# Django Backend Testing Guide

Complete guide for running and writing tests for the Landscape Platform Django backend.

## Quick Start

```bash
# Activate virtual environment
cd backend
source venv/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov-report=html
open htmlcov/index.html

# Run specific app tests
pytest apps/projects/
pytest apps/containers/
pytest apps/financial/
pytest apps/calculations/
```

## Test Suite Overview

**Total Tests:** 140+  
**Test Files:** 8  
**Apps Covered:** 4 (projects, containers, financial, calculations)  
**Test Types:** Unit, API, Integration, Performance

### Test Files by App

```
backend/
└── apps/
    ├── projects/
    │   ├── tests_models.py      # 20 tests - Model unit tests
    │   ├── tests_api.py         # 6 tests - API endpoint tests
    │   └── tests_auth.py        # 15 tests - Authentication (Phase 5)
    ├── containers/
    │   └── tests.py             # 25 tests - Container models & API
    ├── financial/
    │   └── tests.py             # 30 tests - Financial models & API
    └── calculations/
        ├── tests.py             # 10 tests - Basic calculations (Phase 4)
        └── tests_integration.py # 35 tests - Calculation engine integration
```

## Running Tests

### Basic Commands

```bash
# All tests
pytest

# Verbose output
pytest -v

# Extra verbose with test names
pytest -vv

# Stop on first failure
pytest -x

# Show local variables on failure
pytest -l

# Run last failed tests
pytest --lf

# Run tests matching pattern
pytest -k "test_create"
pytest -k "API"
```

### By Test File

```bash
# Projects app
pytest apps/projects/tests_models.py
pytest apps/projects/tests_api.py
pytest apps/projects/tests_auth.py

# Containers app
pytest apps/containers/tests.py

# Financial app
pytest apps/financial/tests.py

# Calculations app
pytest apps/calculations/tests.py
pytest apps/calculations/tests_integration.py
```

### By Test Class

```bash
pytest apps/projects/tests_models.py::TestProjectModel
pytest apps/containers/tests.py::TestContainerAPI
pytest apps/financial/tests.py::TestBudgetAPI
pytest apps/calculations/tests_integration.py::TestOrmToPydanticConversion
```

### By Individual Test

```bash
pytest apps/projects/tests_models.py::TestProjectModel::test_create_project_minimal
pytest apps/containers/tests.py::TestContainerAPI::test_list_containers
```

### By Marker

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run only API tests
pytest -m api

# Skip slow tests
pytest -m "not slow"

# Combine markers
pytest -m "unit and not slow"
```

## Code Coverage

### Generate Coverage Report

```bash
# Run tests with coverage
pytest --cov=apps

# Generate HTML report
pytest --cov=apps --cov-report=html

# Open HTML report
open htmlcov/index.html

# Generate XML report (for CI/CD)
pytest --cov=apps --cov-report=xml

# Show missing lines
pytest --cov=apps --cov-report=term-missing
```

### Coverage Configuration

Coverage is configured in `.coveragerc`:
- **Source:** `apps/` directory
- **Omits:** migrations, test files, admin, apps.py
- **Reports:** HTML to `htmlcov/`, terminal output

### Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| Models | 90%+ | ✅ |
| Views | 85%+ | ✅ |
| Serializers | 85%+ | ✅ |
| Services | 90%+ | ✅ |
| Overall | 80%+ | ⚠️ |

## Test Fixtures

Common fixtures used across tests:

### API Testing
```python
@pytest.fixture
def api_client():
    """REST framework API client."""
    return APIClient()

@pytest.fixture
def auth_user():
    """Authenticated user instance."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123"
    )

@pytest.fixture
def auth_client(api_client, auth_user):
    """Authenticated API client."""
    api_client.force_authenticate(user=auth_user)
    return api_client
```

### Data Fixtures
```python
@pytest.fixture
def test_project():
    """Sample project for testing."""
    return Project.objects.create(
        project_name="Test Project"
    )

@pytest.fixture
def container(test_project):
    """Sample container for testing."""
    ctype = ContainerType.objects.create(
        type_code="PHASE",
        type_name="Phase"
    )
    return Container.objects.create(
        project=test_project,
        container_type=ctype,
        container_name="Phase 1",
        display_order=1
    )
```

## Writing Tests

### Test Structure

```python
"""
Module docstring describing test file purpose.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from apps.myapp.models import MyModel


@pytest.fixture
def my_fixture():
    """Fixture docstring."""
    return create_test_data()


@pytest.mark.django_db
class TestMyModel:
    """Test class docstring."""
    
    def test_something(self, my_fixture):
        """Test method docstring."""
        # Arrange
        data = prepare_data()
        
        # Act
        result = perform_action(data)
        
        # Assert
        assert result == expected_value
```

### Naming Conventions

**Test Files:**
- `tests.py` - Main test file
- `tests_models.py` - Model tests
- `tests_api.py` - API tests
- `tests_integration.py` - Integration tests

**Test Classes:**
- `TestModelName` - Unit tests for model
- `TestAPIEndpoints` - API endpoint tests
- `TestServiceName` - Service layer tests

**Test Methods:**
- `test_create_*` - Creation tests
- `test_update_*` - Update tests
- `test_delete_*` - Deletion tests
- `test_list_*` - List/query tests
- `test_*_endpoint` - Endpoint tests
- `test_*_validation` - Validation tests

### Example: Model Test

```python
@pytest.mark.django_db
class TestProject:
    def test_create_project(self):
        """Test creating a project with minimal fields."""
        project = Project.objects.create(
            project_name="Test Project"
        )
        assert project.project_id is not None
        assert project.project_name == "Test Project"
        assert project.is_active is True
```

### Example: API Test

```python
@pytest.mark.django_db
class TestProjectAPI:
    def test_list_projects(self, auth_client):
        """Test GET /api/projects/ - list projects."""
        Project.objects.create(project_name="Project 1")
        Project.objects.create(project_name="Project 2")
        
        response = auth_client.get('/api/projects/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
```

### Example: Integration Test

```python
@pytest.mark.django_db
class TestCalculationIntegration:
    def test_irr_calculation(self, project_with_financials):
        """Test IRR calculation with real engine."""
        result = CalculationService.calculate_irr(
            project_with_financials.project_id
        )
        
        assert result is not None
        assert 'irr' in result
        assert result['project_id'] == project_with_financials.project_id
```

## Performance Testing

### Timing Tests

```python
def test_calculation_performance(self, test_project):
    """Test that calculation completes within target time."""
    import time
    
    start = time.time()
    result = CalculationService.calculate_irr(test_project.project_id)
    elapsed = time.time() - start
    
    assert result is not None
    assert elapsed < 1.0  # Must complete in under 1 second
```

### Performance Targets

- **CRUD Operations:** <200ms
- **IRR Calculation:** <1 second
- **Full Metrics:** <2 seconds
- **Cash Flow Projection:** <500ms

## Debugging Tests

### Using Print Statements

```bash
# See print output
pytest -s

# More detailed output
pytest -vvs
```

### Using PDB Debugger

```python
def test_something():
    data = get_data()
    import pdb; pdb.set_trace()  # Debugger starts here
    result = process(data)
    assert result == expected
```

```bash
# Run with PDB
pytest --pdb

# Drop into PDB on failure
pytest --pdb --maxfail=1
```

### Using pytest Flags

```bash
# Show local variables on failure
pytest -l

# Show full diff on assertion failure
pytest -vv

# Capture warnings
pytest -W all

# Show which fixtures are used
pytest --fixtures
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Django Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_land_v2
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          cd backend
          pytest --cov=apps --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test_land_v2
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml
```

### GitLab CI Example

```yaml
test:
  image: python:3.12
  services:
    - postgres:15
  variables:
    POSTGRES_DB: test_land_v2
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: postgresql://postgres:postgres@postgres/test_land_v2
  script:
    - cd backend
    - pip install -r requirements.txt
    - pytest --cov=apps --cov-report=xml
  coverage: '/TOTAL.*\s+(\d+%)$/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: backend/coverage.xml
```

## Troubleshooting

### Database Errors

**Issue:** `relation "table_name" does not exist`

**Solution:** Models use `managed = False`. For full database tests, manually create schema:
```bash
# Option 1: Use existing database
DATABASE_URL=postgresql://user:pass@host/land_v2 pytest

# Option 2: Create test schema
psql test_land_v2 < schema.sql
```

### Import Errors

**Issue:** `ModuleNotFoundError: No module named 'financial_engine'`

**Solution:** Ensure financial engine is in path (conftest.py handles this):
```python
ENGINE_PATH = BASE_DIR.parent / 'services' / 'financial_engine_py'
sys.path.insert(0, str(ENGINE_PATH))
```

### Authentication Errors

**Issue:** `401 Unauthorized` on authenticated requests

**Solution:** Use `auth_client` fixture:
```python
def test_api_endpoint(self, auth_client):  # Use auth_client, not api_client
    response = auth_client.get('/api/projects/')
```

### Slow Tests

**Issue:** Tests running very slowly

**Solution:** Use `--reuse-db` flag:
```bash
pytest --reuse-db  # Reuse database between runs
```

Mark slow tests:
```python
@pytest.mark.slow
def test_expensive_operation():
    pass
```

Run without slow tests:
```bash
pytest -m "not slow"
```

## Best Practices

1. **Use Fixtures:** Share test data via fixtures, not copy-paste
2. **Test Isolation:** Each test should be independent
3. **Clear Assertions:** Use descriptive assertion messages
4. **Arrange-Act-Assert:** Structure tests in clear phases
5. **One Concept:** Test one thing per test method
6. **Descriptive Names:** Test names should explain what they test
7. **Mock External Deps:** Don't test third-party code
8. **Fast Tests:** Keep unit tests fast (<100ms)
9. **Coverage Goals:** Aim for 90%+ on critical code
10. **Document Fixtures:** Add docstrings to explain fixture purpose

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [pytest-django](https://pytest-django.readthedocs.io/)
- [Django REST framework testing](https://www.django-rest-framework.org/api-guide/testing/)
- [pytest fixtures](https://docs.pytest.org/en/stable/fixture.html)
- [Code coverage](https://coverage.readthedocs.io/)

## Support

For testing questions or issues:
1. Check this guide
2. Review existing test files for examples
3. Consult pytest documentation
4. Ask team for help

---

**Last Updated:** October 22, 2025  
**Phase:** 6 - Testing Enhancement  
**Status:** Complete
