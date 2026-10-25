const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getAuthHeader() {
  try {
    const authData = JSON.parse(sessionStorage.getItem("seva-auth") || "null");
    if (authData?.token) {
      return { Authorization: `Bearer ${authData.token}` };
    }
  } catch {
    // Ignore parse error
  }
  return {};
}

async function request(path, options = {}) {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const farmerApi = {
  // Dashboard data
  async getDashboard() {
    return request("/api/farmer/dashboard");
  },

  // Requests list
  async getRequests(status = "all") {
    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/api/farmer/requests${query}`);
  },

  // Single request detail
  async getRequest(id) {
    return request(`/api/farmer/requests/${id}`);
  },

  // Autosave draft
  async saveDraft(draftData) {
    return request("/api/farmer/requests/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftData),
    });
  },

  // Final request submission
  async submitRequest(requestData) {
    return request("/api/farmer/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });
  },

  // Resubmit rejected request
  async resubmitRequest(id, data) {
    return request(`/api/farmer/requests/${id}/resubmit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // Documents list
  async getDocuments() {
    return request("/api/farmer/documents");
  },

  // Re-upload rejected document
  async reuploadDocument(documentId, file) {
    const formData = new FormData();
    formData.append("document", file);

    const headers = { ...getAuthHeader() };
    const response = await fetch(`${API_URL}/api/farmer/documents/${documentId}/reupload`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "Failed to re-upload document");
      error.status = response.status;
      throw error;
    }
    return data;
  },

  // Profile
  async getProfile() {
    return request("/api/farmer/profile");
  },

  async updateProfile(profileData) {
    return request("/api/farmer/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });
  },

  // LLM extraction
  async extractRequest(extractData) {
    return request("/api/farmer/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extractData),
    });
  },
};
