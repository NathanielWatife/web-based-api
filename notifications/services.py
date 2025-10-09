from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import Notification, EmailTemplate
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for handling different types of notifications"""
    
    @staticmethod
    def create_system_notification(user, title, message, category='system', related_order=None, metadata=None):
        """Create a system notification for a user"""
        try:
            notification = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type='system',
                category=category,
                related_order=related_order,
                metadata=metadata or {}
            )
            return notification
        except Exception as e:
            logger.error(f"Error creating system notification: {e}")
            return None
    
    @staticmethod
    def create_email_notification(user, title, message, category='system', related_order=None, metadata=None):
        """Create and send email notification"""
        try:
            # Create system notification
            notification = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type='email',
                category=category,
                related_order=related_order,
                metadata=metadata or {}
            )
            
            # Send email
            NotificationService.send_email(
                user.email,
                title,
                message,
                template_name='generic_notification.html',
                context={
                    'user': user,
                    'title': title,
                    'message': message,
                    'category': category,
                    'metadata': metadata or {}
                }
            )
            
            return notification
        except Exception as e:
            logger.error(f"Error creating email notification: {e}")
            return None
    
    @staticmethod
    def send_email(to_email, subject, message, template_name=None, context=None):
        """Send email with optional template"""
        try:
            if template_name and context:
                # Render HTML template
                html_message = render_to_string(f'emails/{template_name}', context)
                plain_message = message
            else:
                html_message = None
                plain_message = message
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}")
            return False
    
    @staticmethod
    def send_bulk_notification(users, title, message, notification_type='both', category='system'):
        """Send notification to multiple users"""
        results = {
            'success': 0,
            'failed': 0,
            'details': []
        }
        
        for user in users:
            try:
                if notification_type in ['system', 'both']:
                    NotificationService.create_system_notification(
                        user, title, message, category
                    )
                
                if notification_type in ['email', 'both']:
                    NotificationService.create_email_notification(
                        user, title, message, category
                    )
                
                results['success'] += 1
                results['details'].append({
                    'user': user.email,
                    'status': 'success'
                })
            except Exception as e:
                results['failed'] += 1
                results['details'].append({
                    'user': user.email,
                    'status': 'failed',
                    'error': str(e)
                })
        
        return results

class OrderNotificationService:
    """Specialized service for order-related notifications"""
    
    @staticmethod
    def send_order_created_notification(order):
        """Send notification when order is created"""
        title = "Order Created Successfully"
        message = f"Your order #{order.order_number} has been created successfully. Total amount: ₦{order.total_price:,.2f}"
        
        NotificationService.create_system_notification(
            order.user,
            title,
            message,
            category='order',
            related_order=order,
            metadata={
                'order_number': order.order_number,
                'total_amount': float(order.total_price),
                'status': order.status
            }
        )
    
    @staticmethod
    def send_order_status_update_notification(order, old_status, new_status):
        """Send notification when order status changes"""
        title = f"Order Status Updated - #{order.order_number}"
        message = f"Your order status has been updated from {old_status} to {new_status}"
        
        # Send both system and email notifications for important status changes
        if new_status in ['ready', 'completed']:
            notification_type = 'both'
        else:
            notification_type = 'system'
        
        if notification_type == 'both':
            NotificationService.create_email_notification(
                order.user,
                title,
                message,
                category='order',
                related_order=order,
                metadata={
                    'order_number': order.order_number,
                    'old_status': old_status,
                    'new_status': new_status
                }
            )
        else:
            NotificationService.create_system_notification(
                order.user,
                title,
                message,
                category='order',
                related_order=order,
                metadata={
                    'order_number': order.order_number,
                    'old_status': old_status,
                    'new_status': new_status
                }
            )
    
    @staticmethod
    def send_payment_success_notification(order, payment_transaction):
        """Send notification for successful payment"""
        title = "Payment Successful"
        message = f"Payment for order #{order.order_number} was successful. Amount: ₦{order.total_price:,.2f}"
        
        NotificationService.create_email_notification(
            order.user,
            title,
            message,
            category='payment',
            related_order=order,
            metadata={
                'order_number': order.order_number,
                'amount': float(order.total_price),
                'payment_reference': payment_transaction.reference,
                'provider': payment_transaction.provider
            }
        )

class EmailTemplateService:
    """Service for managing email templates"""
    
    @staticmethod
    def get_template(name):
        """Get email template by name"""
        try:
            return EmailTemplate.objects.get(name=name, is_active=True)
        except EmailTemplate.DoesNotExist:
            return None
    
    @staticmethod
    def render_template(template_name, context):
        """Render email template with context"""
        template = EmailTemplateService.get_template(template_name)
        if not template:
            return None, None
        
        try:
            subject = template.subject
            html_content = render_to_string(template.template_path, context)
            return subject, html_content
        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {e}")
            return None, None
    
    @staticmethod
    def send_templated_email(to_email, template_name, context):
        """Send email using a template"""
        subject, html_content = EmailTemplateService.render_template(template_name, context)
        
        if not subject or not html_content:
            return False
        
        try:
            send_mail(
                subject=subject,
                message="",  # Empty plain message since we're using HTML
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False,
            )
            return True
        except Exception as e:
            logger.error(f"Error sending templated email: {e}")
            return False