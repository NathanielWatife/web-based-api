from django.db import models
import uuid
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver



@receiver(post_save, sender='payments.PaymentTransaction')
def payment_status_change_handler(sender, instance, **kwargs):
    """Handle payment status changes and send notifications"""
    if not kwargs.get('created'):
        if instance.tracker.has_changed('status') and instance.status == 'success':
            from notifications.tasks import send_order_notification
            send_order_notification.delay(
                str(instance.order.id), 
                'payment_success'
            )

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('processing', 'Processing'),
        ('ready', 'Ready for Pickup'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('paystack', 'Paystack'),
        ('flutterwave', 'Flutterwave'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_reference = models.CharField(max_length=100, blank=True)
    payment_status = models.CharField(max_length=20, default='pending')
    pickup_location = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_number} - {self.user.email}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate order number: ORD + timestamp + random 4 digits
            import random
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            random_digits = str(random.randint(1000, 9999))
            self.order_number = f"ORD{timestamp}{random_digits}"
        super().save(*args, **kwargs)

    def update_stock(self):
        """Update book stock quantities when order is completed"""
        if self.status == 'completed':
            for item in self.items.all():
                book = item.book
                book.stock_quantity -= item.quantity
                if book.stock_quantity < 0:
                    book.stock_quantity = 0
                book.save()

class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    book = models.ForeignKey('books.Book', on_delete=models.CASCADE)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.book.title}"

    @property
    def total_price(self):
        return self.quantity * self.price