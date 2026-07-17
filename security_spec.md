# Security Specification & Threat Model

This document outlines the data invariants, 12 malicious payloads ("The Dirty Dozen"), and the security boundaries designed to protect AuRA Decision Maker's Firestore instance.

## 1. Data Invariants

1. **User Ownership (Identity Integrity)**: All documents under `/users/{userId}`, `/users/{userId}/history/{spinId}`, and `/users/{userId}/wheels/{wheelId}` must be accessible *only* if the authenticated user's ID matches the path variable `userId`.
2. **Strict Sizing Limits**: String fields (like user name, spin winner name, wheel title) must not exceed 100 characters to prevent "Denial of Wallet" resource consumption.
3. **Array Boundaries**: The array of option items in a saved wheel must be strictly bounded (size >= 2 and size <= 12).
4. **Temporal Integrity**: Create and update timestamp fields (`updatedAt` and `createdAt`) must strictly match `request.time` (no client-provided values).
5. **No Blind Reads**: Users cannot list or query documents outside their own path.

---

## 2. The "Dirty Dozen" Malicious Payloads

### P1: Identity Hijack - Write Profile for Another User
- **Target**: `/users/victim_user_123`
- **Attempt**: Create profile doc under another user's UID.
- **Payload**: `{ "name": "Hacker", "todaySpins": 0, "champion": "—", "updatedAt": "request.time" }`
- **Result**: `PERMISSION_DENIED`

### P2: Denial of Wallet - Profile Name Overflow
- **Target**: `/users/hacker_user`
- **Attempt**: Write a name containing a massive 1MB string.
- **Payload**: `{ "name": "A...[10,000 characters]...", "todaySpins": 0, "champion": "—", "updatedAt": "request.time" }`
- **Result**: `PERMISSION_DENIED`

### P3: State Tampering - Negative Spin Counter
- **Target**: `/users/hacker_user`
- **Attempt**: Save a negative number of spins to gain unearned status.
- **Payload**: `{ "name": "Hacker", "todaySpins": -100, "champion": "—", "updatedAt": "request.time" }`
- **Result**: `PERMISSION_DENIED`

### P4: Identity Theft - Spin History for Victim
- **Target**: `/users/victim_user_123/history/spin_abc`
- **Attempt**: Log a spin in another user's subcollection.
- **Payload**: `{ "userId": "victim_user_123", "winner": "Pizza", "title": "Dinner", "time": "12:00 PM", "timestamp": "request.time" }`
- **Result**: `PERMISSION_DENIED`

### P5: Value Poisoning - Spin Winner Too Long
- **Target**: `/users/hacker_user/history/spin_abc`
- **Attempt**: Inject a very long string as a spin winner.
- **Payload**: `{ "userId": "hacker_user", "winner": "Winner...[10,000 chars]...", "title": "Dinner", "time": "12:00 PM", "timestamp": "request.time" }`
- **Result**: `PERMISSION_DENIED`

### P6: Temporal Bypass - Client-Forged Timestamp
- **Target**: `/users/hacker_user/history/spin_abc`
- **Attempt**: Forging spin date to bypass chronological tracking.
- **Payload**: `{ "userId": "hacker_user", "winner": "Pizza", "title": "Dinner", "time": "12:00 PM", "timestamp": "2020-01-01T00:00:00Z" }`
- **Result**: `PERMISSION_DENIED`

### P7: Theft of Wheels - Create Wheel for Victim
- **Target**: `/users/victim_user_123/wheels/wheel_abc`
- **Attempt**: Create a wheel on behalf of another user.
- **Payload**: `{ "userId": "victim_user_123", "title": "Stolen", "options": ["Pizza", "Burgers"], "createdAt": "request.time" }`
- **Result**: `PERMISSION_DENIED`

### P8: Over-capacity - Saved Wheel with Too Many Options
- **Target**: `/users/hacker_user/wheels/wheel_abc`
- **Attempt**: Create a wheel with more than 12 options.
- **Payload**: `{ "userId": "hacker_user", "title": "Fat Wheel", "options": ["1","2","3","4","5","6","7","8","9","10","11","12","13"], "createdAt": "request.time" }`
- **Result**: `PERMISSION_DENIED`

### P9: Structure Hijack - Saved Wheel Options Not List
- **Target**: `/users/hacker_user/wheels/wheel_abc`
- **Attempt**: Set `options` field as a primitive string instead of an array.
- **Payload**: `{ "userId": "hacker_user", "title": "Broken", "options": "not-a-list", "createdAt": "request.time" }`
- **Result**: `PERMISSION_DENIED`

### P10: History Snooping - Blind List Query on Victim
- **Target**: `/users/victim_user_123/history`
- **Attempt**: Query the entire spin history of another user.
- **Payload**: `GET /users/victim_user_123/history` (unsigned or signed as hacker_user)
- **Result**: `PERMISSION_DENIED`

### P11: Profile Snooping - Get Profile of Victim
- **Target**: `/users/victim_user_123`
- **Attempt**: Read the profile document of another user.
- **Payload**: `GET /users/victim_user_123`
- **Result**: `PERMISSION_DENIED`

### P12: Sabotage - Delete Saved Wheel of Victim
- **Target**: `/users/victim_user_123/wheels/wheel_abc`
- **Attempt**: Delete another user's custom wheel configuration.
- **Payload**: `DELETE /users/victim_user_123/wheels/wheel_abc`
- **Result**: `PERMISSION_DENIED`
