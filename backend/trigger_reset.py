import requests
import time

url = "https://pranaykumar2005-fras-backend.hf.space/api/admin/reset-data"

for i in range(10):
    try:
        print(f"Attempt {i+1} to reset data...")
        response = requests.post(url)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            print("Data cleared successfully!")
            break
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(5)
