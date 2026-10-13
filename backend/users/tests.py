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

# Upload tests must never reach the R2 bucket configured in a developer's .env.
LOCAL_STORAGES = {**settings.STORAGES, "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"}}


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


def image_upload(name="photo.png", size=(1200, 800), fmt="PNG", mode="RGB"):
    from io import BytesIO
    from PIL import Image
    from django.core.files.uploadedfile import SimpleUploadedFile

    buffer = BytesIO()
    Image.new(mode, size, "green").save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f"image/{fmt.lower()}")


class AvatarUploadTests(TestCase):
    """Avatar uploads through PATCH /api/auth/me/ are validated and normalized."""

    def setUp(self):
        import tempfile
        from django.core.cache import cache

        cache.clear()  # throttle history lives in the cache
        self.media_dir = tempfile.TemporaryDirectory()
        self.override = override_settings(MEDIA_ROOT=self.media_dir.name, STORAGES=LOCAL_STORAGES)
        self.override.enable()
        self.client = APIClient()
        self.user = User.objects.create_user(email="pic@example.com", password="Test12#$")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("user_detail")

    def tearDown(self):
        self.override.disable()
        self.media_dir.cleanup()

    def upload(self, file):
        return self.client.patch(self.url, {"avatar": file}, format="multipart")

    def test_upload_is_resized_and_converted_to_webp(self):
        from PIL import Image

        response = self.upload(image_upload(size=(2000, 1000)))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.avatar.name.startswith("avatars/"))
        self.assertTrue(self.user.avatar.name.endswith(".webp"))
        with Image.open(self.user.avatar.path) as stored:
            self.assertEqual(stored.format, "WEBP")
            self.assertEqual(stored.size, (512, 256))

    def test_rejects_non_image(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        fake = SimpleUploadedFile("evil.png", b"not an image", content_type="image/png")
        response = self.upload(fake)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("avatar", response.data)

    def test_rejects_unsupported_format(self):
        response = self.upload(image_upload(name="anim.gif", fmt="GIF", mode="P"))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("avatar", response.data)

    @override_settings(IMAGE_UPLOAD_MAX_BYTES=100)
    def test_rejects_oversized_file(self):
        response = self.upload(image_upload())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("MB or smaller", str(response.data["avatar"]))

    def test_replacing_avatar_deletes_previous_file(self):
        import os

        with self.captureOnCommitCallbacks(execute=True):
            self.upload(image_upload())
        self.user.refresh_from_db()
        first_path = self.user.avatar.path

        with self.captureOnCommitCallbacks(execute=True):
            response = self.upload(image_upload())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.avatar.path, first_path)
        self.assertFalse(os.path.exists(first_path))
        self.assertTrue(os.path.exists(self.user.avatar.path))

    def test_clearing_avatar_deletes_file(self):
        import os

        with self.captureOnCommitCallbacks(execute=True):
            self.upload(image_upload())
        self.user.refresh_from_db()
        path = self.user.avatar.path

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(self.url, {"avatar": None}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.avatar)
        self.assertFalse(os.path.exists(path))

    def test_non_upload_updates_keep_avatar(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.upload(image_upload())
        self.user.refresh_from_db()
        name = self.user.avatar.name

        response = self.client.patch(self.url, {"bio": "Hi"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar.name, name)

    def test_uploads_are_throttled_but_reads_are_not(self):
        from rest_framework.throttling import ScopedRateThrottle

        # DRF reads throttle rates once at import, so override_settings can't lower them.
        rates = {**ScopedRateThrottle.THROTTLE_RATES, "uploads": "1/hour"}
        with patch.object(ScopedRateThrottle, "THROTTLE_RATES", rates):
            self._assert_upload_throttled()

    def _assert_upload_throttled(self):
        self.assertEqual(self.upload(image_upload()).status_code, status.HTTP_200_OK)
        self.assertEqual(self.upload(image_upload()).status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)


class ProfileFieldsTests(TestCase):
    """location / interests / last_seen / is_online on /me/ and /profile/<id>/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="profile@example.com", password="Test12#$", first_name="Pro")
        self.client.force_authenticate(user=self.user)

    def test_me_exposes_profile_fields(self):
        response = self.client.get(reverse("user_detail"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in ("location", "interests", "last_seen", "is_online"):
            self.assertIn(field, response.data)
        self.assertEqual(response.data["interests"], [])
        self.assertFalse(response.data["is_online"])

    def test_update_location_and_interests_cleans_values(self):
        response = self.client.patch(reverse("user_detail"), {
            "location": "Jakarta, ID",
            "interests": ["  Hiking ", "hiking", "Food", "FOOD", "Diving"],
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["interests"], ["Hiking", "Food", "Diving"])
        self.user.refresh_from_db()
        self.assertEqual(self.user.location, "Jakarta, ID")
        self.assertEqual(self.user.interests, ["Hiking", "Food", "Diving"])

    def test_interests_validation(self):
        invalid = [
            ["a", "b", "c", "d", "e", "f", "g"],  # more than 6
            ["x" * 31],                            # too long
            ["   "],                               # blank after trimming
            [1, 2],                                # not strings
            "hiking",                              # not a list
        ]
        for value in invalid:
            response = self.client.patch(reverse("user_detail"), {"interests": value}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, value)
            self.assertIn("interests", response.data)
        # Six distinct after case-insensitive dedupe is fine.
        response = self.client.patch(reverse("user_detail"), {
            "interests": ["a", "b", "c", "d", "e", "f", "A"],
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["interests"]), 6)

    def test_last_seen_and_is_online_are_read_only(self):
        response = self.client.patch(reverse("user_detail"), {
            "last_seen": "2020-01-01T00:00:00Z", "is_online": True,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.last_seen)

    def test_profile_view_exposes_fields(self):
        from django.utils import timezone
        other = User.objects.create_user(
            email="other@example.com", password="Test12#$", location="Bali", interests=["Surf"],
            last_seen=timezone.now(),
        )
        response = self.client.get(reverse("user_profile", kwargs={"user_id": other.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["location"], "Bali")
        self.assertEqual(response.data["interests"], ["Surf"])
        self.assertTrue(response.data["is_online"])
        self.assertIsNotNone(response.data["last_seen"])


class IsOnlineTests(TestCase):
    def test_is_online_window(self):
        from datetime import timedelta
        from django.utils import timezone
        user = User.objects.create_user(email="online@example.com", password="x")
        self.assertFalse(user.is_online)
        user.last_seen = timezone.now() - timedelta(minutes=1)
        self.assertTrue(user.is_online)
        user.last_seen = timezone.now() - timedelta(minutes=4, seconds=50)
        self.assertTrue(user.is_online)
        user.last_seen = timezone.now() - timedelta(minutes=6)
        self.assertFalse(user.is_online)


class LastSeenTests(TestCase):
    """last_seen is recorded by the JWT auth class, at most once per minute."""

    def setUp(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        self.client = APIClient()
        self.user = User.objects.create_user(email="seen@example.com", password="Test12#$")
        self.refresh = RefreshToken.for_user(self.user)
        self.client.cookies[settings.SIMPLE_JWT["AUTH_COOKIE"]] = str(self.refresh.access_token)

    def _last_seen_updates(self, url=None):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(url or reverse("user_detail"))
        updates = [q for q in ctx.captured_queries if q["sql"].startswith("UPDATE") and "last_seen" in q["sql"]]
        return response, len(updates)

    def test_cookie_authenticated_request_records_last_seen(self):
        response, updates = self._last_seen_updates()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(updates, 1)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_seen)
        self.assertTrue(response.data["is_online"])
        self.assertIsNotNone(response.data["last_seen"])

    def test_bearer_header_also_records_last_seen(self):
        self.client.cookies.clear()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.refresh.access_token}")
        response, updates = self._last_seen_updates()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(updates, 1)

    def test_writes_are_throttled_to_once_per_minute(self):
        from datetime import timedelta
        from django.utils import timezone
        _, first = self._last_seen_updates()
        _, second = self._last_seen_updates()
        self.assertEqual((first, second), (1, 0))

        recent = timezone.now() - timedelta(seconds=30)
        User.objects.filter(pk=self.user.pk).update(last_seen=recent)
        _, updates = self._last_seen_updates()
        self.assertEqual(updates, 0)
        self.user.refresh_from_db()
        self.assertEqual(self.user.last_seen, recent)

        stale = timezone.now() - timedelta(seconds=61)
        User.objects.filter(pk=self.user.pk).update(last_seen=stale)
        _, updates = self._last_seen_updates()
        self.assertEqual(updates, 1)
        self.user.refresh_from_db()
        self.assertGreater(self.user.last_seen, stale)

    def test_unauthenticated_requests_are_unaffected(self):
        self.client.cookies.clear()
        response = self.client.get(reverse("trip-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.get(reverse("user_detail"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.last_seen)

    def test_token_refresh_still_works(self):
        self.client.cookies.clear()
        self.client.cookies[settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"]] = str(self.refresh)
        response = self.client.post(reverse("token_refresh"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(settings.SIMPLE_JWT["AUTH_COOKIE"], response.cookies)


class BuddiesTests(TestCase):
    """GET /api/auth/buddies/"""

    def setUp(self):
        from datetime import date, timedelta
        from django.utils import timezone
        from trips.models import Trip, TripMember, TripStatus, MemberStatus, MemberRole
        self.Trip, self.TripMember = Trip, TripMember
        self.MemberStatus, self.TripStatus = MemberStatus, TripStatus
        self.dates = {"start_date": date.today() + timedelta(days=3), "end_date": date.today() + timedelta(days=5)}

        self.client = APIClient()
        self.me = User.objects.create_user(email="me@example.com", password="x", first_name="Me")
        self.ana = User.objects.create_user(email="ana@example.com", password="x", first_name="Ana")
        self.zed = User.objects.create_user(
            email="zed@example.com", password="x", first_name="Zed", last_seen=timezone.now(),
        )
        self.pending = User.objects.create_user(email="pending@example.com", password="x", first_name="Pen")
        self.ghost = User.objects.create_user(email="ghost@example.com", password="x", first_name="Ghost")
        self.stranger = User.objects.create_user(email="stranger@example.com", password="x")

        # My trip: Ana accepted, Pending only pending.
        self.trip1 = self.make_trip(self.me, "Bali", members=[self.ana], pending=[self.pending])
        # Zed's trip (Zed has no TripMember row: owner counts as member); me and Ana accepted.
        self.trip2 = self.make_trip(self.zed, "Lombok", members=[self.me, self.ana], owner_member=False)
        # Deleted trip shared with Ghost does not make us buddies.
        self.make_trip(self.me, "Gone", members=[self.ghost], status=TripStatus.DELETED)
        # Ana's own cancelled trip and a trip with a stranger.
        self.make_trip(self.ana, "Cancelled", status=TripStatus.CANCELLED)
        self.make_trip(self.ana, "Flores", members=[self.stranger])

    def make_trip(self, owner, title, members=(), pending=(), status=None, owner_member=True):
        from trips.models import MemberRole
        trip = self.Trip.objects.create(
            owner=owner, title=title, destination=title, status=status or self.TripStatus.PLANNING, **self.dates,
        )
        if owner_member:
            self.TripMember.objects.create(trip=trip, user=owner, role=MemberRole.ORGANIZER, status=self.MemberStatus.ACCEPTED)
        for user in members:
            self.TripMember.objects.create(trip=trip, user=user, status=self.MemberStatus.ACCEPTED)
        for user in pending:
            self.TripMember.objects.create(trip=trip, user=user, status=self.MemberStatus.PENDING)
        return trip

    def get(self):
        self.client.force_authenticate(user=self.me)
        response = self.client.get(reverse("buddies"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def test_requires_authentication(self):
        self.assertEqual(self.client.get(reverse("buddies")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_lists_buddies_with_counts_sorted_online_first(self):
        data = self.get().data
        # Zed is online so comes first despite the name.
        self.assertEqual([b["email"] for b in data], ["zed@example.com", "ana@example.com"])
        zed, ana = data
        self.assertTrue(zed["is_online"])
        self.assertFalse(ana["is_online"])
        for field in ("id", "first_name", "last_name", "avatar", "bio", "location", "interests", "last_seen"):
            self.assertIn(field, ana)

        # Ana: trip1, trip2, Flores (Cancelled excluded).
        self.assertEqual(ana["trips_count"], 3)
        self.assertEqual(zed["trips_count"], 1)
        # Ana and Zed are buddies of each other (trip2) and both mine.
        self.assertEqual(ana["mutual_count"], 1)
        self.assertEqual(zed["mutual_count"], 1)

        self.assertEqual({t["title"] for t in ana["shared_trips"]}, {"Bali", "Lombok"})
        self.assertEqual([t["title"] for t in zed["shared_trips"]], ["Lombok"])
        self.assertEqual(set(zed["shared_trips"][0]), {"id", "title", "destination", "start_date"})

    def test_no_buddies(self):
        self.client.force_authenticate(user=self.ghost)
        response = self.client.get(reverse("buddies"))
        self.assertEqual(response.data, [])

    def test_query_count_is_bounded(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as ctx:
            self.get()
        baseline = len(ctx.captured_queries)
        for i in range(5):
            extra = User.objects.create_user(email=f"extra{i}@example.com", password="x")
            self.make_trip(extra, f"Extra {i}", members=[self.me])
        with CaptureQueriesContext(connection) as ctx:
            data = self.get().data
        self.assertEqual(len(data), 7)
        self.assertEqual(len(ctx.captured_queries), baseline)
