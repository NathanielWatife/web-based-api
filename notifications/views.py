from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db import models
from django.db.models import Q
from .models import Notification
from .serializers import (
    NotificationSerializer, 
    MarkAsReadSerializer,
    NotificationCreateSerializer
)
from .services import NotificationService

@api_view(['GET'])
def notification_list(request):
    """Get user's notifications"""
    notifications = Notification.objects.filter(user=request.user)
    
    # Filter by read status
    is_read = request.GET.get('is_read')
    if is_read is not None:
        is_read = is_read.lower() == 'true'
        notifications = notifications.filter(is_read=is_read)
    
    # Filter by category
    category = request.GET.get('category')
    if category:
        notifications = notifications.filter(category=category)
    
    # Filter by type
    notification_type = request.GET.get('type')
    if notification_type:
        notifications = notifications.filter(notification_type=notification_type)
    
    # Pagination
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 20))
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    
    total_count = notifications.count()
    notifications_page = notifications[start_index:end_index]
    
    serializer = NotificationSerializer(notifications_page, many=True)
    
    return Response({
        'notifications': serializer.data,
        'total_count': total_count,
        'page': page,
        'page_size': page_size,
        'unread_count': notifications.filter(is_read=False).count()
    })

@api_view(['GET'])
def notification_detail(request, pk):
    """Get specific notification details"""
    try:
        notification = Notification.objects.get(pk=pk, user=request.user)
        serializer = NotificationSerializer(notification)
        return Response(serializer.data)
    except Notification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
def mark_as_read(request):
    """Mark notifications as read"""
    serializer = MarkAsReadSerializer(data=request.data)
    
    if serializer.is_valid():
        notification_ids = serializer.validated_data['notification_ids']
        
        # Get notifications that belong to the user
        notifications = Notification.objects.filter(
            id__in=notification_ids, 
            user=request.user
        )
        
        updated_count = 0
        for notification in notifications:
            notification.mark_as_read()
            updated_count += 1
        
        return Response({
            'message': f'Marked {updated_count} notifications as read',
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def mark_all_as_read(request):
    """Mark all user notifications as read"""
    updated_count = Notification.objects.filter(
        user=request.user, 
        is_read=False
    ).update(is_read=True)
    
    return Response({
        'message': f'Marked all {updated_count} notifications as read',
        'updated_count': updated_count
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
def notification_stats(request):
    """Get notification statistics for user"""
    total_notifications = Notification.objects.filter(user=request.user).count()
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    
    # Count by category
    categories = Notification.objects.filter(user=request.user).values('category').annotate(
        count=models.Count('id')
    )
    
    # Count by type
    types = Notification.objects.filter(user=request.user).values('notification_type').annotate(
        count=models.Count('id')
    )
    
    return Response({
        'total_count': total_notifications,
        'unread_count': unread_count,
        'categories': list(categories),
        'types': list(types)
    })

@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def create_notification(request):
    """Admin endpoint to create notifications for users"""
    serializer = NotificationCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        notification = serializer.save()
        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def send_bulk_notification(request):
    """Admin endpoint to send bulk notifications"""
    from users.models import User
    
    user_emails = request.data.get('user_emails', [])
    title = request.data.get('title')
    message = request.data.get('message')
    notification_type = request.data.get('notification_type', 'both')
    category = request.data.get('category', 'system')
    
    if not title or not message:
        return Response(
            {'error': 'Title and message are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get users
    if user_emails:
        users = User.objects.filter(email__in=user_emails)
    else:
        # Send to all users if no specific emails provided
        users = User.objects.all()
    
    # Send notifications
    from .services import NotificationService
    results = NotificationService.send_bulk_notification(
        users, title, message, notification_type, category
    )
    
    return Response({
        'message': f'Bulk notification sent. Success: {results["success"]}, Failed: {results["failed"]}',
        'results': results
    }, status=status.HTTP_200_OK)