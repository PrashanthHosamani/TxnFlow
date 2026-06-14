from django.urls import path
from .views import CreateJob, JobStatusAPIView, TransactionAPIView, JobSummaryAPIView, JobListAPIView, JobResultsAPIView

urlpatterns = [
    path('jobs/upload/', CreateJob.as_view(), name = 'create-job'),
    path('jobs/<int:job_id>/status/', JobStatusAPIView.as_view(), name='job-status'),

    path( 'jobs/<int:job_id>/summary/', JobSummaryAPIView.as_view(), name='job-summary'),

    path( 'jobs/<int:job_id>/transactions/',TransactionAPIView.as_view(), name='job-transactions' ),
    path( "jobs/", JobListAPIView.as_view()),
    path( "jobs/<int:job_id>/results/", JobResultsAPIView.as_view()

),
]
