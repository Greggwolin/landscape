"""Acquisition assumptions: loading must persist nothing, and invent nothing.

The defect these cover: GET on a project with no acquisition record returned a
full set of deal terms — a 7-year hold, a 5.5% exit cap, 1.5% closing costs, a
2.5% broker commission, 30 due-diligence days and a 20/80 land/improvement split
that drives depreciation. Any client that echoed its loaded state back on save
then wrote all of them as though a person had entered them.

Product rule (2026-09-04): the app must never supply a financial assumption the
user did not choose.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.acquisition.models import PropertyAcquisition
from apps.projects.models import Project

User = get_user_model()

# Everything the old defaults block named. None of these may come back from a
# project that has no acquisition record.
INVENTED_DEAL_TERMS = (
    'hold_period_years',
    'exit_cap_rate',
    'closing_costs_pct',
    'due_diligence_days',
    'sale_costs_pct',
    'broker_commission_pct',
    'land_pct',
    'improvement_pct',
)


class AcquisitionAssumptionsLoadTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='acq_owner', email='acq_owner@example.com',
            password='TestPass123!',
        )
        self.project = Project.objects.create(
            project_name='No Assumptions Yet', created_by=self.user,
        )
        self.client.force_authenticate(user=self.user)
        self.url = (
            f'/api/projects/{self.project.project_id}/assumptions/acquisition/'
        )

    # ------------------------------------------------------------------
    # The server invents nothing
    # ------------------------------------------------------------------

    def test_no_record_returns_no_deal_terms(self):
        """A project with no record gets an empty field set, not a deal."""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        body = response.data

        for field in INVENTED_DEAL_TERMS:
            self.assertIn(field, body, f'{field} should still be present as a key')
            self.assertIsNone(
                body[field],
                f'{field} came back as {body[field]!r} — the app named a '
                f'financial assumption the user did not choose',
            )

        # The client can still tell "no record" from "record full of nulls".
        self.assertIs(body['exists'], False)
        self.assertEqual(body['project_id'], self.project.project_id)

    def test_no_record_response_carries_no_numbers_at_all(self):
        """Belt and braces: nothing numeric may ride along in the empty body."""
        body = self.client.get(self.url).data
        numeric = {
            k: v for k, v in body.items()
            if k != 'project_id' and isinstance(v, (int, float, Decimal))
            and not isinstance(v, bool)
        }
        self.assertEqual(
            numeric, {},
            f'empty acquisition response still names figures: {numeric}',
        )

    # ------------------------------------------------------------------
    # Loading persists nothing
    # ------------------------------------------------------------------

    def test_loading_the_page_persists_nothing(self):
        """
        Load the assumptions (what opening the page does), then hand the loaded
        state straight back to the save endpoint (what the page's ~1s auto-save
        did). No acquisition record may exist afterwards.
        """
        loaded = self.client.get(self.url).data
        self.assertEqual(
            PropertyAcquisition.objects.filter(
                project_id=self.project.project_id).count(),
            0,
        )

        self.client.post(self.url, loaded, format='json')

        self.assertEqual(
            PropertyAcquisition.objects.filter(
                project_id=self.project.project_id).count(),
            0,
            'merely loading and echoing back the assumptions created a record',
        )

    def test_a_users_first_real_save_carries_only_their_own_values(self):
        """
        The sharp end of the defect.

        A pure echo of the loaded payload was rejected anyway — purchase_price
        and acquisition_date are required, so the auto-save 400'd until the user
        entered something. The damage landed on the user's FIRST genuine save:
        the page posted its whole state, so the deal terms the server had
        invented rode along with the two figures the user actually typed and
        became permanent, indistinguishable from their own input.

        Here a person fills in the four napkin-tier fields and saves the merged
        state. Everything they did not touch must be NULL. Before the fix this
        stored 1.5% closing costs, 30 due-diligence days, 1.5% sale costs, a
        2.5% broker commission and a 20/80 land/improvement split.
        """
        loaded = dict(self.client.get(self.url).data)

        # What a person typed into the form.
        loaded.update({
            'purchase_price': '2500000.00',
            'acquisition_date': '2026-03-01',
            'hold_period_years': '10.00',
            'exit_cap_rate': '0.0600',
        })

        response = self.client.post(self.url, loaded, format='json')
        self.assertIn(response.status_code, (200, 201), response.data)

        record = PropertyAcquisition.objects.get(
            project_id=self.project.project_id)

        self.assertEqual(record.hold_period_years, Decimal('10.00'))
        self.assertEqual(record.exit_cap_rate, Decimal('0.0600'))

        untouched = {
            'closing_costs_pct': record.closing_costs_pct,
            'due_diligence_days': record.due_diligence_days,
            'sale_costs_pct': record.sale_costs_pct,
            'broker_commission_pct': record.broker_commission_pct,
            'land_pct': record.land_pct,
            'improvement_pct': record.improvement_pct,
        }
        stored = {k: v for k, v in untouched.items() if v is not None}
        self.assertEqual(
            stored, {},
            f'fields the user never entered were persisted anyway: {stored}',
        )

    def test_saving_a_real_edit_still_works(self):
        """The guard must not block a person's own values."""
        response = self.client.post(
            self.url,
            {
                'purchase_price': '1000000.00',
                'acquisition_date': '2026-01-15',
                'hold_period_years': '5.00',
                'exit_cap_rate': '0.0625',
            },
            format='json',
        )

        self.assertIn(response.status_code, (200, 201), response.data)
        record = PropertyAcquisition.objects.get(
            project_id=self.project.project_id)
        self.assertEqual(record.hold_period_years, Decimal('5.00'))
        self.assertEqual(record.exit_cap_rate, Decimal('0.0625'))

        # And the fields the user left alone stay unset — the model must not
        # fill them in on its own.
        self.assertIsNone(record.closing_costs_pct)
        self.assertIsNone(record.broker_commission_pct)
        self.assertIsNone(record.sale_costs_pct)
        self.assertIsNone(record.due_diligence_days)
        self.assertIsNone(record.land_pct)
        self.assertIsNone(record.improvement_pct)


class PropertyAcquisitionModelDefaultTests(APITestCase):
    """The model layer must not supply deal terms either."""

    def test_model_fields_declare_no_defaults(self):
        for field in INVENTED_DEAL_TERMS:
            model_field = PropertyAcquisition._meta.get_field(field)
            self.assertFalse(
                model_field.has_default(),
                f'{field} still carries a model default '
                f'({model_field.get_default()!r}) — a value written by the '
                f'model is as invented as one written by the view',
            )
