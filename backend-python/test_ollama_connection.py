import asyncio
import aiohttp
import json

async def test_ollama():
    """Quick test script to verify CodeAps AI connection"""
    
    print("=" * 40)
    print("   CodeAps: AI Connectivity Diagnostic")
    print("=" * 40)
    
    # Test 1: Check if Ollama is running
    print("\n[1/2] Checking Ollama status...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:11434/api/tags") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    models = [m['name'] for m in data.get('models', [])]
                    print("✅ Ollama is running")
                    print(f"📦 Available models: {models}")
                else:
                    print(f"❌ Ollama error: {resp.status}")
                    return
    except Exception as e:
        print(f"❌ Cannot connect to Ollama: {e}")
        print("   Solution: Run 'ollama serve' in a new terminal.")
        return
    
    # Test 2: Test DeepSeek model
    print("\n[2/2] Testing DeepSeek model...")
    model_name = "deepseek-coder:6.7b"
    
    payload = {
        "model": model_name,
        "prompt": "Write a Python function to calculate factorial",
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post("http://localhost:11434/api/generate", json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print(f"✅ {model_name} is producing responses!")
                    print("\n📝 Sample Output:")
                    print("-" * 20)
                    print(data.get("response", "")[:200] + "...")
                    print("-" * 20)
                else:
                    print(f"❌ Model test failed: {resp.status}")
                    print(f"   Note: Ensure you have run 'ollama pull {model_name}'")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_ollama())
