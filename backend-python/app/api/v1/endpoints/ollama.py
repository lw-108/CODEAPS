from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any, List
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

import base64
from app.services.ollama_service import ollama_service
from app.api import deps
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessage as ChatMessageSchema, ChatMessageCreate
from app.utils.pdf_parser import extract_text_from_pdf, is_pdf
from app.services.rag_indexer import rag_indexer
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/status")
async def check_ollama_status():
    """Check if Ollama is running and models are available"""
    return await ollama_service.check_ollama_status()

@router.post("/generate")
async def generate_code(
    prompt: str = Body(..., embed=True),
    model: Optional[str] = Body(None, embed=True),
    system_prompt: Optional[str] = Body(None, embed=True),
    temperature: float = Body(0.2, embed=True),
    max_tokens: int = Body(2048, embed=True),
    images: Optional[List[str]] = Body(None, embed=True)
):
    """Generate code using DeepSeek model"""
    result = await ollama_service.generate(
        prompt=prompt,
        model=model,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=False,
        images=images
    )
    return {
        "response": result,
        "model": model or await ollama_service._get_best_available_model()
    }

@router.post("/chat")
async def chat_with_ai(
    messages: List[Dict[str, str]] = Body(..., embed=True),
    model: Optional[str] = Body(None, embed=True),
    files: Optional[List[Dict[str, str]]] = Body(None, embed=True) # List of {filename, data (base64), type}
):
    """Chat with AI (conversation mode)"""
    images = []
    document_context = ""
    
    if files:
        for f in files:
            file_data = f.get("data", "")
            file_type = f.get("type", "")
            filename = f.get("filename", "unknown")
            
            try:
                # Decode base64
                header, encoded = file_data.split(",", 1) if "," in file_data else ("", file_data)
                binary_data = base64.b64decode(encoded)
                
                if "pdf" in file_type or is_pdf(binary_data):
                    text = extract_text_from_pdf(binary_data)
                    if text:
                        document_context += f"\n--- DOCUMENT CONTEXT: {filename} ---\n{text}\n"
                elif "image" in file_type:
                    images.append(encoded)
            except Exception as e:
                print(f"Error processing file {filename}: {e}")

    # Convert chat format to prompt
    prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
    
    if document_context:
        prompt = f"PROVIDED DOCUMENTS:\n{document_context}\n\nUSER CONVERSATION:\n{prompt}"
        
    # Agentic RAG Interception
    rag_context = await rag_indexer.query_context(prompt, k=5)
    if rag_context:
        prompt = f"CODEBASE ARCHITECTURE CONTEXT:\n{rag_context}\n\n{prompt}"
        
    prompt += "\nassistant: "
    
    if model == "deepseek-coder:6.7b": # Keep heavy model for specific requests
         model = "deepseek-coder:6.7b"
    else:
         model = "deepseek-coder:1.3b"

    async def stream_generator():
        try:
            generator = await ollama_service.generate(
                prompt=prompt,
                model=model,
                stream=True,
                images=images if images else None
            )
            # Ensure we yield immediately to tell the frontend we are alive
            yield "" 
            async for chunk in generator:
                if chunk:
                    yield chunk
        except Exception as e:
            logger.error(f"Chat Stream Error: {e}")
            yield f"Neural Link Error: {str(e)}"

    return StreamingResponse(stream_generator(), media_type="text/plain")

@router.post("/explain")
async def explain_code(
    code: str = Body(..., embed=True),
    language: str = Body("python", embed=True)
):
    """Explain code using AI"""
    prompt = f"Explain this {language} code in detail:\n\n```{language}\n{code}\n```"
    explanation = await ollama_service.generate(prompt, stream=False)
    return {"explanation": explanation}

@router.post("/optimize")
async def optimize_code(
    code: str = Body(..., embed=True),
    language: str = Body("python", embed=True),
    target: str = Body("time", embed=True),
    context: Optional[str] = Body(None, embed=True)
):
    """Optimize code for performance, security, and reliability"""
    if target == "perfect":
        prompt = (
            f"ACT as an ELITE SENIOR SOFTWARE ARCHITECT and PERFORMANCE ENGINEER.\n"
            f"TASK: REWRITE this {language} code to be EXTRAORDINARY, NEXT-LEVEL, and INDUSTRY-GRADE OPTIMIZED.\n"
            f"CONSTRAINTS:\n"
            f"- Use modern {language} best practices (e.g., C++17/20, Python 3.12+ features).\n"
            f"- Prioritize zero-cost abstractions, cache-locality, and SIMD/multi-threading where applicable.\n"
            f"- Implement robust production-grade error handling.\n"
            f"- Output ONLY the final source code.\n"
            f"STRICT DIRECTIVE: ABSOLUTELY NO explanation, NO preamble, NO bullet points, and NO text after the code block.\n"
            f"DIAGNOSTIC CONTEXT: {context or 'Focus on general architectural and performance excellence.'}\n\n"
            f"CODE TO PERFECT:\n```{language}\n{code}\n```"
        )
    else:
        prompt = (
            f"Optimize this {language} code for better {target} complexity.\n"
            f"STRICT DIRECTIVE: Output ONLY the optimized code block.\n\n"
            f"```{language}\n{code}\n```"
        )
        
    optimized = await ollama_service.generate(prompt, stream=False)
    
    # Aggressive Extraction: Find the FIRST code block and extract only its content
    if "```" in optimized:
        import re
        # Support various languages or no language tag after ```
        match = re.search(r"```(?:\w+)?\n?([\s\S]*?)(?:\n?```|$)", optimized)
        if match:
            optimized = match.group(1).strip()
        else:
            # Emergency split fallback
            parts = optimized.split("```")
            if len(parts) >= 3:
                optimized = parts[1].split("\n", 1)[-1].strip()
            elif len(parts) == 2:
                optimized = parts[1].strip()
    
    # Final Validation: If it still contains "1)" or "However" or other conversational cues, 
    # and the original code had none of that, something is wrong.
    # But we'll trust the stronger prompt for now.
            
    return {"optimized_code": optimized}


@router.post("/complete")
async def complete_code(
    prefix: str = Body(..., embed=True),
    suffix: str = Body(..., embed=True),
    model: Optional[str] = Body(None, embed=True),
    temperature: float = Body(0.0, embed=True),
    max_tokens: int = Body(64, embed=True)
):
    """Predict code completion at cursor using Fill-In-Middle (FIM)"""
    result = await ollama_service.complete_code(
        prefix=prefix,
        suffix=suffix,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens
    )
    return {"response": result}

@router.post("/pull")
async def pull_model(model: str = Body(..., embed=True)):
    """Pull a model from the Ollama library and stream progress"""
    async def event_generator():
        async for progress in ollama_service.pull_model(model):
            yield f"data: {json.dumps(progress)}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/config")
async def update_ollama_config(
    ollama_path: Optional[str] = Body(None, embed=True),
    model_dir: Optional[str] = Body(None, embed=True)
):
    """Update runtime configuration for Ollama engine"""
    ollama_service.update_config(ollama_path=ollama_path, model_dir=model_dir)
    return {"status": "success", "config": {"ollama_path": ollama_path, "model_dir": model_dir}}

@router.post("/rag/sync")
async def sync_rag_context(filepath: str = Body(..., embed=True), content: str = Body(..., embed=True)):
    """Ingest file for RAG context"""
    await rag_indexer.ingest_file(filepath, content)
    return {"status": "success", "filepath": filepath}

@router.get("/history", response_model=List[ChatMessageSchema])
async def get_chat_history(
    project_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    # current_user: User = Depends(deps.get_current_user) # Optional for now to avoid auth blockers
):
    """Retrieve chat history from the local database"""
    query = db.query(ChatMessage)
    if project_id:
        query = query.filter(ChatMessage.project_id == project_id)
    # return last 50 messages
    return query.order_by(ChatMessage.timestamp.desc()).limit(50).all()[::-1]

@router.post("/history", response_model=ChatMessageSchema)
async def save_chat_message(
    message_in: ChatMessageCreate,
    db: Session = Depends(deps.get_db),
    # current_user: User = Depends(deps.get_current_user)
):
    """Save a new chat message to the local database"""
    message = ChatMessage(
        text=message_in.text,
        sender=message_in.sender,
        project_id=message_in.project_id,
        # user_id=current_user.id
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

@router.delete("/history")
async def delete_chat_history(
    project_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
):
    """Permanently delete chat history from the local database"""
    try:
        query = db.query(ChatMessage)
        if project_id:
            query = query.filter(ChatMessage.project_id == project_id)
        query.delete(synchronize_session=False)
        db.commit()
        return {"status": "success", "message": "Neural Archive purged permanently."}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
