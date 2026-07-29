from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse
from allauth.socialaccount.models import SocialAccount
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class UserRegistrationTests(TestCase):
    """Tests for user registration, login, and detail endpoints using email-based User model."""

    def setUp(self):
        self.client = APIClient()
        # create an existing user for login/detail tests
        self.user = User.objects.create_user(
            email="login@example.com",
            password="Test12#$",
            first_name="Test",
            last_name="User"
        )

    def test_register_user_success(self):
        """Registering a new user with email should succeed."""
        data = {
            "email": "test@example.com",
            "password": "Test12#$",
            "password2": "Test12#$",
            "first_name": "Test",
            "last_name": "User"
        }
        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="test@example.com").exists())

    def test_register_user_missing_fields(self):
        """Missing required fields should return 400 with field errors."""
        data = {
            "email": "test2@example.com",
            "password": "Test12#$",
            "password2": "Test12#$",
            # missing first_name (required by RegisterSerializer)
        }
        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", response.data)

    def test_register_user_password_mismatch(self):
        """Mismatched passwords should return validation error."""
        data = {
            "email": "test3@example.com",
            "password": "Test12#$",
            "password2": "mismatch",
            "first_name": "Test",
            "last_name": "User"
        }
        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", str(response.data))

    def test_login_user_success(self):
        """Login (token obtain) using email should succeed for valid credentials."""
        data = {
            "email": "login@example.com",
            "password": "Test12#$"
        }
        response = self.client.post(reverse("token_obtain_pair"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue("Login successful" in response.data or "message" in response.data)

    def test_login_user_invalid_credentials(self):
        """Invalid login credentials should be rejected."""
        data = {
            "email": "login@example.com",
            "password": "wrongpassword"
        }
        response = self.client.post(reverse("token_obtain_pair"), data, format="json")
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST))

    def test_get_user_detail_authenticated(self):
        """Authenticated user can get their own details via user_detail endpoint."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("user_detail"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("email"), self.user.email)


GOOGLE_TEST_APP = {
    "google": {
        "APPS": [
            {"client_id": "test-client-id.apps.googleusercontent.com", "secret": "test-secret", "key": ""},
        ],
        "SCOPE": ["profile", "email"],
    }
}


def google_identity(sub="google-uid-1", email="gopher@example.com", email_verified=True):
    """The decoded ID token payload allauth builds a SocialLogin from."""
    return {
        "iss": "https://accounts.google.com",
        "sub": sub,
        "aud": "test-client-id.apps.googleusercontent.com",
        "email": email,
        "email_verified": email_verified,
        "given_name": "Go",
        "family_name": "Pher",
        "name": "Go Pher",
        "picture": "https://example.com/avatar.png",
    }


@override_settings(SOCIALACCOUNT_PROVIDERS=GOOGLE_TEST_APP)
class GoogleAuthTests(TestCase):
    """Tests for signing in with Google (allauth verifies the ID token, we issue JWT cookies)."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("google_auth")

    def post_credential(self, identity=None):
        """POST a credential whose verification is stubbed to return `identity`."""
        with patch(
            "allauth.socialaccount.providers.google.views._verify_and_decode",
            return_value=identity if identity is not None else google_identity(),
        ):
            return self.client.post(self.url, {"credential": "fake-id-token"}, format="json")

    def test_google_login_creates_user_and_sets_cookies(self):
        """A new Google identity creates a passwordless user and returns the auth cookies."""
        response = self.post_credential()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(settings.SIMPLE_JWT["AUTH_COOKIE"], response.cookies)
        self.assertIn(settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"], response.cookies)

        user = User.objects.get(email="gopher@example.com")
        self.assertEqual(user.first_name, "Go")
        self.assertFalse(user.has_usable_password())
        self.assertTrue(SocialAccount.objects.filter(user=user, provider="google", uid="google-uid-1").exists())

    def test_google_login_survives_failing_welcome_email(self):
        """A broken mail provider must not fail a sign-in that already succeeded."""
        with patch("users.views.send_templated_email", side_effect=Exception("SendGrid 401")):
            response = self.post_credential()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(email="gopher@example.com").exists())

    def test_google_login_is_idempotent(self):
        """Signing in twice reuses the user linked to the Google account."""
        self.post_credential()
        response = self.post_credential()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.filter(email="gopher@example.com").count(), 1)
        self.assertEqual(SocialAccount.objects.count(), 1)

    def test_google_login_links_existing_local_account(self):
        """An email that already has an account is linked instead of duplicated."""
        existing = User.objects.create_user(email="login@example.com", password="Test12#$", first_name="Test")

        response = self.post_credential(google_identity(email="login@example.com"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.filter(email="login@example.com").count(), 1)
        self.assertTrue(SocialAccount.objects.filter(user=existing, provider="google").exists())
        existing.refresh_from_db()
        self.assertTrue(existing.has_usable_password())  # password login still works

    def test_google_login_requires_verified_email(self):
        """Google accounts with an unverified email are rejected."""
        response = self.post_credential(google_identity(email_verified=False))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="gopher@example.com").exists())

    def test_google_login_rejects_invalid_credential(self):
        """A credential Google will not vouch for returns 400."""
        with patch(
            "allauth.socialaccount.providers.google.views._verify_and_decode",
            side_effect=OAuth2Error("invalid token"),
        ):
            response = self.client.post(self.url, {"credential": "bad-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

    def test_google_login_requires_code_or_credential(self):
        """Exactly one of code/credential must be supplied."""
        for payload in ({}, {"code": "abc", "credential": "def"}):
            response = self.client.post(self.url, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_google_login_with_authorization_code(self):
        """The popup code flow exchanges the code for an ID token, then signs in."""
        token_response = MagicMock(ok=True)
        token_response.json.return_value = {"id_token": "exchanged-id-token"}

        with patch("users.views.requests.post", return_value=token_response) as token_post, patch(
            "allauth.socialaccount.providers.google.views._verify_and_decode",
            return_value=google_identity(),
        ) as verify:
            response = self.client.post(self.url, {"code": "auth-code"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(token_post.call_args.kwargs["data"]["redirect_uri"], "postmessage")
        self.assertEqual(verify.call_args.kwargs["credential"], "exchanged-id-token")
        self.assertTrue(User.objects.filter(email="gopher@example.com").exists())

    def test_google_login_rejects_bad_authorization_code(self):
        """A code Google refuses to exchange returns 400."""
        with patch("users.views.requests.post", return_value=MagicMock(ok=False)):
            response = self.client.post(self.url, {"code": "bad-code"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

    @override_settings(SOCIALACCOUNT_PROVIDERS={"google": {"APPS": [{"client_id": "", "secret": "", "key": ""}]}})
    def test_google_login_unconfigured(self):
        """Without Google credentials configured the endpoint reports it is unavailable."""
        response = self.client.post(self.url, {"credential": "fake-id-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
