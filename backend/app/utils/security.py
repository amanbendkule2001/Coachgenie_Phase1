# import bcrypt
# import hashlib
# import secrets
# from datetime import datetime, timedelta, timezone
# from jose import JWTError, jwt
# from app.config import settings
# from app.utils.exceptions import UnauthorizedError


# def hash_password(password: str) -> str:
#     return bcrypt.hashpw(password[:72].encode(), bcrypt.gensalt(rounds=12)).decode()


# def verify_password(plain: str, hashed: str) -> bool:
#     return bcrypt.checkpw(plain[:72].encode(), hashed.encode())


# def create_access_token(data: dict) -> str:
#     payload = data.copy()
#     expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
#     payload.update({"exp": expire, "type": "access"})
#     return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# def create_refresh_token() -> tuple[str, str]:
#     raw = secrets.token_hex(64)
#     hashed = hashlib.sha256(raw.encode()).hexdigest()
#     return raw, hashed


# def hash_token(raw: str) -> str:
#     return hashlib.sha256(raw.encode()).hexdigest()


# def decode_access_token(token: str) -> dict:
#     try:
#         payload = jwt.decode(
#             token,
#             settings.SECRET_KEY,
#             algorithms=[settings.JWT_ALGORITHM]
#         )
#         if payload.get("type") != "access":
#             raise UnauthorizedError("Invalid token type.")
#         return payload
#     except JWTError:
#         raise UnauthorizedError("Invalid or expired token.")


# def refresh_token_expiry() -> datetime:
#     return datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)




import bcrypt
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from jose import JWTError, ExpiredSignatureError, jwt
from app.config import settings
from app.utils.exceptions import UnauthorizedError


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password[:72].encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain[:72].encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token() -> tuple[str, str]:
    raw = secrets.token_hex(64)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access":
            raise UnauthorizedError("Invalid token type.")
        return payload
    except ExpiredSignatureError:
        raise UnauthorizedError("Token expired.")
    except JWTError:
        raise UnauthorizedError("Invalid token.")


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)