import os
import chromadb
import logging
import tiktoken
from typing import List
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

class RAGIndexerService:
    def __init__(self):
        storage_path = os.path.join(os.getcwd(), "app", "storage", "vectordb")
        os.makedirs(storage_path, exist_ok=True)
        # Initialize chroma client for persistent SQLite-based edge storage
        self.chroma_client = chromadb.PersistentClient(path=storage_path)
        self.collection = self.chroma_client.get_or_create_collection(name="codeaps_workspace")
        self.tokenizer = None
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception as e:
            logger.error(f"Failed to load tiktoken: {e}")

    def _chunk_text(self, text: str, max_tokens: int = 512) -> List[str]:
        if not self.tokenizer:
            # Fallback naive chunking
            return [text[i:i+max_tokens*3] for i in range(0, len(text), max_tokens*3)]
        
        tokens = self.tokenizer.encode(text)
        chunks = []
        # Create sliding window chunks for context preservation
        overlap = 50
        step = max_tokens - overlap
        if step <= 0:
             step = max_tokens

        for i in range(0, len(tokens), step):
            chunk = tokens[i:i+max_tokens]
            chunks.append(self.tokenizer.decode(chunk))
        return chunks

    async def ingest_file(self, filepath: str, content: str):
        """Chunk a file, embed it natively via Ollama, and store in ChromaDB"""
        logger.info(f"RAG Indexing: {filepath}")
        chunks = self._chunk_text(content)
        
        ids = []
        embeddings = []
        documents = []
        metadatas = []

        for i, chunk in enumerate(chunks):
            embedding = await ollama_service.get_embeddings(chunk)
            if embedding and len(embedding) > 0:
                ids.append(f"{filepath}#chunk_{i}")
                embeddings.append(embedding)
                documents.append(chunk)
                metadatas.append({"filepath": filepath, "chunk_index": i})
        
        if len(ids) > 0:
            self.collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            logger.info(f"Successfully upserted {len(ids)} chunks for {filepath}")
    
    async def query_context(self, prompt: str, k: int = 5) -> str:
        """Fetch similar chunks from ChromaDB for deep agentic-context generation"""
        if self.collection.count() == 0:
            return ""

        embedding = await ollama_service.get_embeddings(prompt)
        if not embedding:
            return ""
            
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=k
        )
        
        context_blocks = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results and results["metadatas"] else [{}] * len(docs)
            for i, doc in enumerate(docs):
                file = metas[i].get("filepath", "Unknown") if metas[i] else "Unknown"
                context_blocks.append(f"/// File: {file} \n{doc}\n///")
                
        return "\n\n".join(context_blocks)

rag_indexer = RAGIndexerService()
