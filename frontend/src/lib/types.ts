export interface ProjectSummaryData {
  project_name: string;

  period_label: string; 
  counts: {
    todo: number;
    in_progress: number;
    done: number;
  };
  total_items: number;
}

export interface InProgressTask {
  id: string;
  project: string;
  title: string;
  assignee_name: string;
  updated_at: string;
}