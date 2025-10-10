from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import uuid
from datetime import timedelta
from django.utils import timezone

# Create your models here.
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The mail field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser with an email and password"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role', 'super_admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

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

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.matric_no} - {self.email}"
    
    def generate_verification_code(self):
        import random
        self.verification_code = str(random.randint(100000, 999999))
        self.verification_code_expires = timezone.now() + timedelta(minutes=30)
        self.save()
        return self.verification_code
    
    def is_verification_code_expired(self):
        if self.verification_code_expires:
            return timezone.now() > self.verification_code_expires
        return True