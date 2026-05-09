import hashlib
import hmac
import secrets


PBKDF2_ALGORITHM = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 260_000


class PBKDF2PasswordHasher:
    def hash(self, password: str) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            PBKDF2_ITERATIONS,
        ).hex()

        return f"{PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt}${digest}"

    def verify(self, password: str, password_hash: str) -> bool:
        try:
            algorithm, iterations, salt, expected_digest = password_hash.split("$", 3)
            if algorithm != PBKDF2_ALGORITHM:
                return False

            digest = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations),
            ).hex()
        except (TypeError, ValueError):
            return False

        return hmac.compare_digest(digest, expected_digest)
