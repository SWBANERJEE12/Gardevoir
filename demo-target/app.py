"""
HackBattle Shop - Demo Target for Sentinel Security Assessment
Port: 5001
Contains intentional, controlled weaknesses to test Sentinel's adaptive AI analyzer.
"""
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app, supports_credentials=True)

# In-memory database for demo
USERS = {
    "alice@demo.local": {
        "id": "usr_alice",
        "email": "alice@demo.local",
        "password": "pass123",
        "name": "Alice Developer",
        "token": "token_alice_sec99"
    },
    "bob@demo.local": {
        "id": "usr_bob",
        "email": "bob@demo.local",
        "password": "pass456",
        "name": "Bob Executive",
        "token": "token_bob_sec88"
    }
}

ORDERS = {
    "101": {
        "id": "101",
        "owner_id": "usr_alice",
        "item": "Cybersecurity Toolkit Pro",
        "price": 199.99,
        "shipping_address": "123 Alice St, Security City"
    },
    "102": {
        "id": "102",
        "owner_id": "usr_bob",
        "item": "Enterprise AI Defense Node",
        "price": 4999.00,
        "shipping_address": "789 Executive Blvd, Private Island"
    }
}

PRODUCTS = [
    {"id": "prod_1", "name": "Sentinel T-Shirt", "price": 25.00, "category": "Swag"},
    {"id": "prod_2", "name": "Hardware Security Key", "price": 45.00, "category": "Hardware"},
    {"id": "prod_3", "name": "AI Agent Handbook", "price": 30.00, "category": "Books"}
]

@app.route("/", methods=["GET"])
def home():
    """Application root & health check"""
    resp = make_response(jsonify({
        "status": "online",
        "service": "HackBattle Shop API",
        "version": "1.0.4",
        "environment": "demo",
        "supported_auth": ["Bearer token", "Session Cookie"]
    }))
    # Partial security headers (intentionally missing Strict-Transport-Security, CSP, Permissions-Policy)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "SAMEORIGIN"
    return resp

@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify({"products": PRODUCTS})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    user = USERS.get(email)
    if user and user["password"] == password:
        resp = make_response(jsonify({
            "status": "success",
            "message": "Authenticated successfully",
            "token": user["token"],
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"]
            }
        }))
        # Valid security cookie configuration
        resp.set_cookie("session_id", user["token"], httponly=True, samesite="Lax")
        return resp
    
    # Consistent rejection message (good auth practice)
    return jsonify({"status": "error", "message": "Invalid email or password"}), 401

@app.route("/api/user/profile", methods=["GET"])
def user_profile():
    token = request.headers.get("Authorization", "").replace("Bearer ", "") or request.cookies.get("session_id")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    
    for user in USERS.values():
        if user["token"] == token:
            return jsonify({
                "id": user["id"],
                "email": user["email"],
                "name": user["name"]
            })
    return jsonify({"error": "Invalid session"}), 401

@app.route("/api/orders/<order_id>", methods=["GET"])
def get_order(order_id):
    """
    INTENTIONAL VULNERABILITY: Broken Object Level Authorization (IDOR)
    The endpoint checks if the caller is authenticated, BUT fails to check if the caller
    actually owns the requested order_id!
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "") or request.cookies.get("session_id")
    if not token:
        return jsonify({"error": "Unauthorized: Authentication required"}), 401
    
    # Verify user exists
    current_user = None
    for user in USERS.values():
        if user["token"] == token:
            current_user = user
            break
            
    if not current_user:
        return jsonify({"error": "Invalid token"}), 401

    order = ORDERS.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    # BUG: We return the order regardless of whether order['owner_id'] == current_user['id']!
    return jsonify({
        "order": order,
        "accessed_by": current_user["email"],
        "is_owner": order["owner_id"] == current_user["id"]
    })

@app.route("/api/newsletter", methods=["POST"])
def newsletter_signup():
    """
    INTENTIONAL WEAKNESS: Missing Rate Limiting
    Accepts arbitrary continuous submissions without throttling, 429 response, or rate limit headers.
    """
    data = request.get_json(silent=True) or {}
    email = data.get("email", "anonymous@demo.local")
    return jsonify({
        "status": "subscribed",
        "email": email,
        "timestamp": time.time()
    }), 200

@app.route("/api/search", methods=["GET"])
def search():
    """
    Controlled Input Validation endpoint
    Echoes back user search query with simple tag reflection.
    """
    q = request.args.get("q", "")
    return jsonify({
        "query": q,
        "results_count": 0,
        "results": [],
        "echo": f"Search results for: {q}"
    })

if __name__ == "__main__":
    print("Starting HackBattle Shop demo target on http://localhost:5001...")
    app.run(host="0.0.0.0", port=5001, debug=False)
