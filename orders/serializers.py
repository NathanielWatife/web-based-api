from rest_framework import serializers
from .models import Order, OrderItem
from books.serializers import BookSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    book_details = BookSerializer(source='book', read_only=True)
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ['id', 'book', 'book_details', 'quantity', 'price', 'total_price']

class OrderItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['book', 'quantity']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'user_email', 'user_name', 
            'total_price', 'status', 'payment_method', 'payment_reference',
            'payment_status', 'pickup_location', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'user', 'created_at', 'updated_at']

class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemCreateSerializer(many=True)

    class Meta:
        model = Order
        fields = ['payment_method', 'pickup_location', 'items']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must contain at least one item.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        
        # Calculate total price and validate stock
        total_price = 0
        order_items = []
        
        for item_data in items_data:
            book = item_data['book']
            quantity = item_data['quantity']
            
            # Check stock availability
            if book.stock_quantity < quantity:
                raise serializers.ValidationError(
                    f"Insufficient stock for {book.title}. Available: {book.stock_quantity}"
                )
            
            if not book.is_available:
                raise serializers.ValidationError(f"Book {book.title} is not available")
            
            item_price = book.price
            total_price += quantity * item_price
            
            order_items.append(OrderItem(
                book=book,
                quantity=quantity,
                price=item_price
            ))
        
        # Create order
        order = Order.objects.create(
            user=user,
            total_price=total_price,
            payment_method=validated_data.get('payment_method'),
            pickup_location=validated_data.get('pickup_location', '')
        )
        
        # Create order items
        for order_item in order_items:
            order_item.order = order
            order_item.save()
        
        return order

class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']

    def validate_status(self, value):
        valid_transitions = {
            'pending': ['paid', 'cancelled'],
            'paid': ['processing', 'cancelled'],
            'processing': ['ready', 'cancelled'],
            'ready': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': []
        }
        
        current_status = self.instance.status
        if value not in valid_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"Cannot change status from {current_status} to {value}"
            )
        
        return value

    def update(self, instance, validated_data):
        new_status = validated_data.get('status')
        instance.status = new_status
        instance.save()
        
        # Update stock when order is completed
        if new_status == 'completed':
            instance.update_stock()
        
        return instance