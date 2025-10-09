from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import Order

@shared_task
def send_order_confirmation_email(order_id):
    try:
        order = Order.objects.get(id=order_id)
        subject = f'Order Confirmation - {order.order_number}'
        
        message = f"""
        Dear {order.user.get_full_name()},
        
        Thank you for your order! Here are your order details:
        
        Order Number: {order.order_number}
        Total Amount: ₦{order.total_price:,.2f}
        Status: {order.status.title()}
        Payment Method: {order.payment_method.title()}
        
        Items:
        """
        
        for item in order.items.all():
            message += f"\n- {item.quantity} x {item.book.title} - ₦{item.price:,.2f} each"
        
        message += f"""
        
        Pickup Location: {order.pickup_location or 'To be announced'}
        
        We'll notify you when your order is ready for pickup.
        
        Best regards,
        YabaTech BookStore Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.user.email],
            fail_silently=False,
        )
        
    except Order.DoesNotExist:
        pass

@shared_task
def send_order_status_update_email(order_id, old_status, new_status):
    try:
        order = Order.objects.get(id=order_id)
        subject = f'Order Status Update - {order.order_number}'
        
        message = f"""
        Dear {order.user.get_full_name()},
        
        Your order status has been updated:
        
        Order Number: {order.order_number}
        Previous Status: {old_status.title()}
        New Status: {new_status.title()}
        
        """
        
        if new_status == 'ready':
            message += "Your order is ready for pickup! Please visit the designated pickup location.\n\n"
            message += f"Pickup Location: {order.pickup_location}\n\n"
        elif new_status == 'completed':
            message += "Your order has been completed. Thank you for shopping with us!\n\n"
        
        message += """
        Best regards,
        YabaTech BookStore Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.user.email],
            fail_silently=False,
        )
        
    except Order.DoesNotExist:
        pass