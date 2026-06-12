from rest_framework import serializers
from . models import Job
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
    
    
    
        