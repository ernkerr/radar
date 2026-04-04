export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings_json: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings_json?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings_json?: Record<string, unknown> | null;
        };
      };
      users: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          role: string;
          notification_prefs: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          email: string;
          role?: string;
          notification_prefs?: Record<string, unknown> | null;
        };
        Update: {
          company_id?: string;
          email?: string;
          role?: string;
          notification_prefs?: Record<string, unknown> | null;
        };
      };
      suppliers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          country: string;
          certifications: string[] | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          country: string;
          certifications?: string[] | null;
          active?: boolean;
        };
        Update: {
          name?: string;
          country?: string;
          certifications?: string[] | null;
          active?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          species: string;
          scientific_name: string | null;
          origin: string;
          simp_covered: boolean;
          formats: string[] | null;
          production_method: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          species: string;
          scientific_name?: string | null;
          origin: string;
          simp_covered?: boolean;
          formats?: string[] | null;
          production_method?: string | null;
        };
        Update: {
          name?: string;
          species?: string;
          scientific_name?: string | null;
          origin?: string;
          simp_covered?: boolean;
          formats?: string[] | null;
          production_method?: string | null;
        };
      };
      sources: {
        Row: {
          id: string;
          name: string;
          source_type: "api" | "rss" | "page_monitor";
          url: string;
          schedule_cron: string | null;
          last_checked: string | null;
          status: "active" | "paused" | "error";
          config_json: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          source_type: "api" | "rss" | "page_monitor";
          url: string;
          schedule_cron?: string | null;
          status?: "active" | "paused" | "error";
          config_json?: Record<string, unknown> | null;
        };
        Update: {
          name?: string;
          source_type?: "api" | "rss" | "page_monitor";
          url?: string;
          schedule_cron?: string | null;
          status?: "active" | "paused" | "error";
          config_json?: Record<string, unknown> | null;
        };
      };
      raw_documents: {
        Row: {
          id: string;
          source_id: string;
          external_id: string | null;
          content_hash: string;
          raw_content: string;
          metadata_json: Record<string, unknown> | null;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          external_id?: string | null;
          content_hash: string;
          raw_content: string;
          metadata_json?: Record<string, unknown> | null;
          fetched_at?: string;
        };
        Update: {
          content_hash?: string;
          raw_content?: string;
          metadata_json?: Record<string, unknown> | null;
        };
      };
      ingestion_log: {
        Row: {
          id: string;
          source_id: string;
          status: "success" | "failure";
          error_message: string | null;
          duration_ms: number | null;
          records_fetched: number;
          ran_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          status: "success" | "failure";
          error_message?: string | null;
          duration_ms?: number | null;
          records_fetched?: number;
          ran_at?: string;
        };
        Update: {
          status?: "success" | "failure";
          error_message?: string | null;
        };
      };
    };
  };
};
