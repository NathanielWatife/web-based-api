from django.urls import path
from . import views

urlpatterns = [
    path('', views.book_list, name='book-list'),
    path('categories/', views.category_list, name='category-list'),
    path('search/', views.book_search, name='book-search'),
    path('create/', views.book_create, name='book-create'),
    path('<uuid:pk>/', views.book_detail, name='book-detail'),
    path('<uuid:pk>/update/', views.book_update, name='book-update'),
    path('<uuid:pk>/delete/', views.book_delete, name='book-delete'),
]