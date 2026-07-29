import logging

from django.conf import settings
from django.core.mail import get_connection
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)


class FailoverEmailBackend(BaseEmailBackend):
    """Send through the first backend in `EMAIL_BACKEND_CHAIN` that accepts the mail.

    The chain is built in settings from whichever providers actually have
    credentials: Amazon SES first, SendGrid as the fallback. A provider that
    errors out or silently delivers nothing hands the message to the next one, so
    an expired key at one provider does not take down email for the whole app.
    """

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        chain = getattr(settings, 'EMAIL_BACKEND_CHAIN', [])
        if not chain:
            logger.warning('No email provider is configured; dropping %d message(s)', len(email_messages))
            return 0

        last_exception = None
        for backend_path in chain:
            try:
                connection = get_connection(backend=backend_path, fail_silently=False)
                sent = connection.send_messages(email_messages) or 0
            except Exception as exc:
                last_exception = exc
                logger.warning('Email backend %s failed: %s', backend_path, exc)
                continue

            if sent:
                return sent
            logger.warning('Email backend %s delivered nothing; trying the next one', backend_path)

        logger.error('Every email backend failed for %d message(s)', len(email_messages))
        if last_exception is not None and not self.fail_silently:
            raise last_exception
        return 0
