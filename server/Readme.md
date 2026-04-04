# API Documentation: User Registration

This endpoint handles new account creation. Currently running on **FastAPI** (Local Development).

### Connection Details
* **Base URL (Simulator):** `http://localhost:8080`
* **Base URL (Physical Device/Expo Go):** `http://YOUR_LOCAL_IP_HERE:8080`
* **Method:** `POST`
* **Endpoint:** `/accounts/create`

### Request Body (JSON)
Based on the `UserSignUp` schema in `main.py`:

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `username` | String | Yes | Unique Identifier |
| `email` | String(Email) | Yes | Valid email format |
| `password` | String | Yes | Raw password (hashed server-side) |
| `first_name` | String | Yes | User's legal first name |
| `last_name` | String | Yes | User's legal last name |

**Example Payload:**
```json
{
    "username": "jdoe86",
    "email": "j.doe@example.com",
    "password": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe"
}
```

### Expected Response
* **201 Created:** Account successfully created in DB and Alpaca
*  **400 Bad Request:** Occurs if validation fails or duplicate user is found
*  **409 Conflict:** Occurs if username or email is already in use
*  **500 Internal Server Error:** Occurs if the Alpaca integration fails
*  **502 Bad Gateway:** Occurs if the brokerage service is down
