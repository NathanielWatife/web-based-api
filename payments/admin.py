from django.contrib import admin
from .models import PaymentTransaction

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'reference', 'user', 'order', 'provider', 'amount', 
        'status', 'created_at'
    ]
    list_filter = ['provider', 'status', 'created_at']
    search_fields = ['reference', 'user__email', 'order__order_number']
    readonly_fields = [
        'reference', 'created_at', 'updated_at', 
        'provider_response', 'verification_response'
    ]
    
    fieldsets = (
        ('Transaction Information', {
            'fields': ('reference', 'user', 'order', 'provider', 'amount', 'currency', 'status')
        }),
        ('Provider Responses', {
            'fields': ('provider_response', 'verification_response'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['verify_payments']
    
    def verify_payments(self, request, queryset):
        from .tasks import verify_payment_status
        for payment in queryset:
            verify_payment_status.delay(payment.reference, payment.provider)
        self.message_user(request, f'Scheduled verification for {queryset.count()} payments.')
    verify_payments.short_description = "Verify selected payments"