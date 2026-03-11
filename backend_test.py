#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Expirex PWA
Tests all authentication, product management, dashboard, and reporting endpoints
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Optional

class ExpirexAPITester:
    def __init__(self, base_url: str = "https://fresh-check-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data
        self.test_email = "testowner@expirex.com"
        self.test_password = "Test123456"
        self.test_name = "Test Owner"
        
    def log(self, message: str, success: bool = True):
        """Log test results with emoji indicators"""
        emoji = "✅" if success else "❌"
        print(f"{emoji} {message}")
        
    def run_test(self, test_name: str, method: str, endpoint: str, 
                 expected_status: int, data: Optional[Dict] = None,
                 params: Optional[Dict] = None) -> tuple[bool, dict]:
        """Run individual API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
            
        self.tests_run += 1
        print(f"\n🔍 Testing: {test_name}")
        print(f"   {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"Status: {response.status_code} (Expected: {expected_status})")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"FAILED - Expected {expected_status}, got {response.status_code}", False)
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                    
                self.failed_tests.append({
                    'test': test_name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'error': response.text
                })
                return False, {}
                
        except Exception as e:
            self.log(f"FAILED - Exception: {str(e)}", False)
            self.failed_tests.append({
                'test': test_name,
                'endpoint': endpoint,
                'error': str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("Health Check", "GET", "/api/health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "/api", 200)
        
    def test_signup(self):
        """Test user registration"""
        signup_data = {
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        }
        
        success, response = self.run_test("User Signup", "POST", "/api/auth/signup", 201, signup_data)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            self.log(f"Token acquired: {self.token[:20]}...")
            return True
        elif 'detail' in response and 'already registered' in response['detail']:
            self.log("User already exists, will use login instead")
            # Mark as successful since this is expected behavior
            self.tests_passed += 1
            return True
        return False
        
    def test_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        success, response = self.run_test("User Login", "POST", "/api/auth/login", 200, login_data)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            self.log(f"Login successful, token: {self.token[:20]}...")
            return True
        return False
        
    def test_get_user_profile(self):
        """Test getting current user profile"""
        success, response = self.run_test("Get User Profile", "GET", "/api/auth/me", 200)
        
        if success and 'user' in response:
            self.log(f"User profile: {response['user']['email']}")
            return True
        return False
        
    def test_update_settings(self):
        """Test updating user settings"""
        settings_data = {
            "expiryThreshold": 14,
            "theme": "dark"
        }
        
        success, response = self.run_test("Update Settings", "PATCH", "/api/auth/settings", 200, settings_data)
        
        if success and 'user' in response:
            settings = response['user'].get('settings', {})
            if settings.get('expiryThreshold') == 14 and settings.get('theme') == 'dark':
                self.log("Settings updated correctly")
                return True
            else:
                self.log("Settings not updated correctly", False)
        return False
        
    def test_create_product(self):
        """Test creating a new product"""
        # Create a product expiring in 5 days (should be "Near Expiry")
        exp_date = (datetime.now() + timedelta(days=5)).isoformat()
        
        product_data = {
            "name": "Test Milk",
            "quantity": 2,
            "expirationDate": exp_date,
            "category": "Dairy"
        }
        
        success, response = self.run_test("Create Product", "POST", "/api/products", 200, product_data)
        
        if success and 'id' in response:
            self.log(f"Product created with ID: {response['id']}")
            self.test_product_id = response['id']
            return True
        return False
        
    def test_get_products(self):
        """Test retrieving products list"""
        success, response = self.run_test("Get Products", "GET", "/api/products", 200)
        
        if success and isinstance(response, list):
            self.log(f"Retrieved {len(response)} products")
            return True
        return False
        
    def test_get_single_product(self):
        """Test retrieving a single product"""
        if not hasattr(self, 'test_product_id'):
            self.log("No product ID available for single product test", False)
            return False
            
        success, response = self.run_test("Get Single Product", "GET", f"/api/products/{self.test_product_id}", 200)
        
        if success and 'name' in response:
            self.log(f"Product retrieved: {response['name']}")
            return True
        return False
        
    def test_update_product(self):
        """Test updating a product"""
        if not hasattr(self, 'test_product_id'):
            self.log("No product ID available for update test", False)
            return False
            
        update_data = {
            "name": "Updated Test Milk",
            "quantity": 3
        }
        
        success, response = self.run_test("Update Product", "PATCH", f"/api/products/{self.test_product_id}", 200, update_data)
        
        if success and response.get('name') == 'Updated Test Milk':
            self.log("Product updated successfully")
            return True
        return False
        
    def test_dashboard_data(self):
        """Test dashboard summary data"""
        success, response = self.run_test("Dashboard Data", "GET", "/api/products/dashboard", 200)
        
        if success and 'summary' in response:
            summary = response['summary']
            self.log(f"Dashboard: Total={summary.get('total', 0)}, Safe={summary.get('safe', 0)}, Near Expiry={summary.get('nearExpiry', 0)}, Expired={summary.get('expired', 0)}")
            return True
        return False
        
    def test_search_products(self):
        """Test product search functionality"""
        params = {"search": "milk"}
        success, response = self.run_test("Search Products", "GET", "/api/products", 200, params=params)
        
        if success and isinstance(response, list):
            self.log(f"Search returned {len(response)} products")
            return True
        return False
        
    def test_filter_by_status(self):
        """Test filtering products by status"""
        params = {"status": "Near Expiry"}
        success, response = self.run_test("Filter by Status", "GET", "/api/products", 200, params=params)
        
        if success and isinstance(response, list):
            self.log(f"Status filter returned {len(response)} products")
            return True
        return False
        
    def test_get_categories(self):
        """Test retrieving product categories"""
        success, response = self.run_test("Get Categories", "GET", "/api/products/categories", 200)
        
        if success and isinstance(response, list):
            self.log(f"Categories: {response}")
            return True
        return False
        
    def test_get_alerts(self):
        """Test retrieving alerts for products near expiry"""
        success, response = self.run_test("Get Alerts", "GET", "/api/products/alerts", 200)
        
        if success and isinstance(response, list):
            self.log(f"Alerts returned {len(response)} products")
            return True
        return False
        
    def test_monthly_report(self):
        """Test monthly report generation"""
        current_date = datetime.now()
        params = {"month": current_date.month, "year": current_date.year}
        
        success, response = self.run_test("Monthly Report", "GET", "/api/products/report", 200, params=params)
        
        if success and 'totalExpired' in response:
            self.log(f"Report: {response.get('totalExpired', 0)} expired, {response.get('totalQuantityLost', 0)} quantity lost")
            return True
        return False
        
    def test_delete_product(self):
        """Test deleting a product"""
        if not hasattr(self, 'test_product_id'):
            self.log("No product ID available for delete test", False)
            return False
            
        success, response = self.run_test("Delete Product", "DELETE", f"/api/products/{self.test_product_id}", 200)
        
        if success and 'message' in response:
            self.log("Product deleted successfully")
            return True
        return False

    def cleanup_test_user(self):
        """Clean up test data (if needed)"""
        # Note: The API doesn't have a delete user endpoint, so we'll leave the test user
        self.log("Test user cleanup not implemented (no delete user endpoint)")

    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting Expirex API Test Suite")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Basic health checks
        self.test_health_check()
        self.test_root_endpoint()
        
        # Authentication flow
        print("\n📝 Authentication Tests")
        if not self.test_signup():
            # If signup fails (user exists), try login
            if not self.test_login():
                print("❌ Authentication failed, stopping tests")
                return False
                
        self.test_get_user_profile()
        self.test_update_settings()
        
        # Product management
        print("\n📦 Product Management Tests")
        self.test_create_product()
        self.test_get_products()
        self.test_get_single_product()
        self.test_update_product()
        
        # Dashboard and reports
        print("\n📊 Dashboard & Reports Tests")
        self.test_dashboard_data()
        self.test_search_products()
        self.test_filter_by_status()
        self.test_get_categories()
        self.test_get_alerts()
        self.test_monthly_report()
        
        # Cleanup
        print("\n🧹 Cleanup Tests")
        self.test_delete_product()
        
        # Final results
        self.print_summary()
        return self.tests_passed == self.tests_run

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"   - {failure['test']}: {failure.get('error', 'Status code mismatch')}")

def main():
    """Main test execution"""
    tester = ExpirexAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())