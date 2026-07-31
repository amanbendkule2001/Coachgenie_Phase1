# request_context.py

from pydantic import BaseModel
from uuid import UUID
from typing import Optional


class RequestContext(BaseModel):

    request_id: str

    tenant_id: UUID

    user_id: UUID

    session_id: str | None = None

    trace_id: str | None = None

    correlation_id: str | None = None

    access_token: str | None = None