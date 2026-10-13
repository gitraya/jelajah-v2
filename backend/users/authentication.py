from rest_framework_simplejwt.authentication import JWTAuthentication


class LastSeenJWTAuthentication(JWTAuthentication):
    """The project's JWT authentication, also recording the user's `last_seen`.

    JWT auth runs inside DRF (not Django middleware), so this is the first place
    the user of a cookie/Bearer-authenticated API request is known. The write is
    throttled by `User.touch_last_seen` to at most one UPDATE per minute per user.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            result[0].touch_last_seen()
        return result
