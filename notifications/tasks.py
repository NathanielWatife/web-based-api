from celery import shared_task
from django.conf import settings
from .services import NotificationService, EmailTemplateService

@shared_task
def send_email_notification(user_email, title, message, template_name=None, context=None):
    """Send email notification asynchronously"""
    if template_name and context:
        success = EmailTemplateService.send_templated_email(user_email, template_name, context)
    else:
        success = NotificationService.send_email(user_email, title, message)
    
    return success

@shared_task
def send_order_notification(order_id, notification_type, extra_data=None):
    """Send order-related notification"""
    from orders.models import Order
    from .services import OrderNotificationService
    
    try:
        order = Order.objects.get(id=order_id)
        
        if notification_type == 'created':
            OrderNotificationService.send_order_created_notification(order)
        elif notification_type == 'status_updated':
            OrderNotificationService.send_order_status_update_notification(
                order, 
                extra_data.get('old_status'), 
                extra_data.get('new_status')
            )
        elif notification_type == 'payment_success':
            from payments.models import PaymentTransaction
            payment = PaymentTransaction.objects.filter(order=order, status='success').first()
            if payment:
                OrderNotificationService.send_payment_success_notification(order, payment)
        
        return True
    except Order.DoesNotExist:
        return False

@shared_task
def cleanup_old_notifications(days_old=30):
    """Clean up notifications older than specified days"""
    from django.utils import timezone
    from datetime import timedelta
    from .models import Notification
    
    cutoff_date = timezone.now() - timedelta(days=days_old)
    deleted_count, _ = Notification.objects.filter(
        created_at__lt=cutoff_date,
        is_read=True
    ).delete()
    
    return f"Deleted {deleted_count} old notifications"