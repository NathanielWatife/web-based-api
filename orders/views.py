from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from .models import Order
from .serializers import (
    OrderSerializer, 
    OrderCreateSerializer, 
    OrderStatusUpdateSerializer
)
from .permissions import IsOrderOwner, IsAdminOrOrderOwner

@api_view(['GET', 'POST'])
def order_list_create(request):
    if request.method == 'GET':
        # Users can only see their own orders, admins can see all
        if request.user.is_staff:
            orders = Order.objects.all()
        else:
            orders = Order.objects.filter(user=request.user)
        
        # Filter by status
        status_filter = request.GET.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = OrderCreateSerializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            order = serializer.save()
            order_serializer = OrderSerializer(order)
            return Response(order_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAdminOrOrderOwner])
def order_detail(request, pk):
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = OrderSerializer(order)
    return Response(serializer.data)

@api_view(['PUT'])
@permission_classes([permissions.IsAdminUser])
def order_update_status(request, pk):
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = OrderStatusUpdateSerializer(order, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_order_list(request):
    """
    Admin-only endpoint to list all orders with advanced filtering
    """
    orders = Order.objects.all()
    
    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)
    
    # Filter by user email
    user_email = request.GET.get('user_email')
    if user_email:
        orders = orders.filter(user__email__icontains=user_email)
    
    # Filter by order number
    order_number = request.GET.get('order_number')
    if order_number:
        orders = orders.filter(order_number__icontains=order_number)
    
    # Date range filtering
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    if start_date:
        orders = orders.filter(created_at__date__gte=start_date)
    if end_date:
        orders = orders.filter(created_at__date__lte=end_date)
    
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsOrderOwner])
def cancel_order(request, pk):
    try:
        order = Order.objects.get(pk=pk, user=request.user)
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if order.status not in ['pending', 'paid']:
        return Response(
            {'error': 'Order cannot be cancelled at this stage'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    order.status = 'cancelled'
    order.save()
    
    serializer = OrderSerializer(order)
    return Response(serializer.data)

@api_view(['GET'])
def order_stats(request):
    """
    Get order statistics for the current user (or all for admin)
    """
    if request.user.is_staff:
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        completed_orders = Order.objects.filter(status='completed').count()
        total_revenue = sum(
            order.total_price for order in Order.objects.filter(status='completed')
        )
    else:
        total_orders = Order.objects.filter(user=request.user).count()
        pending_orders = Order.objects.filter(user=request.user, status='pending').count()
        completed_orders = Order.objects.filter(user=request.user, status='completed').count()
        total_revenue = sum(
            order.total_price for order in Order.objects.filter(
                user=request.user, status='completed'
            )
        )
    
    return Response({
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'completed_orders': completed_orders,
        'total_revenue': float(total_revenue) if total_revenue else 0
    })