"use client";

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://localhost:8000";

export interface LandscaperProfile {
  profile_id: number;
  survey_completed_at: string | null;
  role_primary: string | null;
  role_property_type: string | null;
  ai_proficiency: string | null;
  communication_tone: string | null;
  primary_tool: string | null;
  markets_text: string | null;
  compiled_instructions: string | null;
  onboarding_chat_history: Array<Record<string, any>>;
  document_insights: Record<string, any>;
  tos_accepted_at: string | null;
}

export interface DocumentAnalysis {
  document_id: number;
  summary: string;
  confidentiality_flag: boolean;
  confidential_markers: string[];
}

const getHeaders = (extra: Record<string, string> = {}) => {
  if (typeof window === "undefined") return extra;
  const storedTokens = localStorage.getItem("auth_tokens");
  const headers: Record<string, string> = {
    ...extra,
  };

  if (storedTokens) {
    try {
      const { access } = JSON.parse(storedTokens);
      if (access) {
        headers.Authorization = `Bearer ${access}`;
      }
    } catch (error) {
      console.error("Failed to parse auth tokens", error);
    }
  }

  return headers;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || payload.error || "Request failed");
  }
  return response.json().catch(() => ({}));
};

export const fetchLandscaperProfile = async (): Promise<LandscaperProfile> => {
  const response = await fetch(`${API_BASE}/api/users/landscaper-profile/`, {
    method: "GET",
    headers: getHeaders({ "Content-Type": "application/json" }),
  });
  return handleResponse(response);
};

export const createLandscaperProfile = async (payload: Partial<LandscaperProfile>) => {
  const response = await fetch(`${API_BASE}/api/users/landscaper-profile/`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const updateLandscaperProfile = async (payload: Partial<LandscaperProfile>) => {
  const response = await fetch(`${API_BASE}/api/users/landscaper-profile/`, {
    method: "PATCH",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const compileLandscaperInstructions = async () => {
  const response = await fetch(`${API_BASE}/api/users/landscaper-profile/compile/`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
  });
  return handleResponse(response);
};

export const analyzeDocument = async (file: File): Promise<DocumentAnalysis> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("action", "analyze");

  const response = await fetch(`${API_BASE}/api/users/landscaper-profile/document/`, {
    method: "POST",
    headers: getHeaders(),
    body: formData,
  });
  return handleResponse(response);
};

export const confirmDocument = async (documentId: number) => {
  const response = await fetch(`${API_BASE}/api/users/landscaper-profile/document/`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ action: "confirm", document_id: documentId }),
  });
  return handleResponse(response);
};

export const cancelDocument = async (documentId: number) => {
  const response = await fetch(`${API_BASE}/api/users/landscaper-profile/document/`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ action: "cancel", document_id: documentId }),
  });
  return handleResponse(response);
};
