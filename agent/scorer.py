import google.generativeai as genai
import json
import re

class NewsScorer:
    def __init__(self, api_key):
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash') # Using flash for speed

    def score_articles(self, articles, keywords):
        scored_articles = []
        
        for article in articles:
            title = article.get('title', '')
            description = article.get('description', '')
            
            prompt = f"""
            Task: Score the relevance of this news article to the given keywords on a scale of 0 to 10.
            
            Keywords: {', '.join(keywords)}
            Article Title: {title}
            Article Description: {description}
            
            Return ONLY a number between 0 and 10.
            """
            
            score = 3 # Default score if AI fails
            try:
                response = self.model.generate_content(prompt)
                match = re.search(r'\d+', response.text)
                if match:
                    score = int(match.group())
            except Exception as e:
                print(f"[-] Error scoring article '{title}': {e}")
                
            article['score'] = score
            scored_articles.append(article)
            
        return scored_articles
