export interface DesignBrief {
  name: string;
  silhouette: string;
  fabric: string;
  palette: string[];
  occasion: string;
  mood: string;
  styling_notes: string;
  model_type: string;
  image_prompt: string;
  collection_notes?: string;
}

export interface Design {
  id: string;
  user_id: string;
  collection_id: string | null;
  name: string;
  prompt: string;
  brief: DesignBrief | null;
  image_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
}
