from pydantic import BaseModel
from typing import List

class AskQuestionRequest(BaseModel):
    question: str

class AskQuestionResponse(BaseModel):
    answer: str
    sources: List[str]
    dataset_id: int
