// ============================================
// Item Service — API-backed
// ============================================
// All functions now call the backend API instead of localStorage.
// Session ID is sent via the "session-id" header.

const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to get session token from localStorage
function getSessionToken() {
  try {
    const stored = localStorage.getItem('faithguard_session');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.sessionToken || null;
  } catch {
    return null;
  }
}

// Helper for authenticated requests
function authHeaders() {
  const token = getSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['session-id'] = token;
  return headers;
}

// -----------------------------------------------------------------
// Get all items for a temple (excludes closed)
// -----------------------------------------------------------------
export async function getItemsForTemple(templeCode) {
  try {
    const res = await fetch(`${API_URL}/api/items?templeId=${encodeURIComponent(templeCode)}`);
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error('getItemsForTemple error:', e);
    return [];
  }
}

// -----------------------------------------------------------------
// Get all items including closed (for admin/history)
// -----------------------------------------------------------------
export async function getAllItemsForTemple(templeCode) {
  try {
    const res = await fetch(`${API_URL}/api/items?templeId=${encodeURIComponent(templeCode)}&includeClosed=true`);
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error('getAllItemsForTemple error:', e);
    return [];
  }
}

// -----------------------------------------------------------------
// Get single item by ID
// -----------------------------------------------------------------
export async function getItemById(itemId) {
  try {
    const res = await fetch(`${API_URL}/api/items/${itemId}`);
    const data = await res.json();
    return data.item || null;
  } catch (e) {
    console.error('getItemById error:', e);
    return null;
  }
}

// -----------------------------------------------------------------
// Create new item report
// -----------------------------------------------------------------
export async function createItemReport(itemData, sessionId, templeCode) {
  try {
    const res = await fetch(`${API_URL}/api/items`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: itemData.title,
        description: itemData.description,
        location: itemData.location,
        image: itemData.image || null,
        category: itemData.category || 'other',
        rewardAmount: itemData.rewardAmount || null,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to create item');
    }

    return {
      item: data.item,
      hasPotentialDuplicates: false,
      duplicates: [],
    };
  } catch (e) {
    console.error('createItemReport error:', e);
    throw new Error('Failed to create item report');
  }
}

// -----------------------------------------------------------------
// Update item status
// -----------------------------------------------------------------
export async function updateItemStatus(itemId, newStatus, sessionId = null) {
  try {
    const res = await fetch(`${API_URL}/api/items/${itemId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to update status');
    }

    return data.item;
  } catch (e) {
    console.error('updateItemStatus error:', e);
    throw new Error('Failed to update item status');
  }
}

// -----------------------------------------------------------------
// Update item (general edits)
// -----------------------------------------------------------------
export async function updateItem(itemId, updates) {
  try {
    const res = await fetch(`${API_URL}/api/items/${itemId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to update item');
    }

    return data.item;
  } catch (e) {
    console.error('updateItem error:', e);
    throw new Error('Failed to update item');
  }
}

// -----------------------------------------------------------------
// Get messages for a specific 1:1 conversation
// -----------------------------------------------------------------
export async function getMessagesForConversation(itemId, peerSessionId) {
  try {
    const res = await fetch(
      `${API_URL}/api/messages/${itemId}/${encodeURIComponent(peerSessionId)}`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    return data.messages || [];
  } catch (e) {
    console.error('getMessagesForConversation error:', e);
    return [];
  }
}

// -----------------------------------------------------------------
// Get all conversation threads for an item (current user's conversations)
// -----------------------------------------------------------------
export async function getConversationsForItem(itemId) {
  try {
    const res = await fetch(
      `${API_URL}/api/messages/${itemId}/conversations`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    return data.conversations || [];
  } catch (e) {
    console.error('getConversationsForItem error:', e);
    return [];
  }
}

// -----------------------------------------------------------------
// Add message to a 1:1 conversation
// -----------------------------------------------------------------
export async function addMessageToItem(itemId, text, receiverSessionId) {
  try {
    const res = await fetch(`${API_URL}/api/messages/${itemId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text, receiverSessionId }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to add message');
    }

    return data.message;
  } catch (e) {
    console.error('addMessageToItem error:', e);
    throw new Error('Failed to add message');
  }
}

// -----------------------------------------------------------------
// Search items
// -----------------------------------------------------------------
export async function searchItems(templeCode, query) {
  try {
    const params = new URLSearchParams({ templeId: templeCode });
    if (query) params.append('q', query);

    const res = await fetch(`${API_URL}/api/items/search?${params.toString()}`);
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error('searchItems error:', e);
    return [];
  }
}

// -----------------------------------------------------------------
// Get items reported by session
// -----------------------------------------------------------------
export async function getItemsByReporter(sessionId, templeCode) {
  // Uses the regular items endpoint + client-side filtering
  // (Firestore query filtering by reporterSessionId can be added later)
  try {
    const items = await getItemsForTemple(templeCode);
    return items.filter((item) => item.reporterSessionId === sessionId);
  } catch (e) {
    console.error('getItemsByReporter error:', e);
    return [];
  }
}

// -----------------------------------------------------------------
// Check for duplicate reports (client-side check)
// -----------------------------------------------------------------
export async function checkForDuplicates(title, description, templeCode) {
  try {
    const items = await getItemsForTemple(templeCode);

    if (!title || !description) return [];

    const titleLower = title.toLowerCase().trim();
    const descLower = description.toLowerCase().trim();

    if (titleLower.length < 3 && descLower.length < 3) return [];

    return items.filter((item) => {
      const itemTitleLower = item.title.toLowerCase().trim();
      const itemDescLower = item.description.toLowerCase().trim();

      const titleSimilar =
        titleLower.length >= 3 &&
        itemTitleLower.length >= 3 &&
        (itemTitleLower.includes(titleLower) || titleLower.includes(itemTitleLower));

      const descSimilar =
        descLower.length >= 10 &&
        itemDescLower.length >= 10 &&
        (itemDescLower.includes(descLower) || descLower.includes(itemDescLower));

      return titleSimilar || descSimilar;
    });
  } catch (e) {
    console.error('checkForDuplicates error:', e);
    return [];
  }
}

// -----------------------------------------------------------------
// Submit a claim for a lost item (uses FormData for mobile support)
// -----------------------------------------------------------------
export async function submitClaim(itemId, imageFile, message) {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('itemId', itemId);
    formData.append('message', message || '');

    const token = getSessionToken();
    const headers = {};
    if (token) headers['session-id'] = token;
    // Do NOT set Content-Type — browser sets multipart boundary automatically

    const res = await fetch(`${API_URL}/api/claims/create`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to submit claim');
    }

    return data.claim;
  } catch (e) {
    console.error('submitClaim error:', e);
    throw new Error(e.message || 'Failed to submit claim');
  }
}

// -----------------------------------------------------------------
// Get current user's claim status for a specific item
// -----------------------------------------------------------------
export async function getClaimStatus(itemId) {
  try {
    const res = await fetch(`${API_URL}/api/claims/status/${itemId}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    return data.claim || null;
  } catch (e) {
    console.error('getClaimStatus error:', e);
    return null;
  }
}

// -----------------------------------------------------------------
// Get all claims for an item (owner only)
// -----------------------------------------------------------------
export async function getClaimsForItem(itemId) {
  try {
    const res = await fetch(`${API_URL}/api/claims/for-item/${itemId}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    return data.claims || [];
  } catch (e) {
    console.error('getClaimsForItem error:', e);
    return [];
  }
}

// -----------------------------------------------------------------
// Approve a claim
// -----------------------------------------------------------------
export async function approveClaim(claimId) {
  try {
    const res = await fetch(`${API_URL}/api/claims/approve`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ claimId }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to approve claim');
    }

    return data;
  } catch (e) {
    console.error('approveClaim error:', e);
    throw new Error(e.message || 'Failed to approve claim');
  }
}

// -----------------------------------------------------------------
// Reject a claim
// -----------------------------------------------------------------
export async function rejectClaim(claimId) {
  try {
    const res = await fetch(`${API_URL}/api/claims/reject`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ claimId }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to reject claim');
    }

    return data;
  } catch (e) {
    console.error('rejectClaim error:', e);
    throw new Error(e.message || 'Failed to reject claim');
  }
}
