"""Small, hand-written eval corpus + queries with known-correct expectations.

Used by evaluation/runner.py to measure real retrieval/groundedness numbers
against a controlled set of documents, instead of claiming metrics without
measurement.
"""

CORPUS = [
    {
        "title": "Payment Gateway Outage Runbook",
        "content": (
            "When the payment gateway returns elevated 503 errors, first check the "
            "upstream processor status page. Restart the gateway pods if error rate "
            "exceeds 5 percent for more than 3 minutes. Escalate to the payments "
            "on-call engineer if the restart does not resolve the issue."
        ),
    },
    {
        "title": "Database Connection Pool Exhaustion",
        "content": (
            "Connection pool exhaustion on the primary Postgres instance is usually "
            "caused by long-running queries holding connections open. Check "
            "pg_stat_activity for queries running longer than 60 seconds and "
            "terminate them if they are not part of a scheduled batch job."
        ),
    },
    {
        "title": "Nightly Batch Job Failure Procedure",
        "content": (
            "If the nightly reconciliation batch job fails, check the job logs for "
            "a stack trace. Most failures are caused by malformed upstream feed "
            "files. Re-run the job with --skip-malformed after quarantining the "
            "bad records."
        ),
    },
    {
        "title": "CDN Cache Invalidation Procedure",
        "content": (
            "To invalidate stale CDN cache entries after a deployment, purge the "
            "edge cache for the affected paths using the CDN provider's purge API. "
            "Full purges should be rate-limited to avoid overwhelming the origin."
        ),
    },
    {
        "title": "Customer Data Export Request Handling",
        "content": (
            "Customer data export requests must be fulfilled within 30 days. "
            "Verify the requester's identity before generating the export, and log "
            "the request in the compliance audit trail."
        ),
    },
]

QUERIES = [
    {
        "question": "What should I do if the payment gateway is returning errors?",
        "expected_titles": ["Payment Gateway Outage Runbook"],
        "expected_keywords": ["processor", "restart", "gateway"],
        "expect_insufficient": False,
    },
    {
        "question": "The database is running out of connections, what's the cause?",
        "expected_titles": ["Database Connection Pool Exhaustion"],
        "expected_keywords": ["pg_stat_activity", "connections", "queries"],
        "expect_insufficient": False,
    },
    {
        "question": "The nightly batch job failed overnight, how do I recover it?",
        "expected_titles": ["Nightly Batch Job Failure Procedure"],
        "expected_keywords": ["malformed", "quarantine", "re-run"],
        "expect_insufficient": False,
    },
    {
        "question": "What is the company's policy on quarterly stock buybacks?",
        "expected_titles": [],
        "expected_keywords": [],
        "expect_insufficient": True,
    },
    {
        "question": "How do I configure a new office WiFi network?",
        "expected_titles": [],
        "expected_keywords": [],
        "expect_insufficient": True,
    },
]
