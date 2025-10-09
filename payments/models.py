from django.db import models
import uuid
from django.conf import settings

class PaymentTransaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('abandoned', 'Abandoned'),
    ]

    PROVIDER_CHOICES = [
        ('paystack', 'Paystack'),
        ('flutterwave', 'Flutterwave'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    reference = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='NGN')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    provider_response = models.JSONField(null=True, blank=True)  # Store full provider response
    verification_response = models.JSONField(null=True, blank=True)  # Store verification response
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference} - {self.amount} - {self.status}"

    def mark_as_success(self, provider_response=None):
        self.status = 'success'
        if provider_response:
            self.verification_response = provider_response
        self.save()
        
        # Update order status
        self.order.payment_status = 'success'
        self.order.status = 'paid'
        self.order.save()

    def mark_as_failed(self, provider_response=None):
        self.status = 'failed'
        if provider_response:
            self.verification_response = provider_response
        self.save()
        
        # Update order payment status
        self.order.payment_status = 'failed'
        self.order.save()