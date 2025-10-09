from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse
import json
from .models import PaymentTransaction
from .serializers import (
    PaymentInitializeSerializer, 
    PaymentVerificationSerializer,
    PaymentTransactionSerializer
)
from .services import PaymentGateway
from .tasks import verify_payment_status
from django.conf import settings

@api_view(['POST'])
def initialize_payment(request):
    serializer = PaymentInitializeSerializer(
        data=request.data, 
        context={'request': request}
    )
    
    if serializer.is_valid():
        order_id = serializer.validated_data['order_id']
        provider = serializer.validated_data['provider']
        callback_url = serializer.validated_data.get('callback_url')
        
        from orders.models import Order
        try:
            order = Order.objects.get(id=order_id)
            
            # Initialize payment
            gateway = PaymentGateway(provider)
            result = gateway.initialize_payment(order, request.user, callback_url)
            
            if result:
                return Response({
                    'message': 'Payment initialized successfully',
                    'data': result
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Failed to initialize payment'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def verify_payment(request):
    serializer = PaymentVerificationSerializer(data=request.data)
    
    if serializer.is_valid():
        reference = serializer.validated_data['reference']
        provider = serializer.validated_data['provider']
        
        # Verify payment
        gateway = PaymentGateway(provider)
        success = gateway.verify_payment(reference)
        
        if success is not None:
            if success:
                return Response({
                    'message': 'Payment verified successfully',
                    'status': 'success'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'message': 'Payment verification failed',
                    'status': 'failed'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(
                {'error': 'Payment verification error'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def payment_transactions(request):
    """Get user's payment transactions"""
    if request.user.is_staff:
        transactions = PaymentTransaction.objects.all()
    else:
        transactions = PaymentTransaction.objects.filter(user=request.user)
    
    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        transactions = transactions.filter(status=status_filter)
    
    # Filter by provider
    provider_filter = request.GET.get('provider')
    if provider_filter:
        transactions = transactions.filter(provider=provider_filter)
    
    serializer = PaymentTransactionSerializer(transactions, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def payment_transaction_detail(request, reference):
    """Get specific payment transaction details"""
    try:
        if request.user.is_staff:
            transaction = PaymentTransaction.objects.get(reference=reference)
        else:
            transaction = PaymentTransaction.objects.get(
                reference=reference, 
                user=request.user
            )
        
        serializer = PaymentTransactionSerializer(transaction)
        return Response(serializer.data)
        
    except PaymentTransaction.DoesNotExist:
        return Response(
            {'error': 'Payment transaction not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

# Webhook handlers
@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(View):
    """Handle Paystack webhooks"""
    
    def post(self, request):
        # Verify webhook signature
        signature = request.headers.get('x-paystack-signature')
        if not self.verify_signature(request.body, signature):
            return JsonResponse({'status': 'invalid signature'}, status=400)
        
        payload = json.loads(request.body)
        event = payload.get('event')
        
        if event == 'charge.success':
            reference = payload['data']['reference']
            # Schedule verification task
            verify_payment_status.delay(reference, 'paystack')
            return JsonResponse({'status': 'success'})
        
        return JsonResponse({'status': 'ignored'})
    
    def verify_signature(self, payload, signature):
        """Verify Paystack webhook signature"""
        import hashlib
        import hmac
        from django.conf import settings
        
        paystack_secret = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
        computed_signature = hmac.new(
            paystack_secret.encode('utf-8'),
            payload,
            hashlib.sha512
        ).hexdigest()
        
        return hmac.compare_digest(computed_signature, signature)

@method_decorator(csrf_exempt, name='dispatch')
class FlutterwaveWebhookView(View):
    """Handle Flutterwave webhooks"""
    
    def post(self, request):
        # Verify webhook signature
        signature = request.headers.get('verif-hash')
        if not self.verify_signature(signature):
            return JsonResponse({'status': 'invalid signature'}, status=401)
        
        payload = json.loads(request.body)
        event = payload.get('event')
        
        if event == 'charge.completed':
            reference = payload['data']['tx_ref']
            # Schedule verification task
            verify_payment_status.delay(reference, 'flutterwave')
            return JsonResponse({'status': 'success'})
        
        return JsonResponse({'status': 'ignored'})
    
    def verify_signature(self, signature):
        """Verify Flutterwave webhook signature"""
        flutterwave_secret = getattr(settings, 'FLUTTERWAVE_WEBHOOK_SECRET', '')
        return signature == flutterwave_secret

@api_view(['POST'])
def retry_payment_verification(request, reference):
    """Manually retry payment verification"""
    try:
        if request.user.is_staff:
            transaction = PaymentTransaction.objects.get(reference=reference)
        else:
            transaction = PaymentTransaction.objects.get(
                reference=reference, 
                user=request.user
            )
        
        # Schedule verification task
        verify_payment_status.delay(reference, transaction.provider)
        
        return Response({
            'message': 'Payment verification retried successfully'
        }, status=status.HTTP_200_OK)
        
    except PaymentTransaction.DoesNotExist:
        return Response(
            {'error': 'Payment transaction not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )