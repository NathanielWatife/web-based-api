from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

@shared_task
def send_verification_email(user_email, verification_code, user_name):
    subject = 'Verify Your YabaTech BookStore Account'
    html_message = render_to_string('emails/verification.html', {
        'user_name': user_name,
        'verification_code': verification_code,
    })
    
    send_mail(
        subject=subject,
        message='',  # Plain text version
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user_email],
        html_message=html_message,
        fail_silently=False,
    )