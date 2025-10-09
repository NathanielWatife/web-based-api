from rest_framework import serializers
from .models import Notification, EmailTemplate

class NotificationSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'category',
            'is_read', 'related_order', 'metadata', 'created_at', 
            'created_at_formatted', 'read_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']
    
    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime("%b %d, %Y %I:%M %p")

class NotificationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['user', 'title', 'message', 'notification_type', 'category', 'related_order', 'metadata']

class MarkAsReadSerializer(serializers.Serializer):
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True
    )

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'