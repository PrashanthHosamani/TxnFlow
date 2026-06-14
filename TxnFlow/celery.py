import os 
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'TxnFlow.settings')

app = Celery('TxnFlow')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()