from rest_framework import permissions

class IsOrderOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of an order to view or edit it.
    """
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user

class IsAdminOrOrderOwner(permissions.BasePermission):
    """
    Custom permission to allow admin users or order owners.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj.user == request.user