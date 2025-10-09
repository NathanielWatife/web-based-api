from django.urls import path
from . import views
from .views import PaystackWebhookView, FlutterwaveWebhookView

urlpatterns = [
    path('initialize/', views.initialize_payment, name='initialize-payment'),
    path('verify/', views.verify_payment, name='verify-payment'),
    path('transactions/', views.payment_transactions, name='payment-transactions'),
    path('transactions/<str:reference>/', views.payment_transaction_detail, name='payment-transaction-detail'),
    path('transactions/<str:reference>/retry/', views.retry_payment_verification, name='retry-payment-verification'),
    
    # Webhook endpoints
    path('webhook/paystack/', PaystackWebhookView.as_view(), name='paystack-webhook'),
    path('webhook/flutterwave/', FlutterwaveWebhookView.as_view(), name='flutterwave-webhook'),
]