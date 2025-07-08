export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          annual_ach_volume: number | null
          annual_card_volume: number | null
          average_ach_amount: number | null
          average_card_amount: number | null
          b2b_percentage: number | null
          b2c_percentage: number | null
          business_address_line1: string
          business_address_line2: string | null
          business_city: string
          business_country: string | null
          business_state: string
          business_zip_code: string
          card_present_percentage: number | null
          created_at: string | null
          customer_id: string
          date_of_birth: Json | null
          doing_business_as: string
          ecommerce_percentage: number | null
          entity_description: string
          entity_phone: string
          entity_type: string
          entity_website: string | null
          first_name: string
          has_accepted_cards_previously: boolean | null
          incorporation_date: Json | null
          job_title: string
          last_name: string
          legal_entity_name: string
          max_ach_amount: number | null
          max_card_amount: number | null
          mcc_code: string
          moto_percentage: number | null
          ownership_percentage: number | null
          ownership_type: string
          p2p_percentage: number | null
          personal_address_line1: string
          personal_address_line2: string | null
          personal_city: string
          personal_country: string | null
          personal_phone: string
          personal_state: string
          personal_tax_id: string | null
          personal_zip_code: string
          refund_policy: string | null
          status: string | null
          tax_id: string
          updated_at: string | null
          user_id: string
          work_email: string
        }
        Insert: {
          annual_ach_volume?: number | null
          annual_card_volume?: number | null
          average_ach_amount?: number | null
          average_card_amount?: number | null
          b2b_percentage?: number | null
          b2c_percentage?: number | null
          business_address_line1: string
          business_address_line2?: string | null
          business_city: string
          business_country?: string | null
          business_state: string
          business_zip_code: string
          card_present_percentage?: number | null
          created_at?: string | null
          customer_id?: string
          date_of_birth?: Json | null
          doing_business_as: string
          ecommerce_percentage?: number | null
          entity_description: string
          entity_phone: string
          entity_type: string
          entity_website?: string | null
          first_name: string
          has_accepted_cards_previously?: boolean | null
          incorporation_date?: Json | null
          job_title: string
          last_name: string
          legal_entity_name: string
          max_ach_amount?: number | null
          max_card_amount?: number | null
          mcc_code: string
          moto_percentage?: number | null
          ownership_percentage?: number | null
          ownership_type: string
          p2p_percentage?: number | null
          personal_address_line1: string
          personal_address_line2?: string | null
          personal_city: string
          personal_country?: string | null
          personal_phone: string
          personal_state: string
          personal_tax_id?: string | null
          personal_zip_code: string
          refund_policy?: string | null
          status?: string | null
          tax_id: string
          updated_at?: string | null
          user_id: string
          work_email: string
        }
        Update: {
          annual_ach_volume?: number | null
          annual_card_volume?: number | null
          average_ach_amount?: number | null
          average_card_amount?: number | null
          b2b_percentage?: number | null
          b2c_percentage?: number | null
          business_address_line1?: string
          business_address_line2?: string | null
          business_city?: string
          business_country?: string | null
          business_state?: string
          business_zip_code?: string
          card_present_percentage?: number | null
          created_at?: string | null
          customer_id?: string
          date_of_birth?: Json | null
          doing_business_as?: string
          ecommerce_percentage?: number | null
          entity_description?: string
          entity_phone?: string
          entity_type?: string
          entity_website?: string | null
          first_name?: string
          has_accepted_cards_previously?: boolean | null
          incorporation_date?: Json | null
          job_title?: string
          last_name?: string
          legal_entity_name?: string
          max_ach_amount?: number | null
          max_card_amount?: number | null
          mcc_code?: string
          moto_percentage?: number | null
          ownership_percentage?: number | null
          ownership_type?: string
          p2p_percentage?: number | null
          personal_address_line1?: string
          personal_address_line2?: string | null
          personal_city?: string
          personal_country?: string | null
          personal_phone?: string
          personal_state?: string
          personal_tax_id?: string | null
          personal_zip_code?: string
          refund_policy?: string | null
          status?: string | null
          tax_id?: string
          updated_at?: string | null
          user_id?: string
          work_email?: string
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
      merchants: {
        Row: {
          annual_ach_volume: number
          annual_card_volume: number
          average_ach_amount: number
          average_card_amount: number
          b2b_percentage: number
          b2c_percentage: number
          bank_account_holder_name: string
          bank_account_number: string
          bank_account_number_confirmation: string
          bank_account_type: string
          bank_routing_number: string
          business_address_city: string
          business_address_country: string
          business_address_line1: string
          business_address_line2: string | null
          business_address_state: string
          business_address_zip_code: string
          business_description: string
          business_name: string
          business_phone: string
          business_tax_id: string
          business_type: string
          business_website: string | null
          card_present_percentage: number
          created_at: string
          credit_check_consent: boolean
          credit_check_ip_address: string | null
          credit_check_timestamp: string | null
          credit_check_user_agent: string | null
          customer_apt_number: string | null
          customer_city: string
          customer_country: string
          customer_email: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          customer_state: string
          customer_street_address: string
          customer_zip_code: string
          doing_business_as: string
          ecommerce_percentage: number
          finix_application_id: string | null
          finix_entity_data: Json | null
          finix_identity_id: string | null
          finix_merchant_id: string | null
          finix_raw_response: Json | null
          finix_tags: Json | null
          has_accepted_cards_previously: boolean
          id: string
          incorporation_date: string | null
          level_two_level_three_data_enabled: boolean | null
          max_ach_amount: number
          max_card_amount: number
          mcc_code: string
          merchant_agreement_accepted: boolean
          merchant_agreement_ip_address: string
          merchant_agreement_timestamp: string
          merchant_agreement_user_agent: string
          merchant_name: string
          moto_percentage: number
          notes: string | null
          owner_date_of_birth: string | null
          owner_first_name: string
          owner_job_title: string
          owner_last_name: string
          owner_ownership_percentage: number | null
          owner_personal_address_city: string
          owner_personal_address_country: string
          owner_personal_address_line1: string
          owner_personal_address_line2: string | null
          owner_personal_address_state: string
          owner_personal_address_zip_code: string
          owner_personal_phone: string
          owner_personal_tax_id: string | null
          owner_work_email: string
          ownership_type: string
          p2p_percentage: number
          processing_status: string
          refund_policy: string
          statement_descriptor: string
          submission_metadata: Json | null
          updated_at: string
          user_id: string
          verification_status: string
        }
        Insert: {
          annual_ach_volume?: number
          annual_card_volume?: number
          average_ach_amount?: number
          average_card_amount?: number
          b2b_percentage?: number
          b2c_percentage?: number
          bank_account_holder_name: string
          bank_account_number: string
          bank_account_number_confirmation: string
          bank_account_type: string
          bank_routing_number: string
          business_address_city: string
          business_address_country?: string
          business_address_line1: string
          business_address_line2?: string | null
          business_address_state: string
          business_address_zip_code: string
          business_description: string
          business_name: string
          business_phone: string
          business_tax_id: string
          business_type: string
          business_website?: string | null
          card_present_percentage?: number
          created_at?: string
          credit_check_consent?: boolean
          credit_check_ip_address?: string | null
          credit_check_timestamp?: string | null
          credit_check_user_agent?: string | null
          customer_apt_number?: string | null
          customer_city: string
          customer_country?: string
          customer_email: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          customer_state: string
          customer_street_address: string
          customer_zip_code: string
          doing_business_as: string
          ecommerce_percentage?: number
          finix_application_id?: string | null
          finix_entity_data?: Json | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_raw_response?: Json | null
          finix_tags?: Json | null
          has_accepted_cards_previously?: boolean
          id?: string
          incorporation_date?: string | null
          level_two_level_three_data_enabled?: boolean | null
          max_ach_amount?: number
          max_card_amount?: number
          mcc_code: string
          merchant_agreement_accepted: boolean
          merchant_agreement_ip_address: string
          merchant_agreement_timestamp: string
          merchant_agreement_user_agent: string
          merchant_name: string
          moto_percentage?: number
          notes?: string | null
          owner_date_of_birth?: string | null
          owner_first_name: string
          owner_job_title: string
          owner_last_name: string
          owner_ownership_percentage?: number | null
          owner_personal_address_city: string
          owner_personal_address_country?: string
          owner_personal_address_line1: string
          owner_personal_address_line2?: string | null
          owner_personal_address_state: string
          owner_personal_address_zip_code: string
          owner_personal_phone: string
          owner_personal_tax_id?: string | null
          owner_work_email: string
          ownership_type: string
          p2p_percentage?: number
          processing_status?: string
          refund_policy: string
          statement_descriptor: string
          submission_metadata?: Json | null
          updated_at?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          annual_ach_volume?: number
          annual_card_volume?: number
          average_ach_amount?: number
          average_card_amount?: number
          b2b_percentage?: number
          b2c_percentage?: number
          bank_account_holder_name?: string
          bank_account_number?: string
          bank_account_number_confirmation?: string
          bank_account_type?: string
          bank_routing_number?: string
          business_address_city?: string
          business_address_country?: string
          business_address_line1?: string
          business_address_line2?: string | null
          business_address_state?: string
          business_address_zip_code?: string
          business_description?: string
          business_name?: string
          business_phone?: string
          business_tax_id?: string
          business_type?: string
          business_website?: string | null
          card_present_percentage?: number
          created_at?: string
          credit_check_consent?: boolean
          credit_check_ip_address?: string | null
          credit_check_timestamp?: string | null
          credit_check_user_agent?: string | null
          customer_apt_number?: string | null
          customer_city?: string
          customer_country?: string
          customer_email?: string
          customer_first_name?: string
          customer_last_name?: string
          customer_phone?: string
          customer_state?: string
          customer_street_address?: string
          customer_zip_code?: string
          doing_business_as?: string
          ecommerce_percentage?: number
          finix_application_id?: string | null
          finix_entity_data?: Json | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_raw_response?: Json | null
          finix_tags?: Json | null
          has_accepted_cards_previously?: boolean
          id?: string
          incorporation_date?: string | null
          level_two_level_three_data_enabled?: boolean | null
          max_ach_amount?: number
          max_card_amount?: number
          mcc_code?: string
          merchant_agreement_accepted?: boolean
          merchant_agreement_ip_address?: string
          merchant_agreement_timestamp?: string
          merchant_agreement_user_agent?: string
          merchant_name?: string
          moto_percentage?: number
          notes?: string | null
          owner_date_of_birth?: string | null
          owner_first_name?: string
          owner_job_title?: string
          owner_last_name?: string
          owner_ownership_percentage?: number | null
          owner_personal_address_city?: string
          owner_personal_address_country?: string
          owner_personal_address_line1?: string
          owner_personal_address_line2?: string | null
          owner_personal_address_state?: string
          owner_personal_address_zip_code?: string
          owner_personal_phone?: string
          owner_personal_tax_id?: string | null
          owner_work_email?: string
          ownership_type?: string
          p2p_percentage?: number
          processing_status?: string
          refund_policy?: string
          statement_descriptor?: string
          submission_metadata?: Json | null
          updated_at?: string
          user_id?: string
          verification_status?: string
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
          municipality_name: string | null
          municipality_routing_status: string | null
          notifications: Json
          paid_at: string | null
          past_due_date: string | null
          payment_confirmation_number: string | null
          payment_history: Json
          payment_method_type: string | null
          payment_status: string | null
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
          municipality_name?: string | null
          municipality_routing_status?: string | null
          notifications: Json
          paid_at?: string | null
          past_due_date?: string | null
          payment_confirmation_number?: string | null
          payment_history?: Json
          payment_method_type?: string | null
          payment_status?: string | null
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
          municipality_name?: string | null
          municipality_routing_status?: string | null
          notifications?: Json
          paid_at?: string | null
          past_due_date?: string | null
          payment_confirmation_number?: string | null
          payment_history?: Json
          payment_method_type?: string | null
          payment_status?: string | null
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
      organization_invitations: {
        Row: {
          activated_at: string | null
          email_sent_at: string | null
          email_status: string | null
          expires_at: string | null
          id: string
          invitation_email: string
          invitation_token: string | null
          invited_at: string
          old_tokens: string[] | null
          organization_admin_id: string
          organization_type: string
          revoked_at: string | null
          role: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string | null
          id?: string
          invitation_email: string
          invitation_token?: string | null
          invited_at?: string
          old_tokens?: string[] | null
          organization_admin_id: string
          organization_type: string
          revoked_at?: string | null
          role: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string | null
          id?: string
          invitation_email?: string
          invitation_token?: string | null
          invited_at?: string
          old_tokens?: string[] | null
          organization_admin_id?: string
          organization_type?: string
          revoked_at?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      organization_memberships: {
        Row: {
          id: string
          joined_at: string
          member_id: string
          organization_admin_id: string
          organization_type: string
          role: string
          status: string
        }
        Insert: {
          id?: string
          joined_at?: string
          member_id: string
          organization_admin_id: string
          organization_type: string
          role: string
          status?: string
        }
        Update: {
          id?: string
          joined_at?: string
          member_id?: string
          organization_admin_id?: string
          organization_type?: string
          role?: string
          status?: string
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
          instrument_type: string | null
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
          instrument_type?: string | null
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
          instrument_type?: string | null
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
      user_notification_preferences: {
        Row: {
          created_at: string
          email_bill_posting: boolean
          email_payment_confirmation: boolean
          id: string
          sms_bill_posting: boolean
          sms_payment_confirmation: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_bill_posting?: boolean
          email_payment_confirmation?: boolean
          id?: string
          sms_bill_posting?: boolean
          sms_payment_confirmation?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_bill_posting?: boolean
          email_payment_confirmation?: boolean
          id?: string
          sms_bill_posting?: boolean
          sms_payment_confirmation?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_payment_instruments: {
        Row: {
          bank_account_type: string | null
          bank_account_validation_check: string | null
          bank_code: string | null
          bank_country: string | null
          bank_institution_number: string | null
          bank_last_four: string | null
          bank_masked_account_number: string | null
          bank_name: string | null
          bank_transit_number: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          billing_region: string | null
          card_account_updater_enabled: boolean | null
          card_address_verification: string | null
          card_bin: string | null
          card_brand: string | null
          card_expiration_month: number | null
          card_expiration_year: number | null
          card_issuer_country: string | null
          card_last_four: string | null
          card_name: string | null
          card_network_token_enabled: boolean | null
          card_network_token_state: string | null
          card_security_code_verification: string | null
          card_type: string | null
          created_at: string
          created_via: string | null
          currency: string
          disabled_at: string | null
          disabled_code: string | null
          disabled_message: string | null
          enabled: boolean
          finix_application_id: string | null
          finix_created_at: string | null
          finix_fingerprint: string | null
          finix_identity_id: string
          finix_links: Json | null
          finix_payment_instrument_id: string
          finix_tags: Json | null
          finix_updated_at: string | null
          id: string
          instrument_type: string
          is_default: boolean
          nickname: string | null
          raw_finix_response: Json | null
          status: string
          third_party: string | null
          third_party_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_type?: string | null
          bank_account_validation_check?: string | null
          bank_code?: string | null
          bank_country?: string | null
          bank_institution_number?: string | null
          bank_last_four?: string | null
          bank_masked_account_number?: string | null
          bank_name?: string | null
          bank_transit_number?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_region?: string | null
          card_account_updater_enabled?: boolean | null
          card_address_verification?: string | null
          card_bin?: string | null
          card_brand?: string | null
          card_expiration_month?: number | null
          card_expiration_year?: number | null
          card_issuer_country?: string | null
          card_last_four?: string | null
          card_name?: string | null
          card_network_token_enabled?: boolean | null
          card_network_token_state?: string | null
          card_security_code_verification?: string | null
          card_type?: string | null
          created_at?: string
          created_via?: string | null
          currency?: string
          disabled_at?: string | null
          disabled_code?: string | null
          disabled_message?: string | null
          enabled?: boolean
          finix_application_id?: string | null
          finix_created_at?: string | null
          finix_fingerprint?: string | null
          finix_identity_id: string
          finix_links?: Json | null
          finix_payment_instrument_id: string
          finix_tags?: Json | null
          finix_updated_at?: string | null
          id?: string
          instrument_type: string
          is_default?: boolean
          nickname?: string | null
          raw_finix_response?: Json | null
          status?: string
          third_party?: string | null
          third_party_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_type?: string | null
          bank_account_validation_check?: string | null
          bank_code?: string | null
          bank_country?: string | null
          bank_institution_number?: string | null
          bank_last_four?: string | null
          bank_masked_account_number?: string | null
          bank_name?: string | null
          bank_transit_number?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_region?: string | null
          card_account_updater_enabled?: boolean | null
          card_address_verification?: string | null
          card_bin?: string | null
          card_brand?: string | null
          card_expiration_month?: number | null
          card_expiration_year?: number | null
          card_issuer_country?: string | null
          card_last_four?: string | null
          card_name?: string | null
          card_network_token_enabled?: boolean | null
          card_network_token_state?: string | null
          card_security_code_verification?: string | null
          card_type?: string | null
          created_at?: string
          created_via?: string | null
          currency?: string
          disabled_at?: string | null
          disabled_code?: string | null
          disabled_message?: string | null
          enabled?: boolean
          finix_application_id?: string | null
          finix_created_at?: string | null
          finix_fingerprint?: string | null
          finix_identity_id?: string
          finix_links?: Json | null
          finix_payment_instrument_id?: string
          finix_tags?: Json | null
          finix_updated_at?: string | null
          id?: string
          instrument_type?: string
          is_default?: boolean
          nickname?: string | null
          raw_finix_response?: Json | null
          status?: string
          third_party?: string | null
          third_party_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_payment_instruments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      verification_codes: {
        Row: {
          attempt_count: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          status: string
          updated_at: string
          user_identifier: string
          verification_type: string
        }
        Insert: {
          attempt_count?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          status?: string
          updated_at?: string
          user_identifier: string
          verification_type: string
        }
        Update: {
          attempt_count?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_identifier?: string
          verification_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { p_invitation_token: string }
        Returns: boolean
      }
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
      create_organization_invitation: {
        Args: {
          p_invitation_email: string
          p_role: string
          p_organization_type: string
        }
        Returns: string
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
      disable_user_payment_instrument: {
        Args: { p_id: string }
        Returns: undefined
      }
      enable_payment_method: {
        Args: { p_id: string }
        Returns: undefined
      }
      get_available_payment_methods: {
        Args: { user_id: string }
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
      get_available_vehicles: {
        Args: { user_id: string }
        Returns: {
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
        }[]
      }
      get_household_admin_id: {
        Args: { member_id: string }
        Returns: string
      }
      get_next_sequence_number: {
        Args: { p_municipality_id: string; p_system_id: string }
        Returns: number
      }
      get_organization_members: {
        Args: { user_id: string }
        Returns: {
          id: string
          member_id: string
          role: string
          organization_type: string
          joined_at: string
          first_name: string
          last_name: string
          email: string
          phone: string
        }[]
      }
      get_payment_instrument_display_name: {
        Args: {
          p_nickname: string
          p_instrument_type: string
          p_card_brand: string
          p_card_last_four: string
          p_bank_last_four: string
        }
        Returns: string
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
      get_user_payment_instruments_with_display_names: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          finix_payment_instrument_id: string
          instrument_type: string
          nickname: string
          display_name: string
          is_default: boolean
          enabled: boolean
          status: string
          card_brand: string
          card_last_four: string
          card_expiration_month: number
          card_expiration_year: number
          bank_account_type: string
          bank_last_four: string
          billing_address_line1: string
          billing_city: string
          billing_region: string
          billing_postal_code: string
          created_at: string
          updated_at: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: string
          entity_id: string
        }[]
      }
      has_permission: {
        Args: { _user_id: string; _permission: string; _entity_id?: string }
        Returns: boolean
      }
      has_role: {
        Args: { _user_id: string; _role: string; _entity_id?: string }
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
      is_in_same_organization: {
        Args: { user_a: string; user_b: string }
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
      set_default_user_payment_instrument: {
        Args: { p_id: string }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
        "businessAdmin",
        "businessUser",
      ],
      payment_method_type: ["card", "ach"],
      vehicle_type: ["personal", "business"],
    },
  },
} as const
