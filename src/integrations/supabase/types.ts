export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      business_members: {
        Row: {
          activated_at: string | null
          business_id: string
          expires_at: string | null
          id: string
          invitation_email: string
          invitation_token: string | null
          invited_at: string
          member_id: string | null
          old_tokens: string[] | null
          parent_manager_id: string | null
          revoked_at: string | null
          role: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          business_id: string
          expires_at?: string | null
          id?: string
          invitation_email: string
          invitation_token?: string | null
          invited_at?: string
          member_id?: string | null
          old_tokens?: string[] | null
          parent_manager_id?: string | null
          revoked_at?: string | null
          role: string
          status: string
        }
        Update: {
          activated_at?: string | null
          business_id?: string
          expires_at?: string | null
          id?: string
          invitation_email?: string
          invitation_token?: string | null
          invited_at?: string
          member_id?: string | null
          old_tokens?: string[] | null
          parent_manager_id?: string | null
          revoked_at?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      finix_identities: {
        Row: {
          account_type: string
          business_id: string | null
          created_at: string | null
          email: string | null
          entity_data: Json
          finix_application_id: string
          finix_identity_id: string
          first_name: string | null
          id: string
          identity_type: string
          last_name: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          account_type: string
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          entity_data?: Json
          finix_application_id: string
          finix_identity_id: string
          first_name?: string | null
          id?: string
          identity_type: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          account_type?: string
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          entity_data?: Json
          finix_application_id?: string
          finix_identity_id?: string
          first_name?: string | null
          id?: string
          identity_type?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      fraud_attempts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          ip_address: string | null
          payment_instrument_id: string | null
          reason: string | null
          resolution_method: string | null
          resolved: boolean | null
          risk_level: string | null
          session_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          ip_address?: string | null
          payment_instrument_id?: string | null
          reason?: string | null
          resolution_method?: string | null
          resolved?: boolean | null
          risk_level?: string | null
          session_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          payment_instrument_id?: string | null
          reason?: string | null
          resolution_method?: string | null
          resolved?: boolean | null
          risk_level?: string | null
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fraud_sessions: {
        Row: {
          attempt_count: number | null
          created_at: string
          expires_at: string
          id: string
          last_attempt_at: string | null
          risk_score: number | null
          session_id: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          expires_at: string
          id?: string
          last_attempt_at?: string | null
          risk_score?: number | null
          session_id: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          last_attempt_at?: string | null
          risk_score?: number | null
          session_id?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          activated_at: string | null
          household_admin_id: string
          household_member_id: string | null
          id: string
          invitation_email: string
          invitation_token: string | null
          invited_at: string
          revoked_at: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          household_admin_id: string
          household_member_id?: string | null
          id?: string
          invitation_email: string
          invitation_token?: string | null
          invited_at?: string
          revoked_at?: string | null
          status: string
        }
        Update: {
          activated_at?: string | null
          household_admin_id?: string
          household_member_id?: string | null
          id?: string
          invitation_email?: string
          invitation_token?: string | null
          invited_at?: string
          revoked_at?: string | null
          status?: string
        }
        Relationships: []
      }
      municipal_bills: {
        Row: {
          account_type: string | null
          address: string
          amount_due: number
          bill_number: string
          business_legal_name: string | null
          category: string
          created_at: string
          delinquency_date: string | null
          due_date: string
          finix_merchant_id: string | null
          finix_transfer_id: string | null
          first_name: string | null
          fraud_session_id: string | null
          id: string
          idempotency_id: string | null
          is_payable: boolean | null
          issue_date: string
          last_name: string | null
          manual_municipality_override: string | null
          municipality_id: string | null
          municipality_routing_status: string | null
          notifications: Json
          paid_at: string | null
          past_due_date: string | null
          payment_confirmation_number: string | null
          payment_history: Json
          payment_method_type: string | null
          payment_status: string | null
          profile_id: string
          receipt_code: string
          routing_confidence_score: number | null
          sequence_number: number | null
          service_address: string | null
          service_zip_code: string | null
          status: string
          system_id: string | null
          transaction_id: string | null
          turn_off_date: string | null
          updated_at: string
          usage_details: Json
          user_address: string | null
          user_email: string | null
          user_id: string | null
          user_phone: string | null
          vendor: string
          vendor_account_number: string | null
          vendor_territory_code: string | null
        }
        Insert: {
          account_type?: string | null
          address: string
          amount_due: number
          bill_number: string
          business_legal_name?: string | null
          category: string
          created_at?: string
          delinquency_date?: string | null
          due_date: string
          finix_merchant_id?: string | null
          finix_transfer_id?: string | null
          first_name?: string | null
          fraud_session_id?: string | null
          id: string
          idempotency_id?: string | null
          is_payable?: boolean | null
          issue_date: string
          last_name?: string | null
          manual_municipality_override?: string | null
          municipality_id?: string | null
          municipality_routing_status?: string | null
          notifications: Json
          paid_at?: string | null
          past_due_date?: string | null
          payment_confirmation_number?: string | null
          payment_history?: Json
          payment_method_type?: string | null
          payment_status?: string | null
          profile_id: string
          receipt_code: string
          routing_confidence_score?: number | null
          sequence_number?: number | null
          service_address?: string | null
          service_zip_code?: string | null
          status: string
          system_id?: string | null
          transaction_id?: string | null
          turn_off_date?: string | null
          updated_at?: string
          usage_details: Json
          user_address?: string | null
          user_email?: string | null
          user_id?: string | null
          user_phone?: string | null
          vendor: string
          vendor_account_number?: string | null
          vendor_territory_code?: string | null
        }
        Update: {
          account_type?: string | null
          address?: string
          amount_due?: number
          bill_number?: string
          business_legal_name?: string | null
          category?: string
          created_at?: string
          delinquency_date?: string | null
          due_date?: string
          finix_merchant_id?: string | null
          finix_transfer_id?: string | null
          first_name?: string | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id?: string | null
          is_payable?: boolean | null
          issue_date?: string
          last_name?: string | null
          manual_municipality_override?: string | null
          municipality_id?: string | null
          municipality_routing_status?: string | null
          notifications?: Json
          paid_at?: string | null
          past_due_date?: string | null
          payment_confirmation_number?: string | null
          payment_history?: Json
          payment_method_type?: string | null
          payment_status?: string | null
          profile_id?: string
          receipt_code?: string
          routing_confidence_score?: number | null
          sequence_number?: number | null
          service_address?: string | null
          service_zip_code?: string | null
          status?: string
          system_id?: string | null
          transaction_id?: string | null
          turn_off_date?: string | null
          updated_at?: string
          usage_details?: Json
          user_address?: string | null
          user_email?: string | null
          user_id?: string | null
          user_phone?: string | null
          vendor?: string
          vendor_account_number?: string | null
          vendor_territory_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_municipal_bills_municipality"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_municipal_bills_system"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "municipal_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_bills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "municipal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_members: {
        Row: {
          activated_at: string | null
          expires_at: string | null
          id: string
          invitation_email: string
          invitation_token: string | null
          invited_at: string
          member_id: string | null
          municipal_id: string
          old_tokens: string[] | null
          revoked_at: string | null
          role: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_email: string
          invitation_token?: string | null
          invited_at?: string
          member_id?: string | null
          municipal_id: string
          old_tokens?: string[] | null
          revoked_at?: string | null
          role: string
          status: string
        }
        Update: {
          activated_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_email?: string
          invitation_token?: string | null
          invited_at?: string
          member_id?: string | null
          municipal_id?: string
          old_tokens?: string[] | null
          revoked_at?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      municipal_notification_preferences: {
        Row: {
          created_at: string
          email_bank_account_updates: boolean
          email_compliance_alerts: boolean
          email_payment_alerts: boolean
          email_report_generation: boolean
          email_system_maintenance: boolean
          email_user_registrations: boolean
          id: string
          municipality_id: string | null
          sms_bank_account_updates: boolean
          sms_compliance_alerts: boolean
          sms_payment_alerts: boolean
          sms_report_generation: boolean
          sms_system_maintenance: boolean
          sms_user_registrations: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_bank_account_updates?: boolean
          email_compliance_alerts?: boolean
          email_payment_alerts?: boolean
          email_report_generation?: boolean
          email_system_maintenance?: boolean
          email_user_registrations?: boolean
          id?: string
          municipality_id?: string | null
          sms_bank_account_updates?: boolean
          sms_compliance_alerts?: boolean
          sms_payment_alerts?: boolean
          sms_report_generation?: boolean
          sms_system_maintenance?: boolean
          sms_user_registrations?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_bank_account_updates?: boolean
          email_compliance_alerts?: boolean
          email_payment_alerts?: boolean
          email_report_generation?: boolean
          email_system_maintenance?: boolean
          email_user_registrations?: boolean
          id?: string
          municipality_id?: string | null
          sms_bank_account_updates?: boolean
          sms_compliance_alerts?: boolean
          sms_payment_alerts?: boolean
          sms_report_generation?: boolean
          sms_system_maintenance?: boolean
          sms_user_registrations?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      municipal_profiles: {
        Row: {
          account_status: string
          address: string
          business_type: string | null
          city: string
          created_at: string
          ein_number: string | null
          id: string
          name: string
          outstanding_amount: number
          parcel_number: string | null
          state: string
          type: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          account_status: string
          address: string
          business_type?: string | null
          city: string
          created_at?: string
          ein_number?: string | null
          id: string
          name: string
          outstanding_amount?: number
          parcel_number?: string | null
          state: string
          type: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          account_status?: string
          address?: string
          business_type?: string | null
          city?: string
          created_at?: string
          ein_number?: string | null
          id?: string
          name?: string
          outstanding_amount?: number
          parcel_number?: string | null
          state?: string
          type?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      municipal_sequence_counters: {
        Row: {
          created_at: string
          current_sequence: number
          id: string
          municipality_id: string
          system_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_sequence?: number
          id?: string
          municipality_id: string
          system_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_sequence?: number
          id?: string
          municipality_id?: string
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_sequence_counters_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_sequence_counters_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "municipal_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_systems: {
        Row: {
          code: string
          created_at: string
          id: string
          municipality_id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          municipality_id: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          municipality_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_systems_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_type: string
          bank_account_validation_check: string | null
          business_id: string | null
          business_name: string | null
          card_brand: string | null
          created_at: string
          department: string | null
          disabled_at: string | null
          enabled: boolean | null
          expires_at: string | null
          finix_application_id: string | null
          finix_funding_source: string | null
          finix_identity_id: string | null
          finix_payment_instrument_id: string | null
          finix_processor: string | null
          id: string
          is_default: boolean
          is_expired: boolean
          last_four: string
          method_name: string
          method_type: string
          payment_token: string
          updated_at: string
          user_id: string
          verification_status: string | null
        }
        Insert: {
          account_type?: string
          bank_account_validation_check?: string | null
          business_id?: string | null
          business_name?: string | null
          card_brand?: string | null
          created_at?: string
          department?: string | null
          disabled_at?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          finix_application_id?: string | null
          finix_funding_source?: string | null
          finix_identity_id?: string | null
          finix_payment_instrument_id?: string | null
          finix_processor?: string | null
          id?: string
          is_default?: boolean
          is_expired?: boolean
          last_four: string
          method_name: string
          method_type: string
          payment_token: string
          updated_at?: string
          user_id: string
          verification_status?: string | null
        }
        Update: {
          account_type?: string
          bank_account_validation_check?: string | null
          business_id?: string | null
          business_name?: string | null
          card_brand?: string | null
          created_at?: string
          department?: string | null
          disabled_at?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          finix_application_id?: string | null
          finix_funding_source?: string | null
          finix_identity_id?: string | null
          finix_payment_instrument_id?: string | null
          finix_processor?: string | null
          id?: string
          is_default?: boolean
          is_expired?: boolean
          last_four?: string
          method_name?: string
          method_type?: string
          payment_token?: string
          updated_at?: string
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          account_type: string | null
          amount_cents: number
          bill_id: string
          bill_number: string | null
          billing_city: string | null
          billing_state: string | null
          billing_street_address: string | null
          billing_zip_code: string | null
          business_legal_name: string | null
          card_brand: string | null
          category: string | null
          confirmation_number: string
          created_at: string | null
          currency: string | null
          fee_amount_cents: number | null
          finix_payment_instrument_id: string | null
          finix_transfer_id: string
          fraud_session_id: string | null
          id: string
          merchant_name: string | null
          metadata: Json | null
          method_name: string | null
          municipality_id: string | null
          net_amount_cents: number | null
          payment_method_id: string | null
          payment_method_last_four: string | null
          payment_method_type: string
          processed_at: string | null
          receipt_generated_at: string | null
          receipt_url: string | null
          service_address: string | null
          status: string
          system_id: string | null
          transaction_id: string
          updated_at: string | null
          user_email: string | null
          user_first_name: string | null
          user_id: string
          user_last_name: string | null
          user_phone: string | null
          vendor: string | null
          verification_status: string | null
        }
        Insert: {
          account_type?: string | null
          amount_cents: number
          bill_id: string
          bill_number?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_street_address?: string | null
          billing_zip_code?: string | null
          business_legal_name?: string | null
          card_brand?: string | null
          category?: string | null
          confirmation_number: string
          created_at?: string | null
          currency?: string | null
          fee_amount_cents?: number | null
          finix_payment_instrument_id?: string | null
          finix_transfer_id: string
          fraud_session_id?: string | null
          id?: string
          merchant_name?: string | null
          metadata?: Json | null
          method_name?: string | null
          municipality_id?: string | null
          net_amount_cents?: number | null
          payment_method_id?: string | null
          payment_method_last_four?: string | null
          payment_method_type: string
          processed_at?: string | null
          receipt_generated_at?: string | null
          receipt_url?: string | null
          service_address?: string | null
          status?: string
          system_id?: string | null
          transaction_id: string
          updated_at?: string | null
          user_email?: string | null
          user_first_name?: string | null
          user_id: string
          user_last_name?: string | null
          user_phone?: string | null
          vendor?: string | null
          verification_status?: string | null
        }
        Update: {
          account_type?: string | null
          amount_cents?: number
          bill_id?: string
          bill_number?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_street_address?: string | null
          billing_zip_code?: string | null
          business_legal_name?: string | null
          card_brand?: string | null
          category?: string | null
          confirmation_number?: string
          created_at?: string | null
          currency?: string | null
          fee_amount_cents?: number | null
          finix_payment_instrument_id?: string | null
          finix_transfer_id?: string
          fraud_session_id?: string | null
          id?: string
          merchant_name?: string | null
          metadata?: Json | null
          method_name?: string | null
          municipality_id?: string | null
          net_amount_cents?: number | null
          payment_method_id?: string | null
          payment_method_last_four?: string | null
          payment_method_type?: string
          processed_at?: string | null
          receipt_generated_at?: string | null
          receipt_url?: string | null
          service_address?: string | null
          status?: string
          system_id?: string | null
          transaction_id?: string
          updated_at?: string | null
          user_email?: string | null
          user_first_name?: string | null
          user_id?: string
          user_last_name?: string | null
          user_phone?: string | null
          vendor?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_records_payment_method"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payment_records_system"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "municipal_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          address_validation_status: string | null
          apt_number: string | null
          business_legal_name: string | null
          city: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          industry: string | null
          last_name: string
          municipality_name: string | null
          original_address: Json | null
          phone: string | null
          role: string
          standardized_address: Json | null
          state: string | null
          street_address: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          account_type: string
          address_validation_status?: string | null
          apt_number?: string | null
          business_legal_name?: string | null
          city?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          industry?: string | null
          last_name: string
          municipality_name?: string | null
          original_address?: Json | null
          phone?: string | null
          role?: string
          standardized_address?: Json | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          account_type?: string
          address_validation_status?: string | null
          apt_number?: string | null
          business_legal_name?: string | null
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          industry?: string | null
          last_name?: string
          municipality_name?: string | null
          original_address?: Json | null
          phone?: string | null
          role?: string
          standardized_address?: Json | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          entity_id: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string
          created_at: string
          id: string
          license_plate: string
          make: string
          model: string
          state: string
          updated_at: string
          user_id: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          license_plate: string
          make: string
          model: string
          state: string
          updated_at?: string
          user_id: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          license_plate?: string
          make?: string
          model?: string
          state?: string
          updated_at?: string
          user_id?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role_to_user: {
        Args: { _user_id: string; _role_name: string; _entity_id?: string }
        Returns: boolean
      }
      calculate_bank_account_priority: {
        Args: { account_id: string }
        Returns: number
      }
      check_address_duplicate: {
        Args: {
          street_input: string
          city_input: string
          state_input: string
          zip_input: string
          apt_input?: string
        }
        Returns: boolean
      }
      check_email_duplicate: {
        Args: { email_input: string }
        Returns: boolean
      }
      cleanup_expired_fraud_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_verification_codes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      count_payment_methods: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_payment_method: {
        Args:
          | {
              p_method_name: string
              p_payment_token: string
              p_method_type: string
              p_last_four: string
              p_account_type?: string
              p_business_name?: string
              p_department?: string
              p_business_id?: string
              p_expires_at?: string
              p_card_brand?: string
              p_bank_account_validation_check?: string
            }
          | {
              p_method_name: string
              p_payment_token: string
              p_method_type: string
              p_last_four: string
              p_account_type?: string
              p_business_name?: string
              p_department?: string
              p_business_id?: string
              p_expires_at?: string
              p_card_brand?: string
              p_bank_account_validation_check?: string
              p_finix_payment_instrument_id?: string
              p_finix_identity_id?: string
            }
        Returns: {
          account_type: string
          bank_account_validation_check: string | null
          business_id: string | null
          business_name: string | null
          card_brand: string | null
          created_at: string
          department: string | null
          disabled_at: string | null
          enabled: boolean | null
          expires_at: string | null
          finix_application_id: string | null
          finix_funding_source: string | null
          finix_identity_id: string | null
          finix_payment_instrument_id: string | null
          finix_processor: string | null
          id: string
          is_default: boolean
          is_expired: boolean
          last_four: string
          method_name: string
          method_type: string
          payment_token: string
          updated_at: string
          user_id: string
          verification_status: string | null
        }
      }
      delete_payment_method: {
        Args: { p_id: string }
        Returns: undefined
      }
      enable_payment_method: {
        Args: { p_id: string }
        Returns: undefined
      }
      get_household_admin_id: {
        Args: { member_id: string }
        Returns: string
      }
      get_next_sequence_number: {
        Args: { p_municipality_id: string; p_system_id: string }
        Returns: number
      }
      get_payment_methods: {
        Args: Record<PropertyKey, never> | { p_account_type?: string }
        Returns: {
          account_type: string
          bank_account_validation_check: string | null
          business_id: string | null
          business_name: string | null
          card_brand: string | null
          created_at: string
          department: string | null
          disabled_at: string | null
          enabled: boolean | null
          expires_at: string | null
          finix_application_id: string | null
          finix_funding_source: string | null
          finix_identity_id: string | null
          finix_payment_instrument_id: string | null
          finix_processor: string | null
          id: string
          is_default: boolean
          is_expired: boolean
          last_four: string
          method_name: string
          method_type: string
          payment_token: string
          updated_at: string
          user_id: string
          verification_status: string | null
        }[]
      }
      get_role_id_by_name: {
        Args: { _role_name: string }
        Returns: string
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: string
          entity_id: string
        }[]
      }
      has_any_role: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _user_id: string; _permission: string; _entity_id?: string }
        Returns: boolean
      }
      has_role: {
        Args:
          | {
              _user_id: string
              _role: Database["public"]["Enums"]["app_role"]
              _entity_id?: string
            }
          | { _user_id: string; _role: string; _entity_id?: string }
        Returns: boolean
      }
      insert_bills_for_cmelka_accounts: {
        Args: { target_email: string }
        Returns: {
          bills_created: number
          success_message: string
        }[]
      }
      is_business_admin: {
        Args: { business_id: string }
        Returns: boolean
      }
      is_business_manager: {
        Args: { business_id: string }
        Returns: boolean
      }
      is_household_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_household_member: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_in_same_household: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      is_manager_of_user: {
        Args: { manager_id: string; user_id: string }
        Returns: boolean
      }
      is_municipal_admin: {
        Args: { municipal_id?: string }
        Returns: boolean
      }
      log_address2_event: {
        Args: {
          p_event_type: string
          p_original_value: string
          p_standardized_value?: string
          p_component_type?: string
          p_confidence_level?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      migrate_business_admins: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      migrate_payment_records_metadata: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      remove_role_from_user: {
        Args: { _user_id: string; _role_name: string; _entity_id?: string }
        Returns: boolean
      }
      set_default_payment_method: {
        Args: { p_id: string } | { p_id: string; p_account_type?: string }
        Returns: undefined
      }
      update_bank_account_priorities: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "superAdmin"
        | "municipalAdmin"
        | "municipalUser"
        | "residentAdmin"
        | "residentUser"
        | "businessOwner"
        | "businessAdmin"
        | "businessUser"
      payment_method_type: "card" | "ach"
      vehicle_type: "personal" | "business"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "superAdmin",
        "municipalAdmin",
        "municipalUser",
        "residentAdmin",
        "residentUser",
        "businessOwner",
        "businessAdmin",
        "businessUser",
      ],
      payment_method_type: ["card", "ach"],
      vehicle_type: ["personal", "business"],
    },
  },
} as const
