from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .serializers import UploadJobSerializer, TransactionSerializer, JobStatusSerializer, JobSummarySerializer, JobListSerializer, JobResultsSerializer
from .tasks import process_job
from django.shortcuts import get_object_or_404
from . models import Job, JobSummary, Transaction
from celery import shared_task

class CreateJob(APIView):
    
    def post(self, request):
        serializer = UploadJobSerializer(data = request.data, )
        if serializer.is_valid():
            job = serializer.save()
            process_job.delay(job.id)
            return Response(
                {
                    "job_id" : job.id,
                    "status" : job.status,
                    "message" : "The file uploaded successfully, Process will start shortly"
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)

class JobStatusAPIView(APIView):

    def get(self, request, job_id):

        job = get_object_or_404(Job, id=job_id)

        serializer = JobStatusSerializer(job)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

class JobSummaryAPIView(APIView):

    def get(self, request, job_id):

        job = get_object_or_404(Job, id=job_id)

        summary = get_object_or_404(
            JobSummary,
            job=job
        )

        serializer = JobSummarySerializer(summary)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
        
class TransactionAPIView(APIView):

    def get(self, request, job_id):

        transactions = Transaction.objects.filter(
            job_id=job_id
        )

        serializer = TransactionSerializer(
            transactions,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
        
class JobListAPIView(APIView):

    def get(self, request):
        jobs = Job.objects.all().order_by(

            "-created_at"
        )
        status_filter = request.GET.get(

            "status"
        )
        if status_filter:

            jobs = jobs.filter(

                status=status_filter.upper()

            )

        serializer = JobListSerializer(

            jobs,

            many=True

        )

        return Response(

            serializer.data,

            status=status.HTTP_200_OK

        )
        
class JobResultsAPIView(APIView):

    def get(self, request, job_id):

        job = get_object_or_404(
            Job,
            id=job_id
        )

        transactions = Transaction.objects.filter(
            job=job
        )

        summary = get_object_or_404(
            JobSummary,
            job=job
        )

        category_breakdown = {}

        for transaction in transactions:

            category = (
                transaction.category
                or "Uncategorised"
            )

            category_breakdown[category] = (

                category_breakdown.get(
                    category,
                    0
                )

                + float(
                    transaction.amount
                )
            )

        anomaly_transactions = transactions.filter(
            is_anomaly=True
        )

        transaction_data = TransactionSerializer(
            transactions,
            many=True
        ).data

        anomaly_data = TransactionSerializer(
            anomaly_transactions,
            many=True
        ).data

        response_data = {

            "job_id":
                job.id,

            "status":
                job.status,

            "summary": {

                "total_spend_inr":
                    summary.total_spend_inr,

                "total_spend_usd":
                    summary.total_spend_usd,

                "top_merchants":
                    summary.top_merchants,

                "narrative":
                    summary.narrative,

                "risk_level":
                    summary.risk_level,
            },

            "category_breakdown":
                category_breakdown,

            "anomaly_count":
                summary.anomaly_count,

            "anomalies":
                anomaly_data,

            "transactions":
                transaction_data
        }

        serializer = JobResultsSerializer(
            response_data
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )