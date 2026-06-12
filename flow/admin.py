from django.contrib import admin
from . models import Job, Transaction, JobSummary

admin.site.register(Job)
admin.site.register(Transaction)
admin.site.register(JobSummary)

