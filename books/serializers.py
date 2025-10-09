from rest_framework import serializers
from .models import Book, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class BookSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Book
        fields = '__all__'

class BookCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = '__all__'