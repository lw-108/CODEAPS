"""Response caching for AI engine"""

import hashlib
import json
import time
from pathlib import Path
from typing import Optional, Dict, Any
import pickle
from collections import OrderedDict

class AICache:
    """LRU cache for AI responses with disk persistence"""
    
    def __init__(self, cache_dir: Optional[Path] = None, max_memory_items: int = 100, max_disk_size_mb: int = 500):
        if cache_dir is None:
            self.cache_dir = Path.home() / ".codeaps" / "ai_cache"
        else:
            self.cache_dir = cache_dir / "ai_cache"
            
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Memory cache (LRU)
        self.memory_cache = OrderedDict()
        self.max_memory_items = max_memory_items
        
        # Disk cache limits
        self.max_disk_size_mb = max_disk_size_mb
        self.disk_cache = {}
        self._load_disk_index()
    
    def _load_disk_index(self):
        """Load disk cache index"""
        index_file = self.cache_dir / "index.json"
        if index_file.exists():
            try:
                with open(index_file, 'r') as f:
                    self.disk_cache = json.load(f)
            except Exception:
                self.disk_cache = {}
    
    def _save_disk_index(self):
        """Save disk cache index"""
        index_file = self.cache_dir / "index.json"
        try:
            with open(index_file, 'w') as f:
                json.dump(self.disk_cache, f)
        except Exception:
            pass
    
    def _get_key(self, prompt: str, model: str, params: Dict) -> str:
        """Generate cache key"""
        content = f"{prompt}:{model}:{json.dumps(params, sort_keys=True)}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def get(self, prompt: str, model: str, params: Dict) -> Optional[str]:
        """Get cached response"""
        key = self._get_key(prompt, model, params)
        
        # Check memory cache
        if key in self.memory_cache:
            # Move to end (LRU)
            self.memory_cache.move_to_end(key)
            return self.memory_cache[key]
        
        # Check disk cache
        if key in self.disk_cache:
            cache_file = self.cache_dir / f"{key}.pkl"
            if cache_file.exists():
                try:
                    with open(cache_file, 'rb') as f:
                        response = pickle.load(f)
                    
                    # Add to memory cache
                    self._add_to_memory(key, response)
                    return response
                except Exception:
                    pass
        
        return None
    
    def set(self, prompt: str, model: str, params: Dict, response: str):
        """Cache response"""
        key = self._get_key(prompt, model, params)
        
        # Add to memory
        self._add_to_memory(key, response)
        
        # Add to disk
        cache_file = self.cache_dir / f"{key}.pkl"
        try:
            with open(cache_file, 'wb') as f:
                pickle.dump(response, f)
            
            self.disk_cache[key] = {
                'size': cache_file.stat().st_size,
                'timestamp': time.time(),
                'model': model
            }
            
            self._save_disk_index()
            self._cleanup_disk()
        except Exception:
            pass
    
    def _add_to_memory(self, key: str, response: str):
        """Add to memory cache with LRU eviction"""
        self.memory_cache[key] = response
        self.memory_cache.move_to_end(key)
        
        # Evict if too many
        if len(self.memory_cache) > self.max_memory_items:
            self.memory_cache.popitem(last=False)
    
    def _cleanup_disk(self):
        """Clean disk cache if over limit"""
        try:
            total_size = sum(item['size'] for item in self.disk_cache.values())
            total_size_mb = total_size / (1024 * 1024)
            
            if total_size_mb <= self.max_disk_size_mb:
                return
            
            # Sort by timestamp (oldest first)
            sorted_items = sorted(
                self.disk_cache.items(),
                key=lambda x: x[1]['timestamp']
            )
            
            # Remove oldest until under limit
            for key, item in sorted_items:
                if total_size_mb <= self.max_disk_size_mb:
                    break
                
                cache_file = self.cache_dir / f"{key}.pkl"
                if cache_file.exists():
                    cache_file.unlink()
                
                if key in self.disk_cache:
                    del self.disk_cache[key]
                total_size_mb -= item['size'] / (1024 * 1024)
            
            self._save_disk_index()
        except Exception:
            pass
