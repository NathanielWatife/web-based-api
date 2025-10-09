from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'matric_no', 'first_name', 'last_name', 'department', 'level', 'role', 'is_verified')
    list_filter = ('role', 'department', 'level', 'is_verified')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'matric_no', 'department', 'level', 'phone')}),
        ('Permissions', {'fields': ('role', 'is_verified', 'is_staff', 'is_active', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'matric_no', 'first_name', 'last_name', 'department', 'level', 'password1', 'password2'),
        }),
    )
    search_fields = ('email', 'matric_no', 'first_name', 'last_name')
    ordering = ('email',)

admin.site.register(User, CustomUserAdmin)