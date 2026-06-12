from django.urls import path
from .views import CreateJob

urlpatterns = [
    path('jobs/upload/', CreateJob.as_view(), name = 'create-job'),
]
