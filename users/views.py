from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login
from .models import User
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserProfileSerializer,
    EmailVerificationSerializer
)
from .tasks import send_verification_email

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # Send verification email asynchronously
        send_verification_email.delay(
            user.email,
            user.verification_code,
            f"{user.first_name} {user.last_name}"
        )
        return Response({
            "message": "User registered successfully. Please check your email for the verification code.",
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_email(request):
    serializer = EmailVerificationSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        verification_code = serializer.validated_data['verification_code']

        try:
            user = User.objects.get(email=email)
            if user.is_verification_code_expired():
                return Response(
                    {'error': 'Verification code has expired. Please request a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if user.verification_code == verification_code:
                user.is_verified = True
                user.verification_code = None
                user.verification_code_expires = None
                user.save()
                return Response({
                    'message': 'Email verified successfully.'
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Invalid verification code.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except User.DoesNotExist:
            return Response(
                {'error': 'User with this email does not exist.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def user_login(request):
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login successful',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET', 'PUT'])
def user_profile(request):
    if request.method == 'GET':
        serializers = UserProfileSerializer(request.user)
        return Response(serializers.data)
    
    elif request.method == 'PUT':
        serializers = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializers.is_valid():
            serializers.save()
            return Response(serializers.data)
        return Response(serializers.errors, status=status.HTTP_400_BAD_REQUEST)
    


@api_view(['POST'])
def resend_verification(request):
    user = request.user
    if user.is_verified:
        return Response(
            {'error': 'Your email is already verified.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    verification_code = user.generate_verification_code()
    send_verification_email.delay(
        user.email,
        verification_code,
        f"{user.first_name} {user.last_name}"
    )

    return Response({
        'message': 'Verification code sent successfully.    '
    }, status=status.HTTP_200_OK)