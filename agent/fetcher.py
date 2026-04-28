import requests
import time

class NewsFetcher:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://newsapi.org/v2/everything"

    def fetch(self, keywords, max_articles=10):
        if not self.api_key:
            print("Error: NEWS_API_KEY not found in environment.")
            return []
            
        query = " OR ".join(keywords)
        params = {
            "q": query,
            "pageSize": max_articles,
            "apiKey": self.api_key,
            "language": "en", # Defaulting to en for broader search
            "sortBy": "publishedAt"
        }
        
        for attempt in range(2):
            try:
                response = requests.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("articles", [])
            except Exception as e:
                print(f"[-] Attempt {attempt + 1} failed: {e}")
                if attempt == 0:
                    time.sleep(1)
                    
        return []
