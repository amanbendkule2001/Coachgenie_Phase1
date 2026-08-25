import os
import getpass
import bcrypt

# 1. Hashing a password
password = os.getenv("HASH_PASSWORD") or getpass.getpass("Enter password to hash: ")
password_bytes = password.encode('utf-8')

# Generate a unique, random salt and hash the password
salt = bcrypt.gensalt()
hashed_password = bcrypt.hashpw(password_bytes, salt)
print(f"Hashed: {hashed_password.decode('utf-8')}")

# 2. Verifying a password
user_input = os.getenv("VERIFY_PASSWORD") or getpass.getpass("Re-enter password to verify: ")
user_input_bytes = user_input.encode('utf-8')

# bcrypt.checkpw automatically extracts the original salt from the hash
if bcrypt.checkpw(user_input_bytes, hashed_password):
    print("Password match! User authenticated.")
else:
    print("Incorrect password.")
