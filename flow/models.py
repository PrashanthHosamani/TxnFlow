from django.db import models
from django.utils import timezone

class Job(models.Model):
    file = models.FileField(upload_to='uploads/')
    status_choices = [
        
        ("PENDING", "pending"),
        ("PROCESSING", "processing"),
        ("COMPLETED", "completed"),
        ("FAILED", "failed"),
    ]
    status = models.CharField(max_length = 20, choices = status_choices, default='PENDING')
    row_count = models.IntegerField(default=0)
    row_count_clean = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null = True, blank = True)
    
    def save(self, *args, **kwargs):
        if self.status == 'COMPLETED' and not self.completed_at:
            self.completed_at = timezone.now()
            
        super().save(*args, **kwargs)
            
            
class Transaction(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='transactions')
    txn_id  = models.CharField(max_length=255)
    date = models.DateField()
    merchant = models.CharField(max_length=255, null = True, blank = True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=255, null = True, blank = True)
    status = models.CharField(max_length=255)
    category = models.CharField(max_length=255, null = True, blank = True)
    account_id = models.CharField(max_length=255)
    is_anomaly = models.BooleanField(default=False)
    anomaly_reason = models.TextField(null = True, blank=True)
    llm_category = models.CharField(max_length=255, null = True, blank = True)
    llm_raw_response = models.TextField(null = True, blank = True)
    llm_failed = models.BooleanField(default=False)
    
    
class JobSummary(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name='job_summary')
    total_spend_inr = models.DecimalField(max_digits=15, decimal_places=2)
    total_spend_usd = models.DecimalField(max_digits=15, decimal_places=2)
    top_merchants = models.JSONField(default=list)
    anomaly_count = models.IntegerField()
    narrative = models.TextField(blank=True, null = True)
    risk_level = models.CharField(max_length=255)
    


    
    
    
