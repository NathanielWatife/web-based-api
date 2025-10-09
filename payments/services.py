import requests
import json
from django.conf import settings
from django.utils import timezone
from .models import PaymentTransaction

class PaymentService:
    """Base payment service class"""
    
    def __init__(self, provider):
        self.provider = provider
        self.config = self._get_config()
    
    def _get_config(self):
        """Get provider-specific configuration"""
        if self.provider == 'paystack':
            return {
                'public_key': getattr(settings, 'PAYSTACK_PUBLIC_KEY', ''),
                'secret_key': getattr(settings, 'PAYSTACK_SECRET_KEY', ''),
                'base_url': 'https://api.paystack.co'
            }
        elif self.provider == 'flutterwave':
            return {
                'public_key': getattr(settings, 'FLUTTERWAVE_PUBLIC_KEY', ''),
                'secret_key': getattr(settings, 'FLUTTERWAVE_SECRET_KEY', ''),
                'base_url': 'https://api.flutterwave.com/v3'
            }
        return {}
    
    def _get_headers(self):
        """Get request headers for the provider"""
        if self.provider == 'paystack':
            return {
                'Authorization': f'Bearer {self.config["secret_key"]}',
                'Content-Type': 'application/json'
            }
        elif self.provider == 'flutterwave':
            return {
                'Authorization': f'Bearer {self.config["secret_key"]}',
                'Content-Type': 'application/json'
            }
        return {}

class PaystackService(PaymentService):
    """Paystack payment service implementation"""
    
    def __init__(self):
        super().__init__('paystack')
    
    def initialize_payment(self, email, amount, reference, callback_url=None, metadata=None):
        """Initialize Paystack payment"""
        url = f"{self.config['base_url']}/transaction/initialize"
        
        payload = {
            'email': email,
            'amount': int(amount * 100),  # Convert to kobo
            'reference': reference,
            'currency': 'NGN',
            'metadata': metadata or {}
        }
        
        if callback_url:
            payload['callback_url'] = callback_url
        
        try:
            response = requests.post(url, headers=self._get_headers(), json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Paystack initialization error: {e}")
            return None
    
    def verify_payment(self, reference):
        """Verify Paystack payment"""
        url = f"{self.config['base_url']}/transaction/verify/{reference}"
        
        try:
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Paystack verification error: {e}")
            return None

class FlutterwaveService(PaymentService):
    """Flutterwave payment service implementation"""
    
    def __init__(self):
        super().__init__('flutterwave')
    
    def initialize_payment(self, email, amount, reference, callback_url=None, metadata=None):
        """Initialize Flutterwave payment"""
        url = f"{self.config['base_url']}/payments"
        
        payload = {
            'tx_ref': reference,
            'amount': str(amount),
            'currency': 'NGN',
            'redirect_url': callback_url or f"{getattr(settings, 'FRONTEND_URL', '')}/payment/callback",
            'customer': {
                'email': email,
            },
            'customizations': {
                'title': 'YabaTech BookStore',
                'description': 'Book Purchase Payment'
            },
            'meta': metadata or {}
        }
        
        try:
            response = requests.post(url, headers=self._get_headers(), json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Flutterwave initialization error: {e}")
            return None
    
    def verify_payment(self, reference):
        """Verify Flutterwave payment"""
        url = f"{self.config['base_url']}/transactions/{reference}/verify"
        
        try:
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Flutterwave verification error: {e}")
            return None

class PaymentGateway:
    """Unified payment gateway interface"""
    
    def __init__(self, provider):
        if provider == 'paystack':
            self.service = PaystackService()
        elif provider == 'flutterwave':
            self.service = FlutterwaveService()
        else:
            raise ValueError(f"Unsupported payment provider: {provider}")
    
    def initialize_payment(self, order, user, callback_url=None):
        """Initialize payment for an order"""
        from .models import PaymentTransaction
        
        # Generate unique reference
        import random
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_digits = str(random.randint(1000, 9999))
        
        if self.service.provider == 'paystack':
            reference = f"PSK{timestamp}{random_digits}"
        else:  # flutterwave
            reference = f"FLW{timestamp}{random_digits}"
        
        # Create payment transaction
        payment_transaction = PaymentTransaction.objects.create(
            user=user,
            order=order,
            provider=self.service.provider,
            reference=reference,
            amount=order.total_price,
            currency='NGN'
        )
        
        # Prepare metadata
        metadata = {
            'order_id': str(order.id),
            'order_number': order.order_number,
            'user_id': str(user.id),
            'matric_no': user.matric_no
        }
        
        # Initialize payment with provider
        result = self.service.initialize_payment(
            email=user.email,
            amount=float(order.total_price),
            reference=reference,
            callback_url=callback_url,
            metadata=metadata
        )
        
        if result:
            payment_transaction.provider_response = result
            payment_transaction.save()
            
            if self.service.provider == 'paystack':
                return {
                    'authorization_url': result['data']['authorization_url'],
                    'access_code': result['data']['access_code'],
                    'reference': reference
                }
            elif self.service.provider == 'flutterwave':
                return {
                    'authorization_url': result['data']['link'],
                    'reference': reference
                }
        
        return None
    
    def verify_payment(self, reference):
        """Verify payment status"""
        from .models import PaymentTransaction
        
        try:
            payment_transaction = PaymentTransaction.objects.get(reference=reference)
        except PaymentTransaction.DoesNotExist:
            return None
        
        # Verify with provider
        result = self.service.verify_payment(reference)
        
        if result:
            payment_transaction.verification_response = result
            
            if self.service.provider == 'paystack':
                if result['data']['status'] == 'success':
                    payment_transaction.mark_as_success(result)
                    return True
                else:
                    payment_transaction.mark_as_failed(result)
                    return False
            
            elif self.service.provider == 'flutterwave':
                if result['data']['status'] == 'successful':
                    payment_transaction.mark_as_success(result)
                    return True
                else:
                    payment_transaction.mark_as_failed(result)
                    return False
        
        return None