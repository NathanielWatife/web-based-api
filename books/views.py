from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import Book, Category
from .serializers import BookSerializer, CategorySerializer, BookCreateSerializer

class BookPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def book_list(request):
    books = Book.objects.filter(is_available=True)
    
    # Filter by category
    category = request.GET.get('category')
    if category:
        books = books.filter(category__name=category)
    
    # Filter by department
    department = request.GET.get('department')
    if department:
        books = books.filter(department=department)
    
    # Filter by course code
    course_code = request.GET.get('course_code')
    if course_code:
        books = books.filter(course_code=course_code)
    
    # Search
    search = request.GET.get('search')
    if search:
        books = books.filter(
            Q(title__icontains=search) |
            Q(author__icontains=search) |
            Q(description__icontains=search) |
            Q(course_code__icontains=search)
        )
    
    # Ordering
    ordering = request.GET.get('ordering', '-created_at')
    books = books.order_by(ordering)
    
    paginator = BookPagination()
    paginated_books = paginator.paginate_queryset(books, request)
    serializer = BookSerializer(paginated_books, many=True)
    
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def book_detail(request, pk):
    try:
        book = Book.objects.get(pk=pk)
        serializer = BookSerializer(book)
        return Response(serializer.data)
    except Book.DoesNotExist:
        return Response(
            {'error': 'Book not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def category_list(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def book_create(request):
    serializer = BookCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
@permission_classes([permissions.IsAdminUser])
def book_update(request, pk):
    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response(
            {'error': 'Book not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = BookCreateSerializer(book, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([permissions.IsAdminUser])
def book_delete(request, pk):
    try:
        book = Book.objects.get(pk=pk)
        book.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Book.DoesNotExist:
        return Response(
            {'error': 'Book not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def book_search(request):
    query = request.GET.get('q', '')
    if not query:
        return Response(
            {'error': 'Search query is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    books = Book.objects.filter(
        Q(title__icontains=query) |
        Q(author__icontains=query) |
        Q(description__icontains=query) |
        Q(course_code__icontains=query) |
        Q(department__icontains=query)
    ).filter(is_available=True)
    
    serializer = BookSerializer(books, many=True)
    return Response(serializer.data)