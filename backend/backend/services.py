from django.template.loader import render_to_string
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

def send_templated_email(recipient_email, subject, template_name, context):
    """
    Send a templated email.

    Args:
        recipient_email: Email address of recipient
        subject: Email subject
        template_name: Name of the template to use (without .html extension)
        context: Dictionary of variables to pass to the template
    """
    if not settings.EMAIL_BACKEND_CHAIN:
        return  # No email provider configured — sending is disabled
    
    from_email = settings.DEFAULT_FROM_EMAIL
    to = [recipient_email]
    text_content = render_to_string(f'{template_name}.txt', context)
    html_content = render_to_string(f'{template_name}.html', context)

    msg = EmailMultiAlternatives(subject, text_content, from_email, to, reply_to=[from_email])
    msg.attach_alternative(html_content, "text/html")
    msg.send()
