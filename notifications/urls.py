from django.urls import path
from . import views

urlpatterns = [
    path('', views.notification_list, name='notification-list'),
    path('stats/', views.notification_stats, name='notification-stats'),
    path('mark-read/', views.mark_as_read, name='mark-as-read'),
    path('mark-all-read/', views.mark_all_as_read, name='mark-all-read'),
    path('create/', views.create_notification, name='create-notification'),
    path('bulk/', views.send_bulk_notification, name='bulk-notification'),
    path('<uuid:pk>/', views.notification_detail, name='notification-detail'),
]