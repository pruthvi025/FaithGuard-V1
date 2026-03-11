# Lost Item Reporting - Complete End-to-End Workflow

**Feature:** Lost Item Reporting  
**Project:** FaithGuard – Privacy-First, Community-Driven Lost & Found PWA  
**Document Type:** Product Workflow & System Flow Specification

---

## 1. ENTRY TRIGGER

### Preconditions Required
- User must have completed temple check-in process
- Active session must be established (temporary, anonymous session)
- User must be physically present at the temple (verified via check-in)
- Session must not have expired

### Entry Actions
- User navigates to "Lost Items Feed" page from home screen
- User taps "Report Item" button (prominent call-to-action)
- System validates active session before allowing access
- If session expired, user is redirected to check-in page

### Access Control
- Only checked-in users can access reporting flow
- No authentication or account creation required
- Session-based access only (temporary, location-bound)

---

## 2. REPORTING FLOW (STEP-BY-STEP)

### Step 1: Type Selection
- **Purpose:** Confirm user wants to report a lost item
- **User Action:** Single card displayed (Lost Item option only)
- **System Action:** Pre-selects "lost" type automatically
- **Validation:** Type is always "lost" (no user selection needed)
- **Continue Condition:** Type is set, Continue button is enabled by default

### Step 2: Item Details Collection

#### Mandatory Fields (Required for Submission)
1. **Item Title**
   - Short, descriptive name (e.g., "Black Leather Wallet")
   - Character limit: 100 characters
   - Validation: Cannot be empty, must contain at least 3 characters
   - Error handling: Clear message if too short or empty

2. **Description**
   - Detailed description of the item
   - Character limit: 500 characters
   - Validation: Minimum 10 characters required
   - Error handling: Shows character count, prevents submission if too short
   - Elderly-friendly: Large text area, clear placeholder text

3. **Location Lost**
   - Where the item was lost within the temple
   - Examples: "Main entrance", "Meditation hall", "Courtyard"
   - Validation: Cannot be empty
   - Error handling: Clear field label with examples

#### Optional Fields
1. **Photo**
   - Image upload capability
   - Helps others identify the item
   - No validation required
   - User can remove photo if uploaded by mistake

### Step 3: Form Validation & Submission

#### Real-Time Validation
- Fields validated as user types
- Submit button disabled until all mandatory fields are valid
- Visual indicators show which fields need attention
- Clear error messages in plain language

#### Submission Process
- User taps "Submit Report" button
- System validates all mandatory fields one final time
- If valid: Report is created and saved
- If invalid: User is shown which fields need correction
- On success: User is redirected to Lost Items Feed

#### Elderly-Friendly Design Principles
- Large, clear labels
- Simple, single-column layout
- Minimal cognitive load (one thing at a time)
- Clear visual feedback for all actions
- No complex navigation or hidden features

---

## 3. DATA VISIBILITY RULES

### Who Can See the Reported Item

#### Visible To:
- **All checked-in users** at the same temple
- Users must have active session (checked in)
- Visibility is location-bound (same temple only)
- Items appear in chronological order (newest first)

#### Not Visible To:
- Users who have not checked in
- Users at different temple locations
- Users whose session has expired
- External users or non-checked-in visitors

### Presence-Based Visibility Enforcement

#### Conceptual Rules:
1. **Temple-Scoped Visibility**
   - Each temple has its own isolated item feed
   - Items reported at Temple A are not visible at Temple B
   - Temple code/QR determines which feed a user sees

2. **Session-Based Access**
   - Items only visible while user has active session
   - Session expires when user leaves or after time limit
   - Expired sessions lose access to all items

3. **Real-Time Updates**
   - New reports appear immediately to all active users
   - No caching of items for expired sessions
   - Fresh data on each session start

### Privacy Boundaries
- No cross-temple data sharing
- No persistent user tracking
- No historical data retention beyond active items
- No personal information attached to reports

---

## 4. ITEM STATUS LIFECYCLE

### Status States

#### ACTIVE
- **Definition:** Item has been reported and is searchable
- **Initial State:** All new reports start as ACTIVE
- **Visibility:** Visible to all checked-in users in feed
- **Actions Available:**
  - View details
  - Send messages to reporter
  - Mark as found (by anyone who found the item)

#### FOUND
- **Definition:** Item has been located by someone
- **Trigger:** Any checked-in user can mark item as "Found"
- **Who Can Trigger:** Any active user (not just the reporter)
- **Visibility:** Still visible in feed but with "Found" status badge
- **Actions Available:**
  - Continue messaging
  - Verify ownership through chat
  - Close case once ownership confirmed

#### CLOSED
- **Definition:** Item has been successfully returned to owner
- **Trigger:** Reporter confirms item has been returned
- **Who Can Trigger:** Original reporter only
- **Visibility:** Moved to closed cases, no longer in active feed
- **Actions Available:**
  - View case closure confirmation
  - Report another item

### Status Transition Rules

#### ACTIVE → FOUND
- **Triggered By:** Any checked-in user
- **Requirement:** User must be in active session
- **Action:** User taps "I Found This" or similar action
- **Result:** Status changes, item remains visible with "Found" badge

#### FOUND → CLOSED
- **Triggered By:** Original reporter only
- **Requirement:** Reporter must confirm return via chat or explicit action
- **Action:** Reporter taps "Case Closed" or "Item Returned"
- **Result:** Item moves to closed state, removed from active feed

#### ACTIVE → CLOSED (Direct)
- **Scenario:** Reporter finds their own item before others
- **Triggered By:** Original reporter
- **Action:** Reporter can directly close without "Found" intermediate state
- **Result:** Item immediately moves to closed state

### Automatic Status Changes
- **None:** All status changes require explicit user action
- **No automatic expiry:** Items remain active until manually closed
- **No time-based transitions:** Status is user-controlled only

---

## 5. COMMUNITY DISCOVERY FLOW

### How Active Users Become Aware

#### Discovery Mechanisms:
1. **Feed Viewing**
   - Users browse Lost Items Feed
   - Items appear in chronological order (newest first)
   - Each item shows: title, description, location, time, status

2. **Search Functionality**
   - Users can search by keywords (title, description)
   - Search is real-time and filters visible items
   - Results limited to items visible to current session

3. **Status Badges**
   - Visual indicators show item status (Active/Found/Closed)
   - Color-coded badges for quick scanning
   - Helps users prioritize which items need attention

### Actions Available to Community Members

#### For Any Checked-In User:
- **View Item Details:** Tap any item to see full information
- **Send Messages:** Initiate chat with reporter
- **Mark as Found:** If user has found the item
- **Search Items:** Filter feed by keywords

#### Actions NOT Available:
- **Edit Reports:** Only reporter can modify their report
- **Delete Reports:** Only reporter can close/remove
- **View Reporter Identity:** No personal information shown
- **Contact Outside System:** All communication within app only

### Communication Flow

#### Messaging System:
1. **Initiation:** Any user can start conversation about an item
2. **Anonymity:** No real names or contact info shared
3. **Purpose:** Verify ownership, arrange return location
4. **Scope:** Messages tied to specific item only
5. **Privacy:** Messages only visible to participants in that conversation

#### Ownership Verification:
- Users describe item details in chat
- Reporter confirms if details match
- Arrangement made for return (location within temple)
- No external contact information exchanged

---

## 6. PRIVACY & ETHICS GUARANTEES

### Personal Data NOT Collected

#### Explicitly Excluded:
- **No names:** Users remain completely anonymous
- **No email addresses:** No contact information collected
- **No phone numbers:** No external communication channels
- **No device IDs:** No persistent device tracking
- **No location tracking:** Only temple-level presence, not precise GPS
- **No IP addresses stored:** Session-based only, no persistent identifiers
- **No user accounts:** No registration or login required

### Anonymity Preservation

#### How Anonymity is Maintained:
1. **Session-Based Identity:**
   - Each session gets temporary, anonymous identifier
   - Identifier expires with session
   - No link between sessions or devices

2. **No Profile Data:**
   - No user profiles or personal information stored
   - No history of past reports linked to user
   - Each report is independent

3. **Communication Privacy:**
   - Messages are item-specific only
   - No cross-item conversation history
   - Messages deleted when item is closed

### Misuse Prevention

#### Abuse Prevention Mechanisms:
1. **Rate Limiting:**
   - Maximum reports per session (e.g., 5 reports per session)
   - Prevents spam or malicious reporting

2. **Content Moderation:**
   - Basic profanity filtering on text fields
   - Image moderation for inappropriate content
   - Manual review flagging system (if needed)

3. **Session Validation:**
   - Only checked-in users can report
   - Physical presence required (via check-in)
   - Prevents remote abuse

4. **Temple-Scoped Access:**
   - Items only visible within same temple
   - Prevents cross-location harassment
   - Isolated communities per temple

### Harassment Prevention

#### Built-in Protections:
1. **No Persistent Identity:**
   - Cannot track users across sessions
   - Cannot build harassment patterns
   - Each interaction is isolated

2. **Item-Specific Communication:**
   - Messages only about specific item
   - No general messaging or user-to-user chat
   - Conversation ends when item closes

3. **Easy Exit:**
   - Users can close their own reports anytime
   - No obligation to continue conversations
   - Session expiry provides natural exit

4. **No Contact Information:**
   - Cannot extract phone, email, or social media
   - All communication stays within system
   - No external harassment vectors

---

## 7. EDGE CASES

### Duplicate Reports

#### Scenario:
- Same item reported multiple times by different users
- Same item reported by same user in different sessions

#### Handling:
1. **Detection:**
   - System checks for similar titles/descriptions
   - Flags potential duplicates for review
   - Shows warning to user before submission

2. **User Guidance:**
   - Suggests checking existing feed first
   - Shows similar items if found
   - Allows user to proceed if confident it's different

3. **Resolution:**
   - Multiple reports can coexist if legitimate
   - Users can mark duplicates in chat
   - Original reporter can consolidate if needed

### False Reports

#### Scenario:
- User reports item that doesn't exist
- Malicious or prank reports

#### Handling:
1. **Community Self-Policing:**
   - Other users can flag suspicious reports
   - Flagged items reviewed by temple admin (if available)
   - No automatic removal without verification

2. **Natural Expiry:**
   - False reports naturally fade if no engagement
   - No one marks as found, item stays in feed
   - Reporter can close if they realize mistake

3. **Rate Limiting:**
   - Limits prevent mass false reporting
   - Session-based limits reduce abuse potential

### Item Found But Owner Unreachable

#### Scenario:
- Someone finds the item
- Reporter's session has expired
- Cannot contact reporter

#### Handling:
1. **Persistent Item Visibility:**
   - Item remains in feed even if reporter session expired
   - Finder can still mark as "Found"
   - Item shows "Found" status for when reporter returns

2. **Return Protocol:**
   - Finder can leave message describing where item is held
   - Temple staff can be notified (if system supports)
   - Item remains visible until manually closed

3. **Reporter Return:**
   - When reporter checks in again, sees their item was found
   - Can view messages left by finder
   - Can arrange pickup and close case

### Session Expires Mid-Process

#### Scenario:
- User is filling out report form
- Session expires before submission
- User tries to submit after expiry

#### Handling:
1. **Proactive Warning:**
   - System warns user if session is about to expire
   - Shows countdown timer if available
   - Offers to extend session if possible

2. **Form Data Preservation:**
   - Form data saved locally (browser storage)
   - User can recover data after re-check-in
   - No data loss on session expiry

3. **Submission Blocking:**
   - Submit button disabled if session expired
   - Clear message explaining need to check in again
   - Redirect to check-in page with data recovery option

4. **Recovery Flow:**
   - After re-check-in, user returns to report page
   - Previously entered data is restored
   - User can continue from where they left off

### Item Description Too Vague

#### Scenario:
- User provides minimal description
- Item cannot be identified by others

#### Handling:
1. **Validation Requirements:**
   - Minimum character counts enforce detail
   - System suggests adding more detail
   - Photo upload encouraged for clarity

2. **Community Feedback:**
   - Other users can request more details via chat
   - Reporter can update description if needed
   - Natural selection: vague items get less engagement

### Multiple People Find Same Item

#### Scenario:
- Several users claim to have found the item
- Ownership verification needed

#### Handling:
1. **First-Come-First-Served:**
   - First person to mark as "Found" gets priority
   - Others can still message reporter
   - Reporter decides who actually has the item

2. **Verification Process:**
   - Reporter asks for specific details in chat
   - Multiple finders can provide descriptions
   - Reporter confirms which matches their item

3. **Resolution:**
   - Reporter arranges return with correct finder
   - Case closed once item returned
   - Other finders notified that item is resolved

---

## 8. EXIT CONDITIONS

### Successful Resolution

#### Flow:
1. Item is reported (ACTIVE status)
2. Someone finds item and marks as FOUND
3. Reporter and finder communicate via chat
4. Ownership verified through description/details
5. Item returned to reporter
6. Reporter closes case (CLOSED status)
7. User sees "Case Closed" confirmation screen
8. Item removed from active feed

#### Success Indicators:
- Item status changes to CLOSED
- Confirmation message displayed
- Option to return to feed or report another item
- Positive reinforcement message (karma/kindness)

### Manual Closure

#### Scenarios:
1. **Reporter Finds Own Item:**
   - Reporter locates item themselves
   - Can directly close without "Found" intermediate
   - Immediate closure and confirmation

2. **False Report Realization:**
   - Reporter realizes item wasn't actually lost
   - Can close case immediately
   - No penalty or restriction

3. **Item No Longer Needed:**
   - Reporter decides not to pursue recovery
   - Can close case at any time
   - No explanation required

#### Closure Process:
- Reporter navigates to their item detail page
- Taps "Close Case" or "Item Returned" button
- Confirmation dialog appears
- Case moves to CLOSED status
- Success screen shown

### Automatic Expiry (Future Consideration)

#### Note:
- Currently: No automatic expiry implemented
- Items remain active until manually closed
- Future consideration: Items older than X days could auto-close
- Would require clear communication to users about expiry policy

### Admin Intervention (If Needed)

#### Scenarios Requiring Admin:
1. **Abuse Reports:**
   - Multiple users flag same item
   - Admin reviews and can remove if malicious

2. **Inappropriate Content:**
   - Profanity or offensive descriptions
   - Admin can edit or remove content

3. **System Issues:**
   - Technical problems preventing closure
   - Admin can manually close cases

#### Admin Capabilities:
- View all items in temple
- Edit or remove reports
- Close cases manually
- View flagged items
- Access moderation tools

#### Admin Access:
- Separate admin interface (not part of user flow)
- Requires temple authorization
- Not accessible through normal user session

---

## WORKFLOW SUMMARY

### Complete User Journey:

1. **Entry:** User checks in → Navigates to feed → Taps "Report Item"
2. **Reporting:** Selects Lost Item → Fills form → Submits report
3. **Visibility:** Report appears in feed for all checked-in users
4. **Discovery:** Community members browse/search and find item
5. **Communication:** Finder messages reporter via chat
6. **Verification:** Ownership confirmed through description matching
7. **Resolution:** Item returned, case closed, success confirmed
8. **Exit:** User sees confirmation, can report another or return to feed

### Key Principles Throughout:
- **Privacy First:** No personal data, anonymous sessions
- **Community Driven:** Users help each other, no central authority
- **Simple & Accessible:** Elderly-friendly, minimal cognitive load
- **Temple-Scoped:** Isolated communities per location
- **Session-Based:** Temporary access, no persistent tracking
- **User-Controlled:** Users manage their own reports and closures

---

**Document Status:** Complete Workflow Specification  
**Last Updated:** [Current Date]  
**Version:** 1.0
