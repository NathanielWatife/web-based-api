from django.contrib import admin
from .models import Category, Book

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name',)
    list_filter = ('created_at',)

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'price', 'department', 'course_code', 'stock_quantity', 'is_available')
    list_filter = ('department', 'category', 'is_available', 'created_at')
    search_fields = ('title', 'author', 'course_code', 'department')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('title', 'author', 'description', 'price', 'image')
        }),
        ('Academic Information', {
            'fields': ('category', 'department', 'course_code', 'isbn')
        }),
        ('Inventory', {
            'fields': ('stock_quantity', 'is_available')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )