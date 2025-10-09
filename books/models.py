from django.db import models
import uuid

# Create your models here.
class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"


class Book(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='book_covers/', blank=True, null=True)
    category = models.ForeignKey(Category, null=True, on_delete=models.SET_NULL)
    department = models.CharField(max_length=100)
    course_code = models.CharField(max_length=6, blank=True)
    isbn = models.CharField(max_length=13, unique=True)
    stock_quantity = models.PositiveIntegerField()
    is_available = models.BooleanField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        self.is_available = self.stock_quantity > 0
        super().save(*args, **kwargs)


    class Meta:
        ordering = ['-created_at']