from rest_framework import serializers
from .models import PaymentTransaction

class PaymentInitializeSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    provider = serializers.ChoiceField(choices=['paystack', 'flutterwave'])
    callback_url = serializers.URLField(required=False)

    def validate_order_id(self, value):
        from orders.models import Order
        try:
            order = Order.objects.get(id=value)
            if order.user != self.context['request'].user:
                raise serializers.ValidationError("You don't have permission to pay for this order.")
            if order.status != 'pending':
                raise serializers.ValidationError("This order has already been processed.")
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order not found.")
        return value

class PaymentVerificationSerializer(serializers.Serializer):
    reference = serializers.CharField(max_length=100)
    provider = serializers.ChoiceField(choices=['paystack', 'flutterwave'])

class PaymentTransactionSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'reference', 'order', 'order_number', 'user', 'user_email',
            'provider', 'amount', 'currency', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reference', 'user', 'order', 'amount', 'currency', 
            'status', 'created_at', 'updated_at'
        ]