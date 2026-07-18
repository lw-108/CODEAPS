"""Centralized prompt templates for all AI operations"""

class PromptTemplates:
    """Collection of all prompts used by the AI engine"""
    
    LEETCODE_SYSTEM = """You are an expert competitive programmer. Generate optimal solutions with:
    - Best possible time complexity
    - Clean, readable code
    - Handle edge cases
    - Include complexity analysis
    - Show multiple approaches when relevant"""
    
    LEETCODE_USER = """
    Problem: {problem}
    Difficulty: {difficulty}
    Language: {language}
    
    Generate an optimal solution with:
    1. Approach explanation (2-3 sentences)
    2. Time complexity with explanation
    3. Space complexity with explanation
    4. The code with comments
    5. Key insight (1 sentence)
    
    Also generate 1-2 alternative approaches briefly.
    """
    
    PRODUCTION_SYSTEM = """You are an expert software engineer. Generate production-ready code with:
    - Error handling
    - Logging
    - Input validation
    - Type hints
    - Documentation
    - Unit tests
    - Security best practices"""
    
    PRODUCTION_USER = """
    Requirement: {requirement}
    Language: {language}
    Framework: {framework}
    
    Generate production-ready code with:
    1. Main implementation with error handling
    2. Input validation
    3. Logging statements
    4. Type hints
    5. Docstrings
    6. Unit tests (pytest/unittest)
    7. Example usage
    
    Include comments explaining security considerations.
    """
    
    EDUCATIONAL_SYSTEM = """You are an expert programming teacher. Explain concepts step-by-step with:
    - Simple analogies
    - Visual ASCII diagrams
    - Common mistakes
    - Practice exercises
    - Progressive difficulty"""
    
    EDUCATIONAL_USER = """
    Topic: {topic}
    Level: {level} (beginner/intermediate/advanced)
    Language: {language}
    
    Create an educational explanation with:
    1. Simple analogy
    2. Visual ASCII diagram
    3. Step-by-step code breakdown
    4. Common mistakes to avoid
    5. Practice exercises (3 levels)
    6. Key takeaways
    
    Make it engaging and easy to understand.
    """
    
    OPTIMIZE_TIME_SYSTEM = """You are an expert at optimizing code for time complexity. Analyze and improve:
    - Reduce nested loops
    - Use appropriate data structures
    - Add early termination
    - Cache results
    - Use built-in optimized functions"""
    
    OPTIMIZE_TIME_USER = """
    Original code:
    {code}
    
    Language: {language}
    
    Optimize for time complexity. Show:
    1. Complexity analysis of original
    2. Optimization strategy
    3. Optimized code
    4. New complexity analysis
    5. Performance comparison
    
    Explain each optimization.
    """
    
    OPTIMIZE_SPACE_USER = """
    Original code:
    {code}
    
    Language: {language}
    
    Optimize for space complexity. Show:
    1. Space analysis of original
    2. In-place techniques used
    3. Optimized code
    4. New space complexity
    5. Trade-offs (if any)
    """
    
    EXPLAIN_CODE_USER = """
    Code:
    {code}
    
    Language: {language}
    
    Explain this code for a {level} learner:
    1. What it does (simple terms)
    2. How it works (step-by-step)
    3. Key concepts used
    4. Complexity analysis
    5. Possible improvements
    """
