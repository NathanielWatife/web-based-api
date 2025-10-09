from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    readonly_fields = ['price', 'total_price']
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'user', 'total_price', 'status', 
        'payment_method', 'payment_status', 'created_at'
    ]
    list_filter = ['status', 'payment_method', 'payment_status', 'created_at']
    search_fields = ['order_number', 'user__email', 'user__matric_no']
    readonly_fields = ['order_number', 'created_at', 'updated_at']
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'user', 'total_price', 'status')
        }),
        ('Payment Information', {
            'fields': ('payment_method', 'payment_reference', 'payment_status')
        }),
        ('Delivery Information', {
            'fields': ('pickup_location',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_processing', 'mark_as_ready', 'mark_as_completed']
    
    def mark_as_processing(self, request, queryset):
        updated = queryset.update(status='processing')
        self.message_user(request, f'{updated} orders marked as processing.')
    mark_as_processing.short_description = "Mark selected orders as processing"
    
    def mark_as_ready(self, request, queryset):
        updated = queryset.update(status='ready')
        self.message_user(request, f'{updated} orders marked as ready for pickup.')
    mark_as_ready.short_description = "Mark selected orders as ready for pickup"
    
    def mark_as_completed(self, request, queryset):
        for order in queryset:
            order.status = 'completed'
            order.save()
            order.update_stock()
        self.message_user(request, f'{queryset.count()} orders marked as completed and stock updated.')
    mark_as_completed.short_description = "Mark selected orders as completed"

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'book', 'quantity', 'price', 'total_price']
    list_filter = ['order__status']
    search_fields = ['order__order_number', 'book__title']
    readonly_fields = ['price', 'total_price']
    