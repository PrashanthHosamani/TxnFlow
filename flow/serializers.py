from rest_framework import serializers
from . models import Job, Transaction, JobSummary
import os

class UploadJobSerializer(serializers.ModelSerializer):
    class Meta:
        model =  Job
        fields = ['file']
        
    def validate_file(self, file):
        ext = os.path.splitext(file.name)[1]
        if ext.lower() != '.csv':
            raise serializers.ValidationError("Only CSV files are allowed.")
        
        if file.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Please upload files within 10 MB")
        
        return file
    
class JobStatusSerializer(serializers.ModelSerializer):

    class Meta:

        model = Job

        fields = [

            'id',

            'status',

            'row_count',

            'row_count_clean',

            'created_at',

            'completed_at'

        ]

class TransactionSerializer(serializers.ModelSerializer):

    class Meta:

        model = Transaction

        fields = '__all__'

class JobSummarySerializer(serializers.ModelSerializer):

    class Meta:

        model = JobSummary

        fields = '__all__'
        
        
class JobListSerializer(serializers.ModelSerializer):

    filename = serializers.SerializerMethodField()

    class Meta:

        model = Job

        fields = [

            "id",

            "filename",

            "status",

            "row_count",

            "row_count_clean",

            "created_at",

            "completed_at"

        ]

    def get_filename(self, obj):

        return obj.file.name.split("/")[-1]
    
class JobResultsSerializer(serializers.Serializer):

    job_id = serializers.IntegerField()

    status = serializers.CharField()

    summary = serializers.DictField()

    category_breakdown = serializers.DictField()

    anomaly_count = serializers.IntegerField()

    anomalies = serializers.ListField()

    transactions = serializers.ListField()
        