from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

@shared_task
def send_verification_email(user_email, verification_code, user_name):
    subject = 'Verify Your YabaTech BookStore Account'
    
    # For now, we'll use a simple text email
    # In production, you would use HTML templates
    message = f"""
    Hello {user_name},
    
    Thank you for registering with YabaTech BookStore!
    
    Your verification code is: {verification_code}
    
    This code will expire in 24 hours.
    
    Best regards,
    YabaTech BookStore Team
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user_email],
        fail_silently=False,
    )