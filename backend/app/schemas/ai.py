from pydantic import BaseModel
from typing import List, Optional

class Message(BaseModel):
    role: str
    content: str

class AskQuestionRequest(BaseModel):
    question: str
    history: Optional[List[Message]] = []

class AskQuestionResponse(BaseModel):
    answer: str
    sources: List[str]
    dataset_id: int
