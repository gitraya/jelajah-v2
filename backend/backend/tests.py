from django.core.mail import EmailMessage, get_connection
from django.core.mail.backends.base import BaseEmailBackend
from django.test import SimpleTestCase, override_settings

FAILOVER_BACKEND = 'backend.email_backends.FailoverEmailBackend'


class RecordingBackend(BaseEmailBackend):
    """A backend that reports success and remembers what it was asked to send."""
    sent = []

    def send_messages(self, email_messages):
        type(self).sent.extend(email_messages)
        return len(email_messages)


class PrimaryBackend(RecordingBackend):
    sent = []


class FallbackBackend(RecordingBackend):
    sent = []


class RaisingBackend(BaseEmailBackend):
    """Stands in for a provider rejecting our credentials (e.g. SendGrid 401)."""

    def send_messages(self, email_messages):
        raise Exception('provider says 401')


class SilentlyDroppingBackend(BaseEmailBackend):
    """Stands in for a provider that accepts the call but delivers nothing."""

    def send_messages(self, email_messages):
        return 0


PRIMARY = 'backend.tests.PrimaryBackend'
FALLBACK = 'backend.tests.FallbackBackend'
RAISING = 'backend.tests.RaisingBackend'
DROPPING = 'backend.tests.SilentlyDroppingBackend'


@override_settings(EMAIL_BACKEND=FAILOVER_BACKEND)
class FailoverEmailBackendTests(SimpleTestCase):
    """The chain that keeps email working when the primary provider is down."""

    def setUp(self):
        PrimaryBackend.sent = []
        FallbackBackend.sent = []

    def send(self, fail_silently=False):
        message = EmailMessage('Subject', 'Body', 'from@example.com', ['to@example.com'])
        connection = get_connection(backend=FAILOVER_BACKEND, fail_silently=fail_silently)
        return connection.send_messages([message])

    @override_settings(EMAIL_BACKEND_CHAIN=[PRIMARY, FALLBACK])
    def test_primary_handles_the_mail_alone(self):
        """A working primary means the fallback is never touched."""
        self.assertEqual(self.send(), 1)
        self.assertEqual(len(PrimaryBackend.sent), 1)
        self.assertEqual(FallbackBackend.sent, [])

    @override_settings(EMAIL_BACKEND_CHAIN=[RAISING, FALLBACK])
    def test_failing_primary_falls_back(self):
        """A primary that raises hands the message to the next provider."""
        self.assertEqual(self.send(), 1)
        self.assertEqual(len(FallbackBackend.sent), 1)

    @override_settings(EMAIL_BACKEND_CHAIN=[DROPPING, FALLBACK])
    def test_silently_dropping_primary_falls_back(self):
        """Delivering nothing counts as a failure, not a success."""
        self.assertEqual(self.send(), 1)
        self.assertEqual(len(FallbackBackend.sent), 1)

    @override_settings(EMAIL_BACKEND_CHAIN=[RAISING, RAISING])
    def test_all_backends_failing_raises(self):
        """With no provider left, Django's fail_silently contract still applies."""
        with self.assertRaises(Exception):
            self.send()
        self.assertEqual(self.send(fail_silently=True), 0)

    @override_settings(EMAIL_BACKEND_CHAIN=[])
    def test_no_provider_configured_is_a_no_op(self):
        """An unconfigured environment drops mail instead of erroring."""
        self.assertEqual(self.send(), 0)
