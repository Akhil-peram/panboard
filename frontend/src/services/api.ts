const API_BASE_URL = 'https://panboard.onrender.com';

export interface InsightItem {
  type: 'warning' | 'info' | 'success';
  category: string;
  title: string;
  description: string;
  column?: string | null;
}

export interface InsightsData {
  health_score: number;
  items: InsightItem[];
}

export interface UploadResponse {
  dataset_id: string;
  filename: string;
  columns: string[];
  numeric_columns: string[];
  categorical_columns: string[];
  row_count: number;
  info: Record<string, { type: string; missing: number; unique: number }>;
  stats: Record<string, { mean: number; median: number; min: number; max: number; std: number }>;
  categorical_summary: Record<string, { name: string; value: number }[]>;
  correlation: Record<string, Record<string, number>>;
  sample_data: Record<string, string | number | boolean | null>[];
  insights?: InsightsData;
  error?: string;
}

export interface TransformPayload {
  action: 'impute' | 'cast' | 'rename' | 'filter' | 'reset';
  column: string;
  strategy?: 'mean' | 'median' | 'mode' | 'value';
  fill_value?: string | number | boolean | null;
  value?: string | number | boolean | null;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
  new_name?: string;
  data_type?: 'int' | 'float' | 'str' | 'datetime';
}

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload file');
  }

  return response.json();
};

export const transformDataset = async (datasetId: string, payload: TransformPayload): Promise<UploadResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/transform/${datasetId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to transform dataset');
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

export const getExportUrl = (datasetId: string, format: 'csv' | 'xlsx' | 'json'): string => {
  return `${API_BASE_URL}/api/export/${datasetId}?format=${format}`;
};



