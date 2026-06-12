from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .serializers import UploadJobSerializer


class CreateJob(APIView):
    
    def post(self, request):
        serializer = UploadJobSerializer(data = request.data, )
        if serializer.is_valid():
            job = serializer.save()
            return Response(
                {
                    "job_id" : job.id,
                    "status" : job.status,
                    "message" : "The file uploaded successfully, Process will start shortly"
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
        