# TxnFlow

AI-Powered Transaction Processing Pipeline

Backend + DevOps Assignment Submission

---

## Overview

TxnFlow is a scalable backend system that processes transaction CSV files asynchronously using Celery workers.

The system accepts transaction files, performs data cleaning and validation, detects suspicious transactions, classifies transaction categories using Gemini AI, generates AI-powered spending summaries, and stores all processed results in PostgreSQL.

The entire application is containerized using Docker and orchestrated through Docker Compose.

---

## Features

### Core Features

- CSV Transaction Upload
- Asynchronous Processing with Celery
- PostgreSQL Persistence
- Redis Message Broker
- Dockerized Deployment

### Data Processing

- Transaction Validation
- Missing Value Handling
- Date Normalization
- Duplicate Transaction Removal

### Anomaly Detection

- High Value Transaction Detection
- Currency Consistency Checks
- Merchant Spending Analysis

### AI Features

- Bulk Transaction Category Classification
- AI Generated Spending Summary
- Risk Level Assessment
- Retry Logic for LLM Calls
- Graceful Fallback When LLM Fails

### REST APIs

- Upload Transactions
- Track Job Status
- View Processed Transactions
- View Summary Results
- List Previous Jobs

---

# Architecture

```text
                    ┌─────────────────┐
                    │     Client      │
                    │ Postman / CURL  │
                    └────────┬────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │   Django REST API  │
                  └────────┬───────────┘
                           │
                  Create Processing Job
                           │
                           ▼
                 ┌─────────────────────┐
                 │      PostgreSQL     │
                 │   Jobs Metadata     │
                 └────────┬────────────┘
                          │
                          ▼
                 ┌─────────────────────┐
                 │      Celery         │
                 │ Background Worker   │
                 └────────┬────────────┘
                          │
                          ▼
                 ┌─────────────────────┐
                 │       Redis         │
                 │ Message Broker      │
                 └────────┬────────────┘
                          │
                          ▼

      ┌─────────────────────────────────────────┐
      │          Processing Pipeline            │
      ├─────────────────────────────────────────┤
      │ 1. CSV Parsing                          │
      │ 2. Data Cleaning                        │
      │ 3. Duplicate Removal                    │
      │ 4. Anomaly Detection                    │
      │ 5. Bulk LLM Classification              │
      │ 6. AI Summary Generation                │
      │ 7. Save Results                         │
      └─────────────────────────────────────────┘
                          │
                          ▼
                 ┌─────────────────────┐
                 │     PostgreSQL      │
                 │ Final Results       │
                 └─────────────────────┘
```

---

# Tech Stack

## Backend

- Python 3.13
- Django
- Django REST Framework

## Database

- PostgreSQL 17

## Task Queue

- Celery
- Redis

## AI

- Gemini 2.5 Flash

## DevOps

- Docker
- Docker Compose
- Gunicorn

---

# Project Structure

```text
TxnFlow/
│
├── flow/
│   ├── migrations/
│   ├── models.py
│   ├── serializers.py
│   ├── tasks.py
│   ├── services.py
│   ├── views.py
│   ├── urls.py
│
├── TxnFlow/
│   ├── settings.py
│   ├── celery.py
│   ├── urls.py
│   └── wsgi.py
│
├── uploads/
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── manage.py
└── README.md
```

---

# Processing Workflow

## Step 1 – Upload CSV

Client uploads transaction CSV.

Example:

```http
POST /api/jobs/upload/
```

The API immediately creates a job and returns a Job ID.

---

## Step 2 – Celery Background Processing

A Celery task is queued for processing.

The API returns immediately without blocking.

---

## Step 3 – Data Cleaning

The worker:

- Parses CSV rows
- Removes duplicate transactions
- Normalizes dates
- Handles missing values

---

## Step 4 – Anomaly Detection

The worker identifies suspicious transactions.

Examples:

- Extremely large transactions
- Abnormal merchant activity
- Currency inconsistencies

---

## Step 5 – Bulk AI Classification

Transactions are sent to Gemini in batches.

Categories:

- Food
- Shopping
- Travel
- Transport
- Utilities
- Cash Withdrawal
- Entertainment
- Other

---

## Step 6 – AI Summary Generation

Gemini generates:

- Spending narrative
- Risk assessment

Example:

```json
{
  "narrative": "Most spending occurred in food and shopping categories.",
  "risk_level": "low"
}
```

---

## Step 7 – Save Results

Processed data is stored in PostgreSQL.

---

## Step 8 – Retrieve Results

Client can query:

- Job Status
- Transactions
- Summary
- Full Results

---

# Environment Variables

Create a `.env` file:

```env
SECRET_KEY=django-secret

DEBUG=True

GEMINI_API_KEY=your_gemini_api_key

POSTGRES_DB=txnflow
POSTGRES_USER=txnflow
POSTGRES_PASSWORD=txnflow
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

---

# Running Locally

## Clone Repository

```bash
git clone https://github.com/<your-username>/txnflow.git

cd txnflow
```

---

## Create Environment File

```bash
touch .env
```

Add the variables shown above.

---

## Start Application

```bash
docker compose up --build
```

---

## Verify Containers

```bash
docker ps
```

Expected containers:

```text
txnflow-web-1
txnflow-celery-1
txnflow-db-1
txnflow-redis-1
```

---

# API Endpoints

---

## Upload CSV

### Request

```http
POST /api/jobs/upload/
```

### Form Data

```text
file: transactions.csv
```

### Response

```json
{
  "job_id": 1,
  "status": "pending"
}
```

---

## Get Job Status

### Request

```http
GET /api/jobs/1/status/
```

### Response

```json
{
  "job_id": 1,
  "status": "completed"
}
```

---

## Get Job Summary

### Request

```http
GET /api/jobs/1/summary/
```

### Response

```json
{
  "id": 1,
  "total_spend_inr": "22208.34",
  "total_spend_usd": "2536.35",
  "anomaly_count": 0,
  "risk_level": "low",
  "narrative": "Most spending occurred in shopping and food categories."
}
```

---

## Get Processed Transactions

### Request

```http
GET /api/jobs/1/transactions/
```

---

## Get Complete Results

### Request

```http
GET /api/jobs/1/results/
```

Returns:

- Job Details
- Summary
- Transactions

---

## List Jobs

### Request

```http
GET /api/jobs/
```

---

# Error Handling

The system includes:

- CSV validation
- LLM retry logic
- Fallback summary generation
- Graceful failure handling

If Gemini becomes unavailable:

```json
{
  "risk_level": "low",
  "narrative": "Fallback summary generated."
}
```

Processing continues without failing the job.

---

# Design Decisions

## Why Celery?

Transaction processing can be slow because of:

- CSV parsing
- AI calls
- Data analysis

Celery allows these operations to run asynchronously.

---

## Why Redis?

Redis provides a lightweight and fast message broker for Celery workers.

---

## Why PostgreSQL?

PostgreSQL offers:

- Reliability
- ACID compliance
- Strong relational querying

---

## Why Bulk LLM Calls?

Sending multiple transactions in a single prompt:

- Reduces API usage
- Improves performance
- Lowers latency

---

# Future Improvements

- Chunked processing for very large CSV files
- API authentication
- Rate limiting
- S3 file storage
- Kubernetes deployment
- Prometheus monitoring
- OpenTelemetry tracing
- Multi-worker autoscaling

---

# Author

Prashanth Hosamani

Backend Engineer | Python | Django | PostgreSQL | Redis | Celery | Docker