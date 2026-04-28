import google.generativeai as genai

class NewsSummarizer:
    def __init__(self, api_key):
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def summarize_articles(self, articles, lang="ko"):
        summarized_articles = []
        
        for article in articles:
            content = article.get('description', '') or article.get('content', '')
            title = article.get('title', '')
            
            prompt = f"""
            Task: Summarize this news article professionally in {lang}.
            
            Title: {title}
            Content: {content}
            
            Output format: A concise 2-3 sentence summary.
            """
            
            try:
                response = self.model.generate_content(prompt)
                summary = response.text.strip()
            except Exception as e:
                print(f"[-] Error summarizing article '{title}': {e}")
                summary = "요약을 생성할 수 없습니다." if lang == "ko" else "Summary could not be generated."
                
            article['summary'] = summary
            summarized_articles.append(article)
            
        return summarized_articles
