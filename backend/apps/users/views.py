from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import UserSettings


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def user_tier_settings(request):
    """
    Get or update user tier level

    GET: Returns the current tier level for the user
    PUT: Updates the tier level (analyst or pro)
    """
    # For now, using a default user_id = 1 (simplified auth)
    # In production, this would use request.user.id from authentication
    user_id = 1

    if request.method == 'GET':
        # Get or create user settings with default tier
        settings, created = UserSettings.objects.get_or_create(
            user_id=user_id,
            defaults={'tier_level': 'analyst'}
        )

        return Response({
            'tier_level': settings.tier_level,
            'created': created
        })

    elif request.method == 'PUT':
        tier_level = request.data.get('tier_level')

        # Validate tier level
        if tier_level not in ['analyst', 'pro']:
            return Response(
                {'error': 'Invalid tier level. Must be "analyst" or "pro".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user settings
        settings, created = UserSettings.objects.get_or_create(
            user_id=user_id,
            defaults={'tier_level': tier_level}
        )

        # Update if it already existed
        if not created:
            settings.tier_level = tier_level
            settings.save()

        return Response({
            'tier_level': settings.tier_level,
            'message': f'Tier updated to {tier_level}',
            'created': created
        })
