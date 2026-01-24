export interface LandscaperQuestionAnswer {
  question: string;
  answer: string;
}

export interface LandscaperSuggestedEdit {
  description: string;
  preview?: string;
}

export interface LandscaperResponse {
  message: string;
  questions_answered?: LandscaperQuestionAnswer[];
  suggested_edits?: LandscaperSuggestedEdit[];
  suggested_content?: object;
  suggested_preview_html?: string;
}

export interface ReviewMessage {
  id: string;
  role: 'landscaper' | 'user';
  message: string;
  timestamp?: string;
  response?: LandscaperResponse;
}
