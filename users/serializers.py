from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User
import random
import string
from datetime import timedelta
from django.utils import timezone

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'confirm_password', 'matric_no', 
                 'first_name', 'last_name', 'department', 'level', 'phone')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        
        # Generate verification code
        verification_code = ''.join(random.choices(string.digits, k=6))
        
        user = User.objects.create_user(
            **validated_data,
            verification_code=verification_code,
            verification_code_expires=timezone.now() + timedelta(hours=24)
        )
        
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid email or password')
            if not user.is_verified:
                raise serializers.ValidationError('Please verify your email address')
        else:
            raise serializers.ValidationError('Email and password are required')
        
        attrs['user'] = user
        return attrs

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'matric_no', 'first_name', 'last_name', 
                 'department', 'level', 'phone', 'role', 'is_verified')
        read_only_fields = ('id', 'email', 'role', 'is_verified')

class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    verification_code = serializers.CharField(max_length=6)