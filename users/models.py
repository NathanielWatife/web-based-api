from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid
from datetime import timedelta
from django.utils import timezone

# Create your models here.
class User(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('admin', 'Admin'),
        ('super_admin', 'Super Admin'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matric_no = models.CharField(max_length=20, unique=True)
    department = models.CharField(max_length=100)
    level = models.CharField(max_length=50)
    phone = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    is_verified = models.BooleanField(default=False)
    verification_code_expires = models.DateTimeField(blank=True, null=True) 
    verification_code = models.CharField(max_length=6, blank=True, null=True)


    # Override abstactuser fields
    username = None
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'matric_no', 'department', 'level']

    def __str__(self):
        return f"{self.matric_no} - {self.email}"
    
    def generate_verification_code(self):
        import random
        self.verification_code = str(random.randint(100000, 999999))
        self.verification_code_expires = timezone.now() + timedelta(minutes=24)
        self.save()
        return self.verification_code
    
    def is_verification_code_expired(self):
        if self.verification_code_expires:
            return timezone.now() > self.verification_code_expires
        return True