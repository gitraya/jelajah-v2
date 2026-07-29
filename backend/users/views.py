from rest_framework import generics, permissions, status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserDetailSerializer, RegisterSerializer
from django.conf import settings
from django.db import transaction
from backend.services import send_templated_email
from rest_framework.response import Response
from django.contrib.auth.tokens import default_token_generator
from .serializers import SetPasswordSerializer, ResendSetPasswordEmailSerializer, GoogleAuthSerializer
from rest_framework.throttling import ScopedRateThrottle

import logging

import requests
from django.core.exceptions import ValidationError
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import get_adapter as get_socialaccount_adapter
from allauth.socialaccount.providers.base import ProviderException

User = get_user_model()

GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

logger = logging.getLogger(__name__)


def set_jwt_cookies(response, access_token, refresh_token):
    """Write the JWT pair onto the HTTP-only auth cookies of a response."""
    response.set_cookie(
        key=settings.SIMPLE_JWT['AUTH_COOKIE'],
        value=access_token,
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
        max_age=settings.SIMPLE_JWT['AUTH_COOKIE_MAX_AGE'],
        domain=settings.SIMPLE_JWT['AUTH_COOKIE_DOMAIN'],
    )
    response.set_cookie(
        key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
        value=refresh_token,
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
        max_age=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH_MAX_AGE'],
        domain=settings.SIMPLE_JWT['AUTH_COOKIE_DOMAIN'],
    )
    return response

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    
    def perform_create(self, serializer):
        user = serializer.save()
        
        # Send welcome email
        context = {
            'user': user,
            'login_url': settings.FRONTEND_URL + '/login'
        }
        send_templated_email(
            recipient_email=user.email,
            subject='Welcome to Jelajah! Start Your Adventure Today',
            template_name='welcome_email',
            context=context
        )
        return user

class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class UserProfileView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'id'
    permission_classes = [permissions.IsAuthenticated]

class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            set_jwt_cookies(response, response.data['access'], response.data['refresh'])
            response.data = {'message': 'Login successful'}
        return response

class CookieTokenRefreshView(TokenRefreshView):
    def finalize_response(self, request, response, *args, **kwargs):
        if response.status_code == status.HTTP_200_OK and response.data.get('access'):
            set_jwt_cookies(response, response.data['access'], response.data['refresh'])
            response.data = {'message': 'Token refreshed successfully'}
            
        return super().finalize_response(request, response, *args, **kwargs)
    
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])
        
        # If no token in cookie, try to get from body
        if refresh_token is None:
            return super().post(request, *args, **kwargs)
            
        # Set the token in the request data for the parent class to process
        data = request.data.copy() if hasattr(request.data, 'copy') else {}
        data['refresh'] = refresh_token
        request._full_data = data
        
        return super().post(request, *args, **kwargs)

class CookieTokenBlacklistView(TokenBlacklistView):
    def finalize_response(self, request, response, *args, **kwargs):
        if response.status_code == status.HTTP_200_OK:
            response.delete_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                domain=settings.SIMPLE_JWT['AUTH_COOKIE_DOMAIN'],
            )
            response.delete_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                domain=settings.SIMPLE_JWT['AUTH_COOKIE_DOMAIN'],
            )
            response.data = {'message': 'Successfully logged out'}

        return super().finalize_response(request, response, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])

        # If no token in cookie, try to get from body
        if refresh_token is None:
            return super().post(request, *args, **kwargs)
        # Set the token in the request data for the parent class to process
        data = request.data.copy() if hasattr(request.data, 'copy') else {}
        data['refresh'] = refresh_token
        request._full_data = data

        return super().post(request, *args, **kwargs)

class SetPasswordView(generics.GenericAPIView):
    serializer_class = SetPasswordSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        user_id = kwargs.get('user_id')
        token = kwargs.get('token')
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Invalid user ID'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_password = serializer.validated_data['new_password']
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Password has been set successfully'}, status=status.HTTP_200_OK)
    
class ResendSetPasswordEmailView(generics.GenericAPIView):
    serializer_class = ResendSetPasswordEmailSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "resend_set_password_email"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'message': 'If an account with that email exists, a set password email has been sent'}, status=status.HTTP_200_OK)
        
        token = default_token_generator.make_token(user)
        
        # Send set password email
        context = {
            'user': user,
            'set_password_url': settings.FRONTEND_URL + '/set-password/' + str(user.id) + '/' + token
        }
        send_templated_email(
            recipient_email=user.email,
            subject='Set Your Jelajah Account Password',
            template_name='set_password_email',
            context=context
        )
        
        return Response({'message': 'Set password email has been sent'}, status=status.HTTP_200_OK)

class GoogleAuthView(generics.GenericAPIView):
    """Sign in (or sign up) with Google.

    The frontend signs in through Google Identity Services and posts back either the
    authorization `code` from the popup flow or a `credential` (ID token). django-allauth
    verifies the identity against the configured Google app and owns the resulting
    `SocialAccount`; the session itself is still the project's own JWT pair in HTTP-only
    cookies, exactly like `/auth/token/`.
    """
    serializer_class = GoogleAuthSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # an expired auth cookie must not block signing in

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.SOCIALACCOUNT_PROVIDERS['google']['APPS'][0]['client_id']:
            return Response(
                {'error': 'Google sign-in is not configured on this server'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        provider = get_socialaccount_adapter().get_provider(request, 'google')
        credential = serializer.validated_data.get('credential')
        if not credential:
            credential = self._exchange_code(provider, serializer.validated_data['code'])

        if not credential:
            return Response(
                {'error': 'Could not complete the Google sign-in. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            sociallogin = provider.verify_token(request, {'id_token': credential})
        except (ProviderException, ImmediateHttpResponse, ValidationError) as exc:
            logger.warning('Google ID token rejected: %s', exc)
            return Response(
                {'error': 'Invalid or expired Google credential'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = (sociallogin.user.email or '').strip().lower()
        if not email or not self._is_email_verified(sociallogin, email):
            return Response(
                {'error': 'Your Google account must have a verified email address'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user, created = self._resolve_user(request, sociallogin, email)

        if not user.is_active:
            return Response(
                {'error': 'This account has been deactivated'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if created:
            # The account already exists at this point, so a failing mail provider
            # must not turn a successful sign-in into an error.
            try:
                send_templated_email(
                    recipient_email=user.email,
                    subject='Welcome to Jelajah! Start Your Adventure Today',
                    template_name='welcome_email',
                    context={'user': user, 'login_url': settings.FRONTEND_URL + '/login'},
                )
            except Exception:
                logger.exception('Could not send the welcome email to %s', user.email)

        refresh = RefreshToken.for_user(user)
        response = Response({'message': 'Login successful'}, status=status.HTTP_200_OK)
        return set_jwt_cookies(response, str(refresh.access_token), str(refresh))

    def _exchange_code(self, provider, code):
        """Trade a popup-flow authorization code for Google's ID token.

        `postmessage` is the redirect URI Google requires when the code was issued
        to a browser popup rather than to a redirect endpoint.
        """
        try:
            response = requests.post(
                GOOGLE_TOKEN_URL,
                data={
                    'code': code,
                    'client_id': provider.app.client_id,
                    'client_secret': provider.app.secret,
                    'redirect_uri': 'postmessage',
                    'grant_type': 'authorization_code',
                },
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.warning('Google token endpoint unreachable: %s', exc)
            return None

        if not response.ok:
            # Most often invalid_grant: the code is single-use and short-lived.
            logger.warning(
                'Google code exchange failed (%s): %s', response.status_code, response.text[:500]
            )
            return None

        id_token = response.json().get('id_token')
        if not id_token:
            logger.warning('Google code exchange returned no id_token; missing "openid" scope?')
        return id_token

    def _is_email_verified(self, sociallogin, email):
        if sociallogin.account.extra_data.get('email_verified'):
            return True
        return any(
            address.verified and address.email.lower() == email
            for address in sociallogin.email_addresses
        )

    def _resolve_user(self, request, sociallogin, email):
        """Return `(user, created)` for the verified Google identity.

        A known `SocialAccount` logs straight in; an email that already has a local
        account links the two (so invited members can sign in with Google), and
        anything else becomes a new passwordless user.
        """
        sociallogin.lookup()
        if sociallogin.is_existing:
            return sociallogin.user, False

        with transaction.atomic():
            existing_user = User.objects.filter(email__iexact=email).first()
            if existing_user:
                sociallogin.user = existing_user
                # connect=True skips allauth's own email plumbing; this project
                # sends its own notifications through backend.services.
                sociallogin.save(request, connect=True)
                return existing_user, False

            sociallogin.user.email = email
            sociallogin.user.set_unusable_password()
            sociallogin.save(request)
            return sociallogin.user, True
