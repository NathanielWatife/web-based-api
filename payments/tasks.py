from celery import shared_task
from .services import PaymentGateway
from orders.tasks import send_order_confirmation_email

@shared_task
def verify_payment_status(reference, provider):
    """Verify payment status asynchronously"""
    gateway = PaymentGateway(provider)
    success = gateway.verify_payment(reference)
    
    if success:
        # Get the payment transaction to access order
        from .models import PaymentTransaction
        try:
            transaction = PaymentTransaction.objects.get(reference=reference)
            # Send order confirmation email
            send_order_confirmation_email.delay(str(transaction.order.id))
        except PaymentTransaction.DoesNotExist:
            pass
    
    return success

@shared_task
def check_pending_payments():
    """Periodic task to check pending payments"""
    from .models import PaymentTransaction
    from django.utils import timezone
    from datetime import timedelta
    
    # Find payments that are pending for more than 1 hour
    time_threshold = timezone.now() - timedelta(hours=1)
    pending_payments = PaymentTransaction.objects.filter(
        status='pending',
        created_at__lt=time_threshold
    )
    
    for payment in pending_payments:
        verify_payment_status.delay(payment.reference, payment.provider)
    
    return f"Checked {pending_payments.count()} pending payments"