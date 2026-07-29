from django.urls import path
from .views import RegisterView, UserDetailView, UserProfileView, CookieTokenObtainPairView, CookieTokenRefreshView, CookieTokenBlacklistView, SetPasswordView, ResendSetPasswordEmailView, GoogleAuthView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('google/', GoogleAuthView.as_view(), name='google_auth'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('token/blacklist/', CookieTokenBlacklistView.as_view(), name='token_blacklist'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('profile/<uuid:user_id>/', UserProfileView.as_view(), name='user_profile'),
    path('set-password/<uuid:user_id>/<str:token>/', SetPasswordView.as_view(), name='set_password'),
    path('resend-set-password-email/', ResendSetPasswordEmailView.as_view(), name='resend_set_password_email'),
]
