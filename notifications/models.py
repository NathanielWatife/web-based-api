from django.db import models
import uuid
from django.conf import settings

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('email', 'Email'),
        ('system', 'System'),
        ('both', 'Both'),
    ]

    NOTIFICATION_CATEGORIES = [
        ('order', 'Order Update'),
        ('payment', 'Payment'),
        ('system', 'System'),
        ('promotion', 'Promotion'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=10, choices=NOTIFICATION_TYPES, default='system')
    category = models.CharField(max_length=20, choices=NOTIFICATION_CATEGORIES, default='system')
    is_read = models.BooleanField(default=False)
    related_order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)  # Store additional data
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.email}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            from django.utils import timezone
            self.read_at = timezone.now()
            self.save()

class EmailTemplate(models.Model):
    name = models.CharField(max_length=100, unique=True)
    subject = models.CharField(max_length=200)
    template_path = models.CharField(max_length=200)  # Path to template file
    context_variables = models.JSONField(help_text="Available context variables for this template")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name