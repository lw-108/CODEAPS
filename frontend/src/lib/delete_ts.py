import os

try:
    os.remove('d:\\CodeAps\\frontend\\src\\lib\\languageMap.ts')
    print("Deleted languageMap.ts")
except Exception as e:
    print("Failed to delete:", e)
