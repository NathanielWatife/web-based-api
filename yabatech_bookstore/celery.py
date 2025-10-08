import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yabatech_bookstore.settings')

app = Celery('yabatech_bookstore')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()