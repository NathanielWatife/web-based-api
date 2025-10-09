from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register_user, name='register'),
    path('verify-email/', views.verify_email, name='verify-email'),
    path('login/', views.user_login, name='login'),
    path('profile/', views.user_profile, name='profile'),
    path('resend-verification/', views.resend_verification, name='resend-verification'),
]