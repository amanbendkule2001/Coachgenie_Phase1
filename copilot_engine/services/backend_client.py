# NEW CODE

# copilot_engine/services/backend_client.py

from __future__ import annotations

import logging
from typing import Any, Optional
from urllib.parse import urljoin

import httpx

from copilot_engine.core.config import settings

from copilot_engine.schemas.request_context import RequestContext

logger = logging.getLogger(__name__)


class BackendClient:
    """
    Enterprise Backend API Client.

    This class is the ONLY communication layer between
    the Copilot Engine and the from copilot_engine.services.backend_client import (
    BackendClient,
)

from copilot_engine.schemas.request_context import (
    RequestContext,
)

    Responsibilities
    ----------------
    • Connection Pooling
    • Request Execution
    • Authentication
    • Tenant Isolation
    • Retry Logic
    • Response Parsing
    • Error Mapping
    • Streaming
    • File Uploads
    • Downloads
    • Request Tracing
    """

    # ==========================================================
    # DEFAULT CONFIGURATION
    # ==========================================================

    DEFAULT_TIMEOUT = 30.0

    DEFAULT_CONNECT_TIMEOUT = 10.0

    DEFAULT_READ_TIMEOUT = 30.0

    DEFAULT_WRITE_TIMEOUT = 30.0

    DEFAULT_POOL_TIMEOUT = 10.0

    MAX_CONNECTIONS = 100

    MAX_KEEPALIVE_CONNECTIONS = 20

    # ==========================================================
    # SINGLETON HTTP CLIENT
    # ==========================================================

    _client: httpx.AsyncClient | None = None

    # ==========================================================
    # INITIALIZATION
    # ==========================================================

    def __init__(
        self,
        *,
        base_url: str | None = None,
        timeout: float | None = None,
    ) -> None:

        self.base_url = (
            base_url
            or settings.BACKEND_API_BASE_URL
        ).rstrip("/")

        self.timeout = (
            timeout
            or self.DEFAULT_TIMEOUT
        )

    # ==========================================================
    # CLIENT
    # ==========================================================

    @classmethod
    def get_client(
        cls,
    ) -> httpx.AsyncClient:
        """
        Returns a singleton AsyncClient.

        Reusing one client dramatically improves
        performance by keeping TCP connections alive.
        """

        if cls._client is None:

            timeout = httpx.Timeout(

                timeout=cls.DEFAULT_TIMEOUT,

                connect=cls.DEFAULT_CONNECT_TIMEOUT,

                read=cls.DEFAULT_READ_TIMEOUT,

                write=cls.DEFAULT_WRITE_TIMEOUT,

                pool=cls.DEFAULT_POOL_TIMEOUT,
            )

            limits = httpx.Limits(

                max_connections=cls.MAX_CONNECTIONS,

                max_keepalive_connections=(
                    cls.MAX_KEEPALIVE_CONNECTIONS
                ),
            )

            cls._client = httpx.AsyncClient(

                timeout=timeout,

                limits=limits,

                follow_redirects=True,
            )

            logger.info(
                "Backend AsyncClient initialized."
            )

        return cls._client

    # ==========================================================
    # SHUTDOWN
    # ==========================================================

    @classmethod
    async def close(cls) -> None:
        """
        Close the shared AsyncClient.

        Call this during FastAPI shutdown.
        """

        if cls._client:

            await cls._client.aclose()

            cls._client = None

            logger.info(
                "Backend AsyncClient closed."
            )

    # ==========================================================
    # URL BUILDER
    # ==========================================================

    def _build_url(
        self,
        endpoint: str,
        path_params: dict[str, Any] | None = None,
    ) -> str:
        """
        Builds the final request URL.

        Example

        endpoint:
            /students/{student_id}

        path_params:
            {"student_id": 25}

        Result

        /students/25
        """

        endpoint = endpoint.lstrip("/")

        if path_params:

            endpoint = endpoint.format(
                **path_params,
            )

        return urljoin(
            f"{self.base_url}/",
            endpoint,
        )

    # ==========================================================
    # TIMEOUT
    # ==========================================================

    def _build_timeout(
        self,
        timeout: float | None,
    ) -> float:

        return timeout or self.timeout
    
    # ==========================================================
    # PUBLIC HTTP METHODS
    # ==========================================================

    async def get(
        self,
        *,
        endpoint: str,
        request_context,
        path_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """
        Execute HTTP GET request.
        """

        return await self._request(

            method="GET",

            endpoint=endpoint,

            request_context=request_context,

            path_params=path_params,

            query_params=query_params,

            timeout=timeout,
        )

    async def post(
        self,
        *,
        endpoint: str,
        request_context,
        payload: dict[str, Any] | None = None,
        path_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """
        Execute HTTP POST request.
        """

        return await self._request(

            method="POST",

            endpoint=endpoint,

            request_context=request_context,

            path_params=path_params,

            query_params=query_params,

            json_payload=payload,

            timeout=timeout,
        )

    async def put(
        self,
        *,
        endpoint: str,
        request_context,
        payload: dict[str, Any] | None = None,
        path_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """
        Execute HTTP PUT request.
        """

        return await self._request(

            method="PUT",

            endpoint=endpoint,

            request_context=request_context,

            path_params=path_params,

            query_params=query_params,

            json_payload=payload,

            timeout=timeout,
        )

    async def patch(
        self,
        *,
        endpoint: str,
        request_context,
        payload: dict[str, Any] | None = None,
        path_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """
        Execute HTTP PATCH request.
        """

        return await self._request(

            method="PATCH",

            endpoint=endpoint,

            request_context=request_context,

            path_params=path_params,

            query_params=query_params,

            json_payload=payload,

            timeout=timeout,
        )

    async def delete(
        self,
        *,
        endpoint: str,
        request_context,
        path_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """
        Execute HTTP DELETE request.
        """

        return await self._request(

            method="DELETE",

            endpoint=endpoint,

            request_context=request_context,

            path_params=path_params,

            query_params=query_params,

            timeout=timeout,
        )

    # ==========================================================
    # FILE UPLOAD
    # ==========================================================

    async def upload(
        self,
        *,
        endpoint: str,
        request_context,
        files: dict[str, Any],
        payload: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """
        Upload multipart/form-data.
        """

        return await self._request(

            method="POST",

            endpoint=endpoint,

            request_context=request_context,

            files=files,

            form_data=payload,

            timeout=timeout,
        )

    # ==========================================================
    # FILE DOWNLOAD
    # ==========================================================

    async def download(
        self,
        *,
        endpoint: str,
        request_context,
        path_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> bytes:
        """
        Download binary response.

        Example:
            PDF
            Excel
            CSV
            ZIP
        """

        return await self._request(

            method="GET",

            endpoint=endpoint,

            request_context=request_context,

            path_params=path_params,

            query_params=query_params,

            timeout=timeout,

            raw_response=True,
        )

    # ==========================================================
    # STREAMING
    # ==========================================================

    async def stream(
        self,
        *,
        endpoint: str,
        request_context,
        payload: dict[str, Any],
        timeout: float | None = None,
    ):
        """
        Stream responses from from copilot_engine.services.backend_client import (
    BackendClient,
)

from copilot_engine.schemas.request_context import (
    RequestContext,
)

        Used for AI chat,
        SSE,
        token streaming.
        """

        return await self._request(

            method="POST",

            endpoint=endpoint,

            request_context=request_context,

            json_payload=payload,

            timeout=timeout,

            stream=True,
        )
        
    # ==========================================================
    # CORE REQUEST ENGINE
    # ==========================================================

    async def _request(
        self,
        *,
        method: str,
        endpoint: str,
        request_context,
        path_params: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
        json_payload: dict[str, Any] | None = None,
        form_data: dict[str, Any] | None = None,
        files: dict[str, Any] | None = None,
        timeout: float | None = None,
        raw_response: bool = False,
        stream: bool = False,
    ) -> Any:
        """
        Core request execution engine.

        Every public HTTP method eventually
        reaches this function.
        """

        url = self._build_url(
            endpoint,
            path_params,
        )

        request_timeout = self._build_timeout(
            timeout,
        )

        headers = self._build_headers(
            request_context=request_context,
        )

        client = self.get_client()

        self._log_request(

            method=method,

            url=url,

            request_context=request_context,
        )

        try:

            response = await client.request(

                method=method,

                url=url,

                headers=headers,

                params=query_params,

                json=json_payload,

                data=form_data,

                files=files,

                timeout=request_timeout,
            )

            self._validate_response(
                response=response,
                request_context=request_context,
            )

            self._log_response(

                method=method,

                url=url,

                response=response,

                request_context=request_context,
            )

            if stream:

                return response

            if raw_response:

                return response.content

            return self._parse_response(
                response,
            )

        except Exception as exc:

            self._log_failure(

                method=method,

                url=url,

                exception=exc,

                request_context=request_context,
            )

            raise self._map_exception(
                exc,
                endpoint,
            )
    
        # ==========================================================
    # RESPONSE VALIDATION
    # ==========================================================

    def _validate_response(
        self,
        response: httpx.Response,
    ) -> None:

        if response.is_success:
            return

        status = response.status_code

        logger.warning(
            "Backend request failed",
            extra={
                "status_code": status,
                "response": response.text,
            },
        )

        if status == 401:

            raise BackendAuthenticationError(
                "Backend authentication failed."
            )

        if status == 403:

            raise BackendAuthorizationError(
                "Backend authorization failed."
            )

        if status == 404:

            raise BackendResponseError(
                "Requested resource not found."
            )

        if status >= 500:

            raise BackendResponseError(
                "Backend internal server error."
            )

        response.raise_for_status()

    # ==========================================================
    # RESPONSE PARSER
    # ==========================================================

    @staticmethod
    def _parse_response(
        response: httpx.Response,
    ) -> dict[str, Any] | list[Any]:

        if not response.content:
            return {}

        try:

            return response.json()

        except Exception:

            return {
                "message": response.text
            }

    # ==========================================================
    # HEADER BUILDER
    # ==========================================================

    def _build_headers(
        self,
        request_context: RequestContext,
        *,
        content_type: str = "application/json",
        accept: str = "application/json",
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, str]:
        """
        Build standardized HTTP headers for backend requests.

        Includes:
        • Standard HTTP headers
        • Multi-tenancy
        • Authentication
        • Observability
        • Custom headers
        """

        headers: dict[str, str] = {

            # ==========================================
            # Standard Headers
            # ==========================================

            "Accept": accept,
            "Content-Type": content_type,
        }

        # ==========================================
        # Multi-Tenancy
        # ==========================================

        if request_context.tenant_id:
            headers["X-Tenant-ID"] = str(
                request_context.tenant_id
            )

        if request_context.user_id:
            headers["X-User-ID"] = str(
                request_context.user_id
            )

        # ==========================================
        # Authentication
        # ==========================================

        token = getattr(
            request_context,
            "access_token",
            None,
        )

        if token:
            headers["Authorization"] = (
                f"Bearer {token}"
            )

        # ==========================================
        # Observability
        # ==========================================

        self._add_observability_headers(
            headers=headers,
            request_context=request_context,
        )

        # ==========================================
        # Custom Headers
        # ==========================================

        if extra_headers:
            headers.update(extra_headers)

        return headers

    # ==========================================================
    # OBSERVABILITY HEADERS
    # ==========================================================

    def _add_observability_headers(
        self,
        *,
        headers: dict[str, str],
        request_context: RequestContext,
    ) -> None:
        """
        Add observability and distributed tracing headers.
        """

        if request_context.request_id:
            headers["X-Request-ID"] = (
                request_context.request_id
            )

        if getattr(
            request_context,
            "trace_id",
            None,
        ):
            headers["X-Trace-ID"] = (
                request_context.trace_id
            )

        if getattr(
            request_context,
            "correlation_id",
            None,
        ):
            headers["X-Correlation-ID"] = (
                request_context.correlation_id
            )

        if getattr(
            request_context,
            "session_id",
            None,
        ):
            headers["X-Session-ID"] = (
                request_context.session_id
            )

        headers["X-Client"] = (
            settings.APP_NAME
        )

        headers["X-Client-Version"] = (
            settings.APP_VERSION
        )

        headers["X-Service"] = (
            "copilot-engine"
        )

    # ==========================================================
    # URL BUILDER
    # ==========================================================

    def _build_url(
        self,
        endpoint: str,
    ) -> str:

        endpoint = endpoint.lstrip("/")

        return (
            f"{self.base_url}/{endpoint}"
        )        

# # copilot_engine/services/backend_client.py

# from __future__ import annotations

# import logging
# from typing import Any, Optional

# import httpx

# from copilot_engine.core.config import settings

# from copilot_engine.schemas.request_context import RequestContext

# from copilot_engine.exceptions.backend_exceptions import (
#     BackendClientError,
#     BackendAuthenticationError,
#     BackendAuthorizationError,
#     BackendTimeoutError,
#     BackendConnectionError,
#     BackendResponseError,
# )

# logger = logging.getLogger(__name__)


# class BackendClient:
#     """
#     Enterprise-grade backend API client.

#     Responsibilities:
#     - Centralized API communication
#     - Request tracing
#     - Authentication headers
#     - Timeout management
#     - Retry-safe request handling
#     - Structured observability
#     - Response normalization

#     IMPORTANT:
#     This class is the ONLY layer
#     allowed to communicate with backend APIs.
#     """

#     def __init__(
#         self,
#         base_url: Optional[str] = None,
#         timeout: float = 10.0,
#     ) -> None:

#         self.base_url = (
#             base_url
#             or settings.BACKEND_API_BASE_URL
#         )

#         self.timeout = timeout

#     # ==========================================================
#     # PUBLIC HTTP METHODS
#     # ==========================================================

#     async def get(
#         self,
#         endpoint: str,
#         request_context: RequestContext,
#         timeout: Optional[float] = None,
#         query_params: Optional[dict[str, Any]] = None,
#     ) -> dict[str, Any] | list[Any]:

#         return await self._request(
#             method="GET",
#             endpoint=endpoint,
#             request_context=request_context,
#             timeout=timeout,
#             query_params=query_params,
#         )

#     async def post(
#         self,
#         endpoint: str,
#         request_context: RequestContext,
#         payload: Optional[dict[str, Any]] = None,
#         timeout: Optional[float] = None,
#     ) -> dict[str, Any]:

#         return await self._request(
#             method="POST",
#             endpoint=endpoint,
#             request_context=request_context,
#             timeout=timeout,
#             json_payload=payload,
#         )

#     async def put(
#         self,
#         endpoint: str,
#         request_context: RequestContext,
#         payload: Optional[dict[str, Any]] = None,
#         timeout: Optional[float] = None,
#     ) -> dict[str, Any]:

#         return await self._request(
#             method="PUT",
#             endpoint=endpoint,
#             request_context=request_context,
#             timeout=timeout,
#             json_payload=payload,
#         )

#     async def delete(
#         self,
#         endpoint: str,
#         request_context: RequestContext,
#         timeout: Optional[float] = None,
#     ) -> dict[str, Any]:

#         return await self._request(
#             method="DELETE",
#             endpoint=endpoint,
#             request_context=request_context,
#             timeout=timeout,
#         )

#     # ==========================================================
#     # CORE REQUEST ENGINE
#     # ==========================================================

#     async def _request(
#         self,
#         method: str,
#         endpoint: str,
#         request_context: RequestContext,
#         timeout: Optional[float] = None,
#         query_params: Optional[dict[str, Any]] = None,
#         json_payload: Optional[dict[str, Any]] = None,
#     ) -> dict[str, Any] | list[Any]:

#         url = f"{self.base_url}{endpoint}"

#         request_timeout = timeout or self.timeout

#         headers = self._build_headers(
#             request_context=request_context,
#         )

#         logger.info(
#             "Backend API request initiated",
#             extra={
#                 "method": method,
#                 "url": url,
#                 "request_id": request_context.request_id,
#                 "user_id": str(request_context.user_id),
#                 "tenant_id": str(request_context.tenant_id),
#             },
#         )

#         try:
#             async with httpx.AsyncClient(
#                 timeout=request_timeout,
#             ) as client:

#                 response = await client.request(
#                     method=method,
#                     url=url,
#                     headers=headers,
#                     params=query_params,
#                     json=json_payload,
#                 )

#                 self._validate_response_status(
#                     response=response,
#                     request_context=request_context,
#                 )

#                 parsed_response = response.json()

#                 logger.info(
#                     "Backend API request successful",
#                     extra={
#                         "method": method,
#                         "url": url,
#                         "status_code": response.status_code,
#                         "request_id": request_context.request_id,
#                     },
#                 )

#                 return parsed_response

#         except httpx.TimeoutException as exc:

#             logger.exception(
#                 "Backend API timeout",
#                 extra={
#                     "method": method,
#                     "url": url,
#                     "request_id": request_context.request_id,
#                 },
#             )

#             raise BackendTimeoutError(
#                 f"Backend request timed out: {endpoint}"
#             ) from exc

#         except httpx.ConnectError as exc:

#             logger.exception(
#                 "Backend API connection failure",
#                 extra={
#                     "method": method,
#                     "url": url,
#                     "request_id": request_context.request_id,
#                 },
#             )

#             raise BackendConnectionError(
#                 f"Backend connection failed: {endpoint}"
#             ) from exc

#         except httpx.HTTPStatusError as exc:

#             logger.exception(
#                 "Backend API HTTP error",
#                 extra={
#                     "method": method,
#                     "url": url,
#                     "status_code": exc.response.status_code,
#                     "request_id": request_context.request_id,
#                 },
#             )

#             raise BackendResponseError(
#                 f"Backend API error: {endpoint}"
#             ) from exc

#         except Exception as exc:

#             logger.exception(
#                 "Unexpected backend client failure",
#                 extra={
#                     "method": method,
#                     "url": url,
#                     "request_id": request_context.request_id,
#                 },
#             )

#             raise BackendClientError(
#                 "Unexpected backend client failure"
#             ) from exc

#     # ==========================================================
#     # RESPONSE VALIDATION
#     # ==========================================================

#     def _validate_response_status(
#         self,
#         response: httpx.Response,
#         request_context: RequestContext,
#     ) -> None:

#         status_code = response.status_code

#         if 200 <= status_code < 300:
#             return

#         logger.warning(
#             "Backend API returned error response",
#             extra={
#                 "status_code": status_code,
#                 "request_id": request_context.request_id,
#             },
#         )

#         if status_code == 401:
#             raise BackendAuthenticationError(
#                 "Backend authentication failed"
#             )

#         if status_code == 403:
#             raise BackendAuthorizationError(
#                 "Backend authorization failed"
#             )

#         response.raise_for_status()

#     # ==========================================================
#     # HEADER BUILDER
#     # ==========================================================

#     def _build_headers(
#         self,
#         request_context: RequestContext,
#     ) -> dict[str, str]:

#         headers = {
#             "Content-Type": "application/json",
#             "Accept": "application/json",

#             # ==================================================
#             # Request Tracing
#             # ==================================================

#             "X-Request-ID": request_context.request_id,

#             "X-User-ID": str(
#                 request_context.user_id
#             ),

#             "X-Tenant-ID": str(
#                 request_context.tenant_id
#             ),
#         }

#         if request_context.session_id:
#             headers["X-Session-ID"] = (
#                 request_context.session_id
#             )

#         return headers