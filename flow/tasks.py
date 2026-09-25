import json
from decimal import Decimal
import time
import pandas as pd
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from google import genai
from .models import (Job, Transaction, JobSummary)


def get_gemini_client():

    return genai.Client(
        api_key=settings.GEMINI_API_KEY
    )

def classify_categories(rows):

    if not rows:
        return []

    prompt = f"""
Classify each transaction into one of:

Food
Shopping
Travel
Transport
Utilities
Cash Withdrawal
Entertainment
Other

Return ONLY a JSON array.

Example:

[
    "Food",
    "Shopping",
    "Travel"
]

Transactions:

{json.dumps(rows)}
"""

    for attempt in range(3):

        try:

            client = get_gemini_client()

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            text = response.text.strip()

            text = (
                text
                .replace("```json", "")
                .replace("```", "")
                .strip()
            )

            result = json.loads(text)

            if not isinstance(result, list):

                raise ValueError(
                    "Gemini did not return a list"
                )

            if len(result) != len(rows):

                raise ValueError(
                    "Category count mismatch"
                )

            return result

        except Exception as e:

            print(
                f"Classification attempt {attempt + 1} failed: {e}"
            )

            if attempt < 2:

                time.sleep(
                    2 ** attempt
                )

            else:

                return [
                    "Other"
                    for _ in rows
                ]

def generate_summary(summary_data):

    prompt = f"""
Return ONLY valid JSON.

Format:

{{
    "narrative": "2-3 sentence summary",
    "risk_level": "low"
}}

Data:

{json.dumps(summary_data)}
"""

    for attempt in range(3):

        try:

            client = get_gemini_client()

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            text = response.text.strip()

            text = (
                text
                .replace("```json", "")
                .replace("```", "")
                .strip()
            )

            result = json.loads(text)

            if not isinstance(result, dict):

                raise ValueError(
                    "Gemini did not return JSON object"
                )

            if "narrative" not in result:

                raise ValueError(
                    "Missing narrative field"
                )

            if "risk_level" not in result:

                raise ValueError(
                    "Missing risk_level field"
                )

            return result

        except Exception as e:

            print(
                f"Summary attempt {attempt + 1} failed: {e}"
            )

            if attempt < 2:

                time.sleep(
                    2 ** attempt
                )

            else:

                anomaly_count = summary_data.get(
                    "anomaly_count",
                    0
                )

                risk_level = "low"

                if anomaly_count >= 5:

                    risk_level = "high"

                elif anomaly_count >= 2:

                    risk_level = "medium"

                return {

                    "narrative":
                        (
                            f"Processed transaction data with "
                            f"{anomaly_count} detected anomalies. "
                            f"AI summary generation was unavailable, "
                            f"so a fallback summary was generated."
                        ),

                    "risk_level":
                        risk_level
                }


@shared_task
def process_job(job_id):

    try:

        job = Job.objects.get(
            id=job_id
        )

        job.status = "PROCESSING"
        job.save()

        import os
        ext = os.path.splitext(job.file.name)[1].lower()
        if ext in ['.xls', '.xlsx']:
            df = pd.read_excel(job.file.path)
        else:
            try:
                df = pd.read_csv(job.file.path, encoding="utf-8")
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(job.file.path, encoding="ISO-8859-1")
                except UnicodeDecodeError:
                    df = pd.read_csv(job.file.path, encoding="cp1252")

        # Bank statements often have metadata rows at the top. Dynamically find the real header row.
        current_cols = " ".join([str(c).lower() for c in df.columns])
        header_idx = None
        if not any(x in current_cols for x in ['date', 'amount', 'debit', 'txn', 'transaction']):
            for i in range(min(20, len(df))):
                row_str = " ".join([str(x).lower() for x in df.iloc[i].values])
                if any(x in row_str for x in ['date', 'amount', 'debit', 'txn', 'transaction']) and any(x in row_str for x in ['balance', 'ref', 'details', 'particulars', 'credit']):
                    header_idx = i
                    break
        if header_idx is not None:
            new_cols = df.iloc[header_idx]
            df = df.iloc[header_idx+1:].reset_index(drop=True)
            df.columns = new_cols

        # Normalize column names: lowercase, strip whitespace, replace spaces/dashes/dots with underscores
        df.columns = df.columns.astype(str).str.lower().str.strip().str.replace(' ', '_').str.replace('-', '_').str.replace('.', '')

        # Map common aliases to our required schema
        column_map = {
            'transactionid': 'txn_id',
            'transaction_id': 'txn_id',
            'id': 'txn_id',
            'transactiondate': 'date',
            'transaction_date': 'date',
            'datetime': 'date',
            'customerid': 'account_id',
            'customer_id': 'account_id',
            'client_id': 'account_id',
            'accountid': 'account_id',
            'totalvalue': 'amount',
            'total_value': 'amount',
            'price': 'amount',
            'value': 'amount',
            'cost': 'amount',
            'vendor': 'merchant',
            'merchant_name': 'merchant',
            'ref_no': 'txn_id',
            'details': 'merchant',
            'particulars': 'merchant'
        }
        df = df.rename(columns=column_map)
        
        # Drop duplicate columns (e.g. if both 'TotalValue' and 'Price' mapped to 'amount')
        df = df.loc[:, ~df.columns.duplicated()]

        # Handle Debit/Credit columns if Amount is missing
        if 'amount' not in df.columns:
            if 'debit' in df.columns and 'credit' in df.columns:
                df['amount'] = df['debit'].fillna(df['credit'])

        # Handle missing account_id (often found in dropped metadata)
        if 'account_id' not in df.columns:
            df['account_id'] = 'ACT-0000'

        # Default currency to INR if not specified
        if 'currency' not in df.columns:
            df['currency'] = 'INR'
        else:
            df['currency'] = df['currency'].fillna('INR')

        job.row_count = len(df)

        required_columns = [
            "txn_id",
            "date",
            "amount",
            "account_id"
        ]

        missing_columns = [

            column

            for column in required_columns

            if column not in df.columns

        ]

        if missing_columns:

            raise ValueError(
                "This doesn't look like a valid financial transactions file. "
                f"We couldn't find columns for: {', '.join(missing_columns)}."
            )

        if "txn_id" in df.columns:

            df = df.drop_duplicates(
                subset=["txn_id"]
            )

        else:

            df = df.drop_duplicates()

        if "amount" in df.columns:

            df["amount"] = (

                df["amount"]

                .astype(str)

                .str.replace(
                    r"[^\d.-]",
                    "",
                    regex=True
                )

                .str.strip()
            )

            df["amount"] = pd.to_numeric(
                df["amount"],
                errors="coerce"
            )

        if "date" in df.columns:

            df["date"] = pd.to_datetime(
                df["date"],
                errors="coerce",
                dayfirst=True,
                format="mixed"
            )

        if "status" in df.columns:

            df["status"] = (

                df["status"]

                .astype(str)

                .str.upper()

                .str.strip()
            )

        if "currency" in df.columns:

            df["currency"] = (

                df["currency"]

                .astype(str)

                .str.upper()

                .str.strip()
            )

        if "category" in df.columns:

            df["category"] = (

                df["category"]

                .fillna("Uncategorised")

                .astype(str)

                .str.strip()
            )

        else:

            df["category"] = "Uncategorised"

        df_clean = df.dropna(
            subset=[
                "txn_id",
                "date",
                "amount",
                "account_id"
            ]
        )

        # SAFETY LIMIT FOR FREE TIER: Cap at 1000 rows to prevent OOM
        if len(df_clean) > 1000:
            df_clean = df_clean.head(1000)

        job.row_count_clean = len(
            df_clean
        )

        job.save()

        # Optimize LLM calls by only classifying UNIQUE merchants
        unique_merchants_set = set()
        for _, row in df_clean.iterrows():
            category = row.get("category")
            if pd.isna(category) or category == "" or category == "Uncategorised":
                merchant_val = str(row.get("merchant", "")).strip()
                if merchant_val:
                    unique_merchants_set.add(merchant_val)
                    
        unique_merchants_list = list(unique_merchants_set)
        
        # Don't call LLM if there's nothing to classify
        merchant_category_map = {}
        if unique_merchants_list:
            # Chunk into batches of 50 to prevent massive memory spikes and Gemini limits
            chunk_size = 50
            for i in range(0, len(unique_merchants_list), chunk_size):
                chunk = unique_merchants_list[i:i + chunk_size]
                rows_for_llm = [{"merchant": m} for m in chunk]
                
                llm_categories = classify_categories(rows_for_llm)
                
                for j, m in enumerate(chunk):
                    if j < len(llm_categories):
                        merchant_category_map[m] = llm_categories[j]

        account_medians = (

            df_clean

            .groupby("account_id")[
                "amount"
            ]

            .median()

            .to_dict()
        )

        domestic_merchants = {

            "SWIGGY",
            "OLA",
            "IRCTC"
        }

        transaction_objects = []

        for _, row in df_clean.iterrows():

            amount = float(
                row["amount"]
            )

            is_anomaly = False

            anomaly_reasons = []

            if amount <= 0:

                is_anomaly = True

                anomaly_reasons.append(
                    "Invalid amount"
                )

            account_id = row.get(
                "account_id"
            )

            median_amount = (

                account_medians.get(
                    account_id,
                    amount
                )
            )

            if amount > (

                median_amount * 3

            ):

                is_anomaly = True

                anomaly_reasons.append(
                    f"Amount exceeds 3x median ({median_amount})"
                )

            try:

                txn_date = (
                    pd.to_datetime(
                        row["date"]
                    )
                    .date()
                )

                if (

                    txn_date
                    >
                    timezone.now().date()

                ):

                    is_anomaly = True

                    anomaly_reasons.append(
                        "Future transaction date"
                    )

            except Exception:

                pass

            merchant = str(
                row.get(
                    "merchant",
                    ""
                )
            ).upper()

            currency = str(
                row.get(
                    "currency",
                    ""
                )
            ).upper()

            if (

                currency == "USD"

                and merchant in domestic_merchants

            ):

                is_anomaly = True

                anomaly_reasons.append(
                    "Domestic merchant with USD transaction"
                )

            anomaly_reason = (

                ", ".join(
                    anomaly_reasons
                )

                if anomaly_reasons

                else None
            )

            current_category = row.get("category")

            llm_category = None
            llm_raw_response = None
            llm_failed = False

            if pd.isna(current_category) or current_category == "" or current_category == "Uncategorised":
                merchant_val = str(row.get("merchant", "")).strip()
                
                if merchant_val in merchant_category_map:
                    llm_category = merchant_category_map[merchant_val]
                    current_category = llm_category
                    llm_raw_response = json.dumps(llm_category)
                else:
                    llm_failed = True
                    current_category = "Other"

            transaction_objects.append(

                Transaction(

                    job=job,

                    txn_id=row.get(
                        "txn_id"
                    ),

                    date=row.get(
                        "date"
                    ),

                    merchant=row.get(
                        "merchant"
                    ),

                    amount=Decimal(
                        str(amount)
                    ),

                    currency=row.get(
                        "currency"
                    ),

                    status=str(row.get("status", "SUCCESS")) if pd.notna(row.get("status")) and row.get("status") != "" else "SUCCESS",

                    category=current_category,

                    account_id=row.get(
                        "account_id"
                    ),

                    is_anomaly=is_anomaly,

                    anomaly_reason=anomaly_reason,

                    llm_category=llm_category,

                    llm_raw_response=llm_raw_response,

                    llm_failed=llm_failed
                )
            )

        Transaction.objects.bulk_create(
            transaction_objects,
            batch_size=1000
        )

        transactions = (
            Transaction.objects.filter(
                job=job
            )
        )

        total_spend_inr = sum(

            float(t.amount)

            for t in transactions

            if str(
                t.currency
            ).upper() == "INR"
        )

        total_spend_usd = sum(

            float(t.amount)

            for t in transactions

            if str(
                t.currency
            ).upper() == "USD"
        )

        merchant_totals = {}

        for transaction in transactions:

            merchant = str(
                transaction.merchant
                or "Unknown"
            ).strip()

            merchant_totals[
                merchant
            ] = (

                merchant_totals.get(
                    merchant,
                    0
                )

                + float(
                    transaction.amount
                )
            )

        top_merchants = sorted(

            merchant_totals.items(),

            key=lambda item: item[1],

            reverse=True

        )[:3]

        anomaly_count = (
            transactions.filter(
                is_anomaly=True
            ).count()
        )

        summary_input = {

            "total_spend_inr":
                total_spend_inr,

            "total_spend_usd":
                total_spend_usd,

            "top_merchants":
                top_merchants,

            "anomaly_count":
                anomaly_count
        }

        llm_summary = generate_summary(
            summary_input
        )

        JobSummary.objects.create(

            job=job,

            total_spend_inr=
                total_spend_inr,

            total_spend_usd=
                total_spend_usd,

            top_merchants=
                top_merchants,

            anomaly_count=
                anomaly_count,

            narrative=
                llm_summary.get(
                    "narrative",
                    ""
                ),

            risk_level=
                llm_summary.get(
                    "risk_level",
                    "medium"
                )
        )

        job.status = "COMPLETED"
        job.save()

    except Exception as e:

        try:

            job = Job.objects.get(
                id=job_id
            )

            job.status = "FAILED"
            job.error_message = str(e)
            job.save()

        except Exception:

            pass

        print(
            f"PROCESSING ERROR: {e}"
        )

        raise