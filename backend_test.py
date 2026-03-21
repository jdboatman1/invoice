import requests
import sys
import json
from datetime import datetime

class InvoiceAPITester:
    def __init__(self, base_url="https://irrigation-invoice.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_invoice_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if method == 'POST' and 'id' in response_data:
                        print(f"   Created ID: {response_data['id']}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_create_invoice(self):
        """Test creating a new invoice"""
        invoice_data = {
            "customer_name": "Test Customer",
            "billing_address": "123 Test St, Dallas, TX 75001",
            "phone": "469-555-0123",
            "email": "test@example.com",
            "terms": "Due on Receipt",
            "tech": "John Smith",
            "line_items": [
                {
                    "zone": "Zone 1",
                    "description": "Sprinkler head replacement",
                    "qty": 5,
                    "rate": 25.00,
                    "amount": 125.00
                },
                {
                    "zone": "Zone 2", 
                    "description": "Valve repair",
                    "qty": 1,
                    "rate": 75.00,
                    "amount": 75.00
                }
            ],
            "subtotal": 200.00,
            "tax_rate": 8.25,
            "tax_amount": 16.50,
            "discount": 0.00,
            "total": 216.50
        }
        
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data
        )
        
        if success and 'id' in response:
            self.created_invoice_id = response['id']
            print(f"   Invoice Number: {response.get('invoice_number', 'N/A')}")
            print(f"   Total: ${response.get('total', 0):.2f}")
        
        return success

    def test_get_invoices(self):
        """Test getting all invoices"""
        success, response = self.run_test(
            "Get All Invoices",
            "GET",
            "invoices",
            200
        )
        
        if success:
            invoice_count = len(response) if isinstance(response, list) else 0
            print(f"   Found {invoice_count} invoices")
        
        return success

    def test_get_single_invoice(self):
        """Test getting a single invoice by ID"""
        if not self.created_invoice_id:
            print("❌ Skipping - No invoice ID available")
            return False
            
        success, response = self.run_test(
            "Get Single Invoice",
            "GET",
            f"invoices/{self.created_invoice_id}",
            200
        )
        
        if success:
            print(f"   Customer: {response.get('customer_name', 'N/A')}")
            print(f"   Total: ${response.get('total', 0):.2f}")
        
        return success

    def test_update_invoice(self):
        """Test updating an invoice"""
        if not self.created_invoice_id:
            print("❌ Skipping - No invoice ID available")
            return False
            
        update_data = {
            "customer_name": "Updated Customer Name",
            "total": 250.00
        }
        
        success, response = self.run_test(
            "Update Invoice",
            "PUT",
            f"invoices/{self.created_invoice_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated Customer: {response.get('customer_name', 'N/A')}")
        
        return success

    def test_payment_update(self):
        """Test updating payment status"""
        if not self.created_invoice_id:
            print("❌ Skipping - No invoice ID available")
            return False
            
        payment_data = {
            "payment_status": "paid",
            "payment_method": "cash_app"
        }
        
        success, response = self.run_test(
            "Update Payment Status",
            "POST",
            f"invoices/{self.created_invoice_id}/payment",
            200,
            data=payment_data
        )
        
        if success:
            print(f"   Payment Status: {response.get('payment_status', 'N/A')}")
            print(f"   Payment Method: {response.get('payment_method', 'N/A')}")
        
        return success

    def test_delete_invoice(self):
        """Test deleting an invoice"""
        if not self.created_invoice_id:
            print("❌ Skipping - No invoice ID available")
            return False
            
        success, response = self.run_test(
            "Delete Invoice",
            "DELETE",
            f"invoices/{self.created_invoice_id}",
            200
        )
        
        return success

    def test_get_nonexistent_invoice(self):
        """Test getting a non-existent invoice (should return 404)"""
        success, response = self.run_test(
            "Get Non-existent Invoice",
            "GET",
            "invoices/nonexistent-id",
            404
        )
        
        return success

def main():
    print("🚀 Starting AAA Irrigation Service Invoice API Tests")
    print("=" * 60)
    
    tester = InvoiceAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic API tests
    test_results.append(tester.test_api_root())
    
    # CRUD operations
    test_results.append(tester.test_create_invoice())
    test_results.append(tester.test_get_invoices())
    test_results.append(tester.test_get_single_invoice())
    test_results.append(tester.test_update_invoice())
    test_results.append(tester.test_payment_update())
    
    # Error handling
    test_results.append(tester.test_get_nonexistent_invoice())
    
    # Cleanup
    test_results.append(tester.test_delete_invoice())
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())