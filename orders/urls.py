from django.urls import path
from . import views

urlpatterns = [
    path('', views.order_list_create, name='order-list-create'),
    path('stats/', views.order_stats, name='order-stats'),
    path('admin/all/', views.admin_order_list, name='admin-order-list'),
    path('<uuid:pk>/', views.order_detail, name='order-detail'),
    path('<uuid:pk>/status/', views.order_update_status, name='order-update-status'),
    path('<uuid:pk>/cancel/', views.cancel_order, name='cancel-order'),
]