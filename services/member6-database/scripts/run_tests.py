import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tests.test_storage_repo import test_storage_repository_save_and_read
from tests.test_audit_log import test_audit_logging_and_diffs
from tests.test_records_api import test_api_flow

def run_all_tests():
    print("============================================================")
    print("Running Dharohar Member 6 Verification Test Suite...")
    print("============================================================")

    print("\n1. Testing Storage Repository Manager...")
    test_storage_repository_save_and_read()
    print("   [PASS] StorageRepository file and JSON operations verified!")

    print("\n2. Testing Audit Trail & Change Diff Engine...")
    test_audit_logging_and_diffs()
    print("   [PASS] AuditService logging and diff tracking verified!")

    print("\n3. Testing REST API Endpoints (Records, Audit, Dashboard)...")
    test_api_flow()
    print("   [PASS] REST API lifecycle (POST, GET, PUT, Audit, Dashboard) verified!")

    print("\n============================================================")
    print("ALL TESTS PASSED SUCCESSFULLY! (100% Verification)")
    print("============================================================")

if __name__ == "__main__":
    run_all_tests()
