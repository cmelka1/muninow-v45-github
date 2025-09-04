export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bill_matching_queue: {
        Row: {
          bill_id: string | null
          created_at: string | null
          id: string
          processed: boolean | null
          processed_at: string | null
          trigger_type: string | null
          user_id: string | null
        }
        Insert: {
          bill_id?: string | null
          created_at?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          trigger_type?: string | null
          user_id?: string | null
        }
        Update: {
          bill_id?: string | null
          created_at?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          trigger_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bill_notifications: {
        Row: {
          bill_id: string
          created_at: string
          customer_id: string
          delivery_method: string
          delivery_status: string
          error_message: string | null
          id: string
          merchant_id: string | null
          message_body: string | null
          message_subject: string | null
          municipal_employee_name: string | null
          municipal_user_id: string
          notification_type: string
          sent_at: string | null
          updated_at: string
          user_id: string | null
          visit_notes: string | null
        }
        Insert: {
          bill_id: string
          created_at?: string
          customer_id: string
          delivery_method: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          merchant_id?: string | null
          message_body?: string | null
          message_subject?: string | null
          municipal_employee_name?: string | null
          municipal_user_id: string
          notification_type: string
          sent_at?: string | null
          updated_at?: string
          user_id?: string | null
          visit_notes?: string | null
        }
        Update: {
          bill_id?: string
          created_at?: string
          customer_id?: string
          delivery_method?: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          merchant_id?: string | null
          message_body?: string | null
          message_subject?: string | null
          municipal_employee_name?: string | null
          municipal_user_id?: string
          notification_type?: string
          sent_at?: string | null
          updated_at?: string
          user_id?: string | null
          visit_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bill_notifications_bill_id"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "master_bills"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "fk_bill_notifications_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "fk_bill_notifications_municipal_user_id"
            columns: ["municipal_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bill_notifications_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_processing_failures: {
        Row: {
          bill_id: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          manual_review_required: boolean | null
          raw_bill_data: Json | null
          retry_count: number | null
        }
        Insert: {
          bill_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          manual_review_required?: boolean | null
          raw_bill_data?: Json | null
          retry_count?: number | null
        }
        Update: {
          bill_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          manual_review_required?: boolean | null
          raw_bill_data?: Json | null
          retry_count?: number | null
        }
        Relationships: []
      }
      business_license_applications: {
        Row: {
          ach_basis_points: number | null
          ach_fixed_fee: number | null
          additional_info: Json | null
          application_status:
            | Database["public"]["Enums"]["business_license_status_enum"]
            | null
          approved_at: string | null
          assigned_reviewer_id: string | null
          base_fee_cents: number | null
          basis_points: number | null
          business_apt_number: string | null
          business_city: string
          business_country: string | null
          business_description: string | null
          business_email: string | null
          business_legal_name: string
          business_phone: string | null
          business_state: string
          business_street_address: string
          business_type: string
          business_zip_code: string
          created_at: string
          customer_id: string
          denial_reason: string | null
          denied_at: string | null
          doing_business_as: string | null
          expired_at: string | null
          federal_ein: string | null
          finix_fee_profile_id: string | null
          finix_merchant_id: string | null
          finix_transfer_id: string | null
          fixed_fee: number | null
          form_responses: Json | null
          fraud_session_id: string | null
          id: string
          idempotency_id: string | null
          information_requested_at: string | null
          issued_at: string | null
          license_number: string | null
          license_type_id: string | null
          merchant_fee_profile_id: string | null
          merchant_finix_identity_id: string | null
          merchant_id: string | null
          merchant_name: string | null
          owner_apt_number: string | null
          owner_city: string
          owner_country: string | null
          owner_email: string | null
          owner_first_name: string
          owner_last_name: string
          owner_phone: string | null
          owner_state: string
          owner_street_address: string
          owner_title: string | null
          owner_zip_code: string
          payment_instrument_id: string | null
          payment_method_type: string | null
          payment_processed_at: string | null
          payment_status: string | null
          payment_type: string | null
          resubmitted_at: string | null
          review_notes: string | null
          reviewer_comments: string | null
          service_fee_cents: number | null
          state_tax_id: string | null
          submitted_at: string | null
          total_amount_cents: number | null
          total_fee_cents: number | null
          transfer_state: string | null
          under_review_at: string | null
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          additional_info?: Json | null
          application_status?:
            | Database["public"]["Enums"]["business_license_status_enum"]
            | null
          approved_at?: string | null
          assigned_reviewer_id?: string | null
          base_fee_cents?: number | null
          basis_points?: number | null
          business_apt_number?: string | null
          business_city: string
          business_country?: string | null
          business_description?: string | null
          business_email?: string | null
          business_legal_name: string
          business_phone?: string | null
          business_state: string
          business_street_address: string
          business_type: string
          business_zip_code: string
          created_at?: string
          customer_id: string
          denial_reason?: string | null
          denied_at?: string | null
          doing_business_as?: string | null
          expired_at?: string | null
          federal_ein?: string | null
          finix_fee_profile_id?: string | null
          finix_merchant_id?: string | null
          finix_transfer_id?: string | null
          fixed_fee?: number | null
          form_responses?: Json | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id?: string | null
          information_requested_at?: string | null
          issued_at?: string | null
          license_number?: string | null
          license_type_id?: string | null
          merchant_fee_profile_id?: string | null
          merchant_finix_identity_id?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          owner_apt_number?: string | null
          owner_city: string
          owner_country?: string | null
          owner_email?: string | null
          owner_first_name: string
          owner_last_name: string
          owner_phone?: string | null
          owner_state: string
          owner_street_address: string
          owner_title?: string | null
          owner_zip_code: string
          payment_instrument_id?: string | null
          payment_method_type?: string | null
          payment_processed_at?: string | null
          payment_status?: string | null
          payment_type?: string | null
          resubmitted_at?: string | null
          review_notes?: string | null
          reviewer_comments?: string | null
          service_fee_cents?: number | null
          state_tax_id?: string | null
          submitted_at?: string | null
          total_amount_cents?: number | null
          total_fee_cents?: number | null
          transfer_state?: string | null
          under_review_at?: string | null
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          additional_info?: Json | null
          application_status?:
            | Database["public"]["Enums"]["business_license_status_enum"]
            | null
          approved_at?: string | null
          assigned_reviewer_id?: string | null
          base_fee_cents?: number | null
          basis_points?: number | null
          business_apt_number?: string | null
          business_city?: string
          business_country?: string | null
          business_description?: string | null
          business_email?: string | null
          business_legal_name?: string
          business_phone?: string | null
          business_state?: string
          business_street_address?: string
          business_type?: string
          business_zip_code?: string
          created_at?: string
          customer_id?: string
          denial_reason?: string | null
          denied_at?: string | null
          doing_business_as?: string | null
          expired_at?: string | null
          federal_ein?: string | null
          finix_fee_profile_id?: string | null
          finix_merchant_id?: string | null
          finix_transfer_id?: string | null
          fixed_fee?: number | null
          form_responses?: Json | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id?: string | null
          information_requested_at?: string | null
          issued_at?: string | null
          license_number?: string | null
          license_type_id?: string | null
          merchant_fee_profile_id?: string | null
          merchant_finix_identity_id?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          owner_apt_number?: string | null
          owner_city?: string
          owner_country?: string | null
          owner_email?: string | null
          owner_first_name?: string
          owner_last_name?: string
          owner_phone?: string | null
          owner_state?: string
          owner_street_address?: string
          owner_title?: string | null
          owner_zip_code?: string
          payment_instrument_id?: string | null
          payment_method_type?: string | null
          payment_processed_at?: string | null
          payment_status?: string | null
          payment_type?: string | null
          resubmitted_at?: string | null
          review_notes?: string | null
          reviewer_comments?: string | null
          service_fee_cents?: number | null
          state_tax_id?: string | null
          submitted_at?: string | null
          total_amount_cents?: number | null
          total_fee_cents?: number | null
          transfer_state?: string | null
          under_review_at?: string | null
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_license_applications_license_type_id_fkey"
            columns: ["license_type_id"]
            isOneToOne: false
            referencedRelation: "business_license_types"
            referencedColumns: ["id"]
          },
        ]
      }
      business_license_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          is_internal: boolean
          license_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          is_internal?: boolean
          license_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          license_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_license_comments_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "business_license_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      business_license_documents: {
        Row: {
          content_type: string
          created_at: string
          customer_id: string
          description: string | null
          document_type: string
          file_name: string
          file_size: number
          id: string
          license_id: string
          merchant_id: string | null
          merchant_name: string | null
          storage_path: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          customer_id: string
          description?: string | null
          document_type: string
          file_name: string
          file_size: number
          id?: string
          license_id: string
          merchant_id?: string | null
          merchant_name?: string | null
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          customer_id?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number
          id?: string
          license_id?: string
          merchant_id?: string | null
          merchant_name?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_license_documents_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "business_license_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      business_license_types: {
        Row: {
          base_fee_cents: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          processing_days: number | null
          requires_inspection: boolean | null
          updated_at: string
        }
        Insert: {
          base_fee_cents?: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          processing_days?: number | null
          requires_inspection?: boolean | null
          updated_at?: string
        }
        Update: {
          base_fee_cents?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          processing_days?: number | null
          requires_inspection?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
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
      master_bills: {
        Row: {
          account_type: string | null
          ach_basis_points: number | null
          ach_fixed_fee: number | null
          amount_due_cents: number
          apt_number: string | null
          assignment_status:
            | Database["public"]["Enums"]["assignment_status_enum"]
            | null
          bank_masked_account_number: string | null
          basis_points: number | null
          bill_id: string
          bill_specific_data: Json | null
          bill_status: Database["public"]["Enums"]["bill_status_enum"] | null
          business_address_line1: string | null
          business_address_line2: string | null
          business_city: string | null
          business_legal_name: string | null
          business_legal_name_normalized: string | null
          business_state: string | null
          business_zip_code: string | null
          calculated_fee_cents: number | null
          category: string | null
          change_history: Json[] | null
          city: string | null
          created_at: string | null
          created_by_system: string | null
          customer_id: string
          data_quality_score: number | null
          data_quality_status:
            | Database["public"]["Enums"]["data_quality_status_enum"]
            | null
          data_source_system: string
          doing_business_as: string | null
          due_date: string | null
          duplicate_check_hash: string | null
          email: string | null
          entity_type: string | null
          error_log: Json | null
          external_account_number: string | null
          external_bill_number: string
          external_business_name: string | null
          external_customer_address_line1: string | null
          external_customer_address_line2: string | null
          external_customer_city: string | null
          external_customer_name: string | null
          external_customer_state: string | null
          external_customer_type: string | null
          external_customer_zip_code: string | null
          external_payment_reference: string | null
          finix_fee_profile_id: string | null
          finix_identity_id: string | null
          finix_merchant_id: string | null
          finix_merchant_profile_id: string | null
          finix_payout_profile_id: string | null
          first_name: string | null
          fixed_fee: number | null
          fraud_session_id: string | null
          idempotency_id: string | null
          ingestion_timestamp: string | null
          issue_date: string | null
          last_modified_by: string | null
          last_name: string | null
          last_reconciled_at: string | null
          late_fee_1_applied_date: string | null
          late_fee_1_cents: number | null
          late_fee_2_applied_date: string | null
          late_fee_2_cents: number | null
          late_fee_3_applied_date: string | null
          late_fee_3_cents: number | null
          legal_entity_name: string | null
          manual_match_override: boolean | null
          manual_review_required: boolean | null
          match_criteria_details: Json | null
          match_score: number | null
          matching_confidence: number | null
          merchant_fee_profile_id: string | null
          merchant_finix_identity_id: string | null
          merchant_id: string | null
          merchant_name: string | null
          merchant_payout_id: string | null
          modification_count: number | null
          modification_reason: string | null
          original_amount_cents: number
          original_bill_snapshot: Json | null
          past_due_date: string | null
          payment_method_external: string | null
          payment_processed_by: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          processing_status: string | null
          profile_id: string | null
          raw_source_data: Json | null
          remaining_balance_cents: number
          requires_review: boolean | null
          retry_count: number | null
          state: string | null
          statement_descriptor: string | null
          street_address: string | null
          subcategory: string | null
          total_amount_cents: number
          total_late_fees_cents: number | null
          total_paid_cents: number | null
          transformation_applied: string[] | null
          type: string | null
          updated_at: string | null
          usage_details: Json | null
          user_id: string | null
          validation_errors: Json | null
          validation_status: string | null
          version: number | null
          zip_code: string | null
        }
        Insert: {
          account_type?: string | null
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          amount_due_cents: number
          apt_number?: string | null
          assignment_status?:
            | Database["public"]["Enums"]["assignment_status_enum"]
            | null
          bank_masked_account_number?: string | null
          basis_points?: number | null
          bill_id?: string
          bill_specific_data?: Json | null
          bill_status?: Database["public"]["Enums"]["bill_status_enum"] | null
          business_address_line1?: string | null
          business_address_line2?: string | null
          business_city?: string | null
          business_legal_name?: string | null
          business_legal_name_normalized?: string | null
          business_state?: string | null
          business_zip_code?: string | null
          calculated_fee_cents?: number | null
          category?: string | null
          change_history?: Json[] | null
          city?: string | null
          created_at?: string | null
          created_by_system?: string | null
          customer_id: string
          data_quality_score?: number | null
          data_quality_status?:
            | Database["public"]["Enums"]["data_quality_status_enum"]
            | null
          data_source_system: string
          doing_business_as?: string | null
          due_date?: string | null
          duplicate_check_hash?: string | null
          email?: string | null
          entity_type?: string | null
          error_log?: Json | null
          external_account_number?: string | null
          external_bill_number: string
          external_business_name?: string | null
          external_customer_address_line1?: string | null
          external_customer_address_line2?: string | null
          external_customer_city?: string | null
          external_customer_name?: string | null
          external_customer_state?: string | null
          external_customer_type?: string | null
          external_customer_zip_code?: string | null
          external_payment_reference?: string | null
          finix_fee_profile_id?: string | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_merchant_profile_id?: string | null
          finix_payout_profile_id?: string | null
          first_name?: string | null
          fixed_fee?: number | null
          fraud_session_id?: string | null
          idempotency_id?: string | null
          ingestion_timestamp?: string | null
          issue_date?: string | null
          last_modified_by?: string | null
          last_name?: string | null
          last_reconciled_at?: string | null
          late_fee_1_applied_date?: string | null
          late_fee_1_cents?: number | null
          late_fee_2_applied_date?: string | null
          late_fee_2_cents?: number | null
          late_fee_3_applied_date?: string | null
          late_fee_3_cents?: number | null
          legal_entity_name?: string | null
          manual_match_override?: boolean | null
          manual_review_required?: boolean | null
          match_criteria_details?: Json | null
          match_score?: number | null
          matching_confidence?: number | null
          merchant_fee_profile_id?: string | null
          merchant_finix_identity_id?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          merchant_payout_id?: string | null
          modification_count?: number | null
          modification_reason?: string | null
          original_amount_cents: number
          original_bill_snapshot?: Json | null
          past_due_date?: string | null
          payment_method_external?: string | null
          payment_processed_by?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          processing_status?: string | null
          profile_id?: string | null
          raw_source_data?: Json | null
          remaining_balance_cents: number
          requires_review?: boolean | null
          retry_count?: number | null
          state?: string | null
          statement_descriptor?: string | null
          street_address?: string | null
          subcategory?: string | null
          total_amount_cents: number
          total_late_fees_cents?: number | null
          total_paid_cents?: number | null
          transformation_applied?: string[] | null
          type?: string | null
          updated_at?: string | null
          usage_details?: Json | null
          user_id?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          version?: number | null
          zip_code?: string | null
        }
        Update: {
          account_type?: string | null
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          amount_due_cents?: number
          apt_number?: string | null
          assignment_status?:
            | Database["public"]["Enums"]["assignment_status_enum"]
            | null
          bank_masked_account_number?: string | null
          basis_points?: number | null
          bill_id?: string
          bill_specific_data?: Json | null
          bill_status?: Database["public"]["Enums"]["bill_status_enum"] | null
          business_address_line1?: string | null
          business_address_line2?: string | null
          business_city?: string | null
          business_legal_name?: string | null
          business_legal_name_normalized?: string | null
          business_state?: string | null
          business_zip_code?: string | null
          calculated_fee_cents?: number | null
          category?: string | null
          change_history?: Json[] | null
          city?: string | null
          created_at?: string | null
          created_by_system?: string | null
          customer_id?: string
          data_quality_score?: number | null
          data_quality_status?:
            | Database["public"]["Enums"]["data_quality_status_enum"]
            | null
          data_source_system?: string
          doing_business_as?: string | null
          due_date?: string | null
          duplicate_check_hash?: string | null
          email?: string | null
          entity_type?: string | null
          error_log?: Json | null
          external_account_number?: string | null
          external_bill_number?: string
          external_business_name?: string | null
          external_customer_address_line1?: string | null
          external_customer_address_line2?: string | null
          external_customer_city?: string | null
          external_customer_name?: string | null
          external_customer_state?: string | null
          external_customer_type?: string | null
          external_customer_zip_code?: string | null
          external_payment_reference?: string | null
          finix_fee_profile_id?: string | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_merchant_profile_id?: string | null
          finix_payout_profile_id?: string | null
          first_name?: string | null
          fixed_fee?: number | null
          fraud_session_id?: string | null
          idempotency_id?: string | null
          ingestion_timestamp?: string | null
          issue_date?: string | null
          last_modified_by?: string | null
          last_name?: string | null
          last_reconciled_at?: string | null
          late_fee_1_applied_date?: string | null
          late_fee_1_cents?: number | null
          late_fee_2_applied_date?: string | null
          late_fee_2_cents?: number | null
          late_fee_3_applied_date?: string | null
          late_fee_3_cents?: number | null
          legal_entity_name?: string | null
          manual_match_override?: boolean | null
          manual_review_required?: boolean | null
          match_criteria_details?: Json | null
          match_score?: number | null
          matching_confidence?: number | null
          merchant_fee_profile_id?: string | null
          merchant_finix_identity_id?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          merchant_payout_id?: string | null
          modification_count?: number | null
          modification_reason?: string | null
          original_amount_cents?: number
          original_bill_snapshot?: Json | null
          past_due_date?: string | null
          payment_method_external?: string | null
          payment_processed_by?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          processing_status?: string | null
          profile_id?: string | null
          raw_source_data?: Json | null
          remaining_balance_cents?: number
          requires_review?: boolean | null
          retry_count?: number | null
          state?: string | null
          statement_descriptor?: string | null
          street_address?: string | null
          subcategory?: string | null
          total_amount_cents?: number
          total_late_fees_cents?: number | null
          total_paid_cents?: number | null
          transformation_applied?: string[] | null
          type?: string | null
          updated_at?: string | null
          usage_details?: Json | null
          user_id?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          version?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_bills_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_fee_profiles: {
        Row: {
          ach_basis_points: number | null
          ach_basis_points_fee_limit: number | null
          ach_credit_return_fixed_fee: number | null
          ach_debit_return_fixed_fee: number | null
          ach_fixed_fee: number | null
          american_express_assessment_basis_points: number | null
          american_express_basis_points: number | null
          american_express_charge_interchange: boolean | null
          american_express_externally_funded_basis_points: number | null
          american_express_externally_funded_fixed_fee: number | null
          american_express_fixed_fee: number | null
          basis_points: number | null
          charge_interchange: boolean | null
          created_at: string
          dispute_fixed_fee: number | null
          dispute_inquiry_fixed_fee: number | null
          finix_application_id: string | null
          finix_fee_profile_id: string | null
          finix_merchant_id: string | null
          finix_merchant_profile_id: string | null
          finix_raw_response: Json | null
          fixed_fee: number | null
          id: string
          last_synced_at: string | null
          merchant_id: string
          merchant_name: string | null
          merchant_profile_raw_response: Json | null
          qualified_tiers: string | null
          rounding_mode: string | null
          sync_status: string | null
          tags: Json | null
          updated_at: string
        }
        Insert: {
          ach_basis_points?: number | null
          ach_basis_points_fee_limit?: number | null
          ach_credit_return_fixed_fee?: number | null
          ach_debit_return_fixed_fee?: number | null
          ach_fixed_fee?: number | null
          american_express_assessment_basis_points?: number | null
          american_express_basis_points?: number | null
          american_express_charge_interchange?: boolean | null
          american_express_externally_funded_basis_points?: number | null
          american_express_externally_funded_fixed_fee?: number | null
          american_express_fixed_fee?: number | null
          basis_points?: number | null
          charge_interchange?: boolean | null
          created_at?: string
          dispute_fixed_fee?: number | null
          dispute_inquiry_fixed_fee?: number | null
          finix_application_id?: string | null
          finix_fee_profile_id?: string | null
          finix_merchant_id?: string | null
          finix_merchant_profile_id?: string | null
          finix_raw_response?: Json | null
          fixed_fee?: number | null
          id?: string
          last_synced_at?: string | null
          merchant_id: string
          merchant_name?: string | null
          merchant_profile_raw_response?: Json | null
          qualified_tiers?: string | null
          rounding_mode?: string | null
          sync_status?: string | null
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          ach_basis_points?: number | null
          ach_basis_points_fee_limit?: number | null
          ach_credit_return_fixed_fee?: number | null
          ach_debit_return_fixed_fee?: number | null
          ach_fixed_fee?: number | null
          american_express_assessment_basis_points?: number | null
          american_express_basis_points?: number | null
          american_express_charge_interchange?: boolean | null
          american_express_externally_funded_basis_points?: number | null
          american_express_externally_funded_fixed_fee?: number | null
          american_express_fixed_fee?: number | null
          basis_points?: number | null
          charge_interchange?: boolean | null
          created_at?: string
          dispute_fixed_fee?: number | null
          dispute_inquiry_fixed_fee?: number | null
          finix_application_id?: string | null
          finix_fee_profile_id?: string | null
          finix_merchant_id?: string | null
          finix_merchant_profile_id?: string | null
          finix_raw_response?: Json | null
          fixed_fee?: number | null
          id?: string
          last_synced_at?: string | null
          merchant_id?: string
          merchant_name?: string | null
          merchant_profile_raw_response?: Json | null
          qualified_tiers?: string | null
          rounding_mode?: string | null
          sync_status?: string | null
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_fee_profiles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_payout_profiles: {
        Row: {
          created_at: string
          finix_merchant_id: string | null
          finix_payout_profile_id: string | null
          gross_fees_day_of_month: number | null
          gross_fees_frequency:
            | Database["public"]["Enums"]["payout_frequency"]
            | null
          gross_fees_payment_instrument_id: string | null
          gross_fees_rail: Database["public"]["Enums"]["payout_rail"] | null
          gross_fees_submission_delay_days: number | null
          gross_payouts_frequency:
            | Database["public"]["Enums"]["payout_frequency"]
            | null
          gross_payouts_payment_instrument_id: string | null
          gross_payouts_rail: Database["public"]["Enums"]["payout_rail"] | null
          gross_payouts_submission_delay_days: number | null
          id: string
          last_synced_at: string | null
          merchant_id: string
          merchant_name: string | null
          net_frequency: Database["public"]["Enums"]["payout_frequency"] | null
          net_payment_instrument_id: string | null
          net_rail: Database["public"]["Enums"]["payout_rail"] | null
          net_submission_delay_days: number | null
          sync_status: Database["public"]["Enums"]["sync_status"]
          type: Database["public"]["Enums"]["payout_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          finix_merchant_id?: string | null
          finix_payout_profile_id?: string | null
          gross_fees_day_of_month?: number | null
          gross_fees_frequency?:
            | Database["public"]["Enums"]["payout_frequency"]
            | null
          gross_fees_payment_instrument_id?: string | null
          gross_fees_rail?: Database["public"]["Enums"]["payout_rail"] | null
          gross_fees_submission_delay_days?: number | null
          gross_payouts_frequency?:
            | Database["public"]["Enums"]["payout_frequency"]
            | null
          gross_payouts_payment_instrument_id?: string | null
          gross_payouts_rail?: Database["public"]["Enums"]["payout_rail"] | null
          gross_payouts_submission_delay_days?: number | null
          id?: string
          last_synced_at?: string | null
          merchant_id: string
          merchant_name?: string | null
          net_frequency?: Database["public"]["Enums"]["payout_frequency"] | null
          net_payment_instrument_id?: string | null
          net_rail?: Database["public"]["Enums"]["payout_rail"] | null
          net_submission_delay_days?: number | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          type?: Database["public"]["Enums"]["payout_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          finix_merchant_id?: string | null
          finix_payout_profile_id?: string | null
          gross_fees_day_of_month?: number | null
          gross_fees_frequency?:
            | Database["public"]["Enums"]["payout_frequency"]
            | null
          gross_fees_payment_instrument_id?: string | null
          gross_fees_rail?: Database["public"]["Enums"]["payout_rail"] | null
          gross_fees_submission_delay_days?: number | null
          gross_payouts_frequency?:
            | Database["public"]["Enums"]["payout_frequency"]
            | null
          gross_payouts_payment_instrument_id?: string | null
          gross_payouts_rail?: Database["public"]["Enums"]["payout_rail"] | null
          gross_payouts_submission_delay_days?: number | null
          id?: string
          last_synced_at?: string | null
          merchant_id?: string
          merchant_name?: string | null
          net_frequency?: Database["public"]["Enums"]["payout_frequency"] | null
          net_payment_instrument_id?: string | null
          net_rail?: Database["public"]["Enums"]["payout_rail"] | null
          net_submission_delay_days?: number | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          type?: Database["public"]["Enums"]["payout_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_payout_profiles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          annual_ach_volume: number
          annual_card_volume: number
          average_ach_amount: number
          average_card_amount: number
          b2b_percentage: number
          b2c_percentage: number
          bank_account_holder_name: string | null
          bank_account_type: string | null
          bank_last_four: string | null
          bank_masked_account_number: string | null
          bank_routing_number: string | null
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
          category: string | null
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
          customer_id: string
          customer_last_name: string
          customer_phone: string
          customer_state: string
          customer_street_address: string
          customer_zip_code: string
          data_source_system: string | null
          doing_business_as: string
          ecommerce_percentage: number
          finix_application_id: string | null
          finix_entity_data: Json | null
          finix_identity_id: string | null
          finix_merchant_id: string | null
          finix_merchant_profile_id: string | null
          finix_raw_response: Json | null
          finix_tags: Json | null
          finix_verification_id: string | null
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
          onboarding_state: string | null
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
          processing_enabled: boolean | null
          processing_status: string
          processor_mid: string | null
          processor_type: string | null
          refund_policy: string
          settlement_enabled: boolean | null
          statement_descriptor: string
          subcategory: string | null
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
          bank_account_holder_name?: string | null
          bank_account_type?: string | null
          bank_last_four?: string | null
          bank_masked_account_number?: string | null
          bank_routing_number?: string | null
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
          category?: string | null
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
          customer_id: string
          customer_last_name: string
          customer_phone: string
          customer_state: string
          customer_street_address: string
          customer_zip_code: string
          data_source_system?: string | null
          doing_business_as: string
          ecommerce_percentage?: number
          finix_application_id?: string | null
          finix_entity_data?: Json | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_merchant_profile_id?: string | null
          finix_raw_response?: Json | null
          finix_tags?: Json | null
          finix_verification_id?: string | null
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
          onboarding_state?: string | null
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
          processing_enabled?: boolean | null
          processing_status?: string
          processor_mid?: string | null
          processor_type?: string | null
          refund_policy: string
          settlement_enabled?: boolean | null
          statement_descriptor: string
          subcategory?: string | null
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
          bank_account_holder_name?: string | null
          bank_account_type?: string | null
          bank_last_four?: string | null
          bank_masked_account_number?: string | null
          bank_routing_number?: string | null
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
          category?: string | null
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
          customer_id?: string
          customer_last_name?: string
          customer_phone?: string
          customer_state?: string
          customer_street_address?: string
          customer_zip_code?: string
          data_source_system?: string | null
          doing_business_as?: string
          ecommerce_percentage?: number
          finix_application_id?: string | null
          finix_entity_data?: Json | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_merchant_profile_id?: string | null
          finix_raw_response?: Json | null
          finix_tags?: Json | null
          finix_verification_id?: string | null
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
          onboarding_state?: string | null
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
          processing_enabled?: boolean | null
          processing_status?: string
          processor_mid?: string | null
          processor_type?: string | null
          refund_policy?: string
          settlement_enabled?: boolean | null
          statement_descriptor?: string
          subcategory?: string | null
          submission_metadata?: Json | null
          updated_at?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      municipal_business_license_types: {
        Row: {
          base_fee_cents: number
          business_license_type_id: string | null
          created_at: string
          customer_id: string
          display_order: number
          id: string
          is_active: boolean
          is_custom: boolean
          merchant_id: string | null
          merchant_name: string | null
          municipal_label: string
          updated_at: string
        }
        Insert: {
          base_fee_cents?: number
          business_license_type_id?: string | null
          created_at?: string
          customer_id: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          merchant_id?: string | null
          merchant_name?: string | null
          municipal_label: string
          updated_at?: string
        }
        Update: {
          base_fee_cents?: number
          business_license_type_id?: string | null
          created_at?: string
          customer_id?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          merchant_id?: string | null
          merchant_name?: string | null
          municipal_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      municipal_permit_merchants: {
        Row: {
          active: boolean
          created_at: string
          customer_id: string
          id: string
          merchant_id: string
          permit_merchant_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_id: string
          id?: string
          merchant_id: string
          permit_merchant_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_id?: string
          id?: string
          merchant_id?: string
          permit_merchant_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_permit_merchants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "municipal_permit_merchants_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_permit_questions: {
        Row: {
          created_at: string
          customer_id: string
          display_order: number
          help_text: string | null
          id: string
          is_active: boolean
          is_required: boolean
          merchant_id: string | null
          merchant_name: string | null
          question_options: Json | null
          question_text: string
          question_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          display_order?: number
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          merchant_id?: string | null
          merchant_name?: string | null
          question_options?: Json | null
          question_text: string
          question_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          display_order?: number
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          merchant_id?: string | null
          merchant_name?: string | null
          question_options?: Json | null
          question_text?: string
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_permit_questions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "municipal_permit_questions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_permit_types: {
        Row: {
          base_fee_cents: number
          created_at: string
          customer_id: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          merchant_id: string | null
          merchant_name: string | null
          municipal_label: string
          permit_type_id: string | null
          processing_days: number | null
          requires_inspection: boolean | null
          updated_at: string
        }
        Insert: {
          base_fee_cents?: number
          created_at?: string
          customer_id: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          merchant_id?: string | null
          merchant_name?: string | null
          municipal_label: string
          permit_type_id?: string | null
          processing_days?: number | null
          requires_inspection?: boolean | null
          updated_at?: string
        }
        Update: {
          base_fee_cents?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          merchant_id?: string | null
          merchant_name?: string | null
          municipal_label?: string
          permit_type_id?: string | null
          processing_days?: number | null
          requires_inspection?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_permit_types_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "municipal_permit_types_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_permit_types_permit_type_id_fkey"
            columns: ["permit_type_id"]
            isOneToOne: false
            referencedRelation: "permit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_service_application_comments: {
        Row: {
          application_id: string
          comment_text: string
          created_at: string
          id: string
          is_internal: boolean
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          comment_text: string
          created_at?: string
          id?: string
          is_internal?: boolean
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_service_application_comments_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_service_applications: {
        Row: {
          ach_basis_points: number | null
          ach_fixed_fee: number | null
          additional_information: string | null
          amount_cents: number | null
          applicant_email: string | null
          applicant_name: string | null
          applicant_phone: string | null
          application_number: string | null
          approved_at: string | null
          apt_number: string | null
          assigned_reviewer_id: string | null
          basis_points: number | null
          business_legal_name: string | null
          city: string | null
          completed_at: string | null
          country: string | null
          created_at: string | null
          customer_id: string
          denied_at: string | null
          finix_identity_id: string | null
          finix_merchant_id: string | null
          finix_payment_instrument_id: string | null
          finix_transfer_id: string | null
          fixed_fee: number | null
          fraud_session_id: string | null
          id: string
          idempotency_id: string | null
          information_requested_at: string | null
          merchant_fee_profile_id: string | null
          merchant_finix_identity_id: string | null
          merchant_id: string | null
          merchant_name: string | null
          paid_at: string | null
          payment_id: string | null
          payment_instrument_id: string | null
          payment_method_type: string | null
          payment_processed_at: string | null
          payment_status: string | null
          payment_type: Database["public"]["Enums"]["payment_type_enum"] | null
          review_notes: string | null
          service_fee_cents: number | null
          service_name: string | null
          service_specific_data: Json | null
          state: string | null
          status:
            | Database["public"]["Enums"]["service_application_status_enum"]
            | null
          street_address: string | null
          submitted_at: string | null
          tile_id: string
          total_amount_cents: number | null
          transfer_state: string | null
          under_review_at: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          additional_information?: string | null
          amount_cents?: number | null
          applicant_email?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          application_number?: string | null
          approved_at?: string | null
          apt_number?: string | null
          assigned_reviewer_id?: string | null
          basis_points?: number | null
          business_legal_name?: string | null
          city?: string | null
          completed_at?: string | null
          country?: string | null
          created_at?: string | null
          customer_id: string
          denied_at?: string | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_payment_instrument_id?: string | null
          finix_transfer_id?: string | null
          fixed_fee?: number | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id?: string | null
          information_requested_at?: string | null
          merchant_fee_profile_id?: string | null
          merchant_finix_identity_id?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_instrument_id?: string | null
          payment_method_type?: string | null
          payment_processed_at?: string | null
          payment_status?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type_enum"] | null
          review_notes?: string | null
          service_fee_cents?: number | null
          service_name?: string | null
          service_specific_data?: Json | null
          state?: string | null
          status?:
            | Database["public"]["Enums"]["service_application_status_enum"]
            | null
          street_address?: string | null
          submitted_at?: string | null
          tile_id: string
          total_amount_cents?: number | null
          transfer_state?: string | null
          under_review_at?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          additional_information?: string | null
          amount_cents?: number | null
          applicant_email?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          application_number?: string | null
          approved_at?: string | null
          apt_number?: string | null
          assigned_reviewer_id?: string | null
          basis_points?: number | null
          business_legal_name?: string | null
          city?: string | null
          completed_at?: string | null
          country?: string | null
          created_at?: string | null
          customer_id?: string
          denied_at?: string | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_payment_instrument_id?: string | null
          finix_transfer_id?: string | null
          fixed_fee?: number | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id?: string | null
          information_requested_at?: string | null
          merchant_fee_profile_id?: string | null
          merchant_finix_identity_id?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_instrument_id?: string | null
          payment_method_type?: string | null
          payment_processed_at?: string | null
          payment_status?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type_enum"] | null
          review_notes?: string | null
          service_fee_cents?: number | null
          service_name?: string | null
          service_specific_data?: Json | null
          state?: string | null
          status?:
            | Database["public"]["Enums"]["service_application_status_enum"]
            | null
          street_address?: string | null
          submitted_at?: string | null
          tile_id?: string
          total_amount_cents?: number | null
          transfer_state?: string | null
          under_review_at?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      municipal_service_tiles: {
        Row: {
          allow_user_defined_amount: boolean
          amount_cents: number
          auto_populate_user_info: boolean
          auto_renew_enabled: boolean | null
          created_at: string
          created_by: string
          customer_id: string
          description: string | null
          finix_merchant_id: string | null
          form_fields: Json | null
          id: string
          is_active: boolean
          is_renewable: boolean | null
          merchant_fee_profile_id: string | null
          merchant_id: string | null
          pdf_form_url: string | null
          renewal_frequency: string | null
          renewal_reminder_days: number | null
          requires_review: boolean
          title: string
          updated_at: string
        }
        Insert: {
          allow_user_defined_amount?: boolean
          amount_cents?: number
          auto_populate_user_info?: boolean
          auto_renew_enabled?: boolean | null
          created_at?: string
          created_by: string
          customer_id: string
          description?: string | null
          finix_merchant_id?: string | null
          form_fields?: Json | null
          id?: string
          is_active?: boolean
          is_renewable?: boolean | null
          merchant_fee_profile_id?: string | null
          merchant_id?: string | null
          pdf_form_url?: string | null
          renewal_frequency?: string | null
          renewal_reminder_days?: number | null
          requires_review?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          allow_user_defined_amount?: boolean
          amount_cents?: number
          auto_populate_user_info?: boolean
          auto_renew_enabled?: boolean | null
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string | null
          finix_merchant_id?: string | null
          form_fields?: Json | null
          id?: string
          is_active?: boolean
          is_renewable?: boolean | null
          merchant_fee_profile_id?: string | null
          merchant_id?: string | null
          pdf_form_url?: string | null
          renewal_frequency?: string | null
          renewal_reminder_days?: number | null
          requires_review?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_municipal_service_tiles_merchant_id"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_tax_types: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          display_order: number
          id: string
          instructions_document_path: string | null
          is_active: boolean
          merchant_id: string | null
          merchant_name: string | null
          required_documents: Json | null
          tax_type_code: string
          tax_type_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          display_order?: number
          id?: string
          instructions_document_path?: string | null
          is_active?: boolean
          merchant_id?: string | null
          merchant_name?: string | null
          required_documents?: Json | null
          tax_type_code: string
          tax_type_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          display_order?: number
          id?: string
          instructions_document_path?: string | null
          is_active?: boolean
          merchant_id?: string | null
          merchant_name?: string | null
          required_documents?: Json | null
          tax_type_code?: string
          tax_type_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      municipal_team_members: {
        Row: {
          admin_id: string
          created_at: string
          customer_id: string
          id: string
          invited_at: string
          member_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          customer_id: string
          id?: string
          invited_at?: string
          member_id: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          invited_at?: string
          member_id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_team_members_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_team_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "municipal_team_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      payment_history: {
        Row: {
          amount_cents: number
          bank_last_four: string | null
          bill_id: string | null
          bill_status: string | null
          bill_type: string | null
          business_address_line1: string | null
          business_city: string | null
          business_legal_name: string | null
          business_license_id: string | null
          business_state: string | null
          business_zip_code: string | null
          card_brand: string | null
          card_last_four: string | null
          category: string | null
          created_at: string
          currency: string
          customer_apt_number: string | null
          customer_city: string | null
          customer_email: string | null
          customer_first_name: string | null
          customer_id: string | null
          customer_last_name: string | null
          customer_state: string | null
          customer_street_address: string | null
          customer_zip_code: string | null
          data_source_system: string | null
          doing_business_as: string | null
          due_date: string | null
          entity_type: string | null
          external_account_number: string | null
          external_bill_number: string | null
          external_business_name: string | null
          external_customer_address_line1: string | null
          external_customer_city: string | null
          external_customer_name: string | null
          external_customer_state: string | null
          external_customer_zip_code: string | null
          failure_code: string | null
          failure_message: string | null
          finix_created_at: string | null
          finix_merchant_id: string
          finix_payment_instrument_id: string
          finix_transfer_id: string | null
          finix_updated_at: string | null
          fraud_session_id: string | null
          id: string
          idempotency_id: string
          issue_date: string | null
          merchant_id: string | null
          merchant_name: string | null
          original_amount_cents: number | null
          payment_instrument_id: string | null
          payment_processed_at: string | null
          payment_status: string | null
          payment_type: string
          permit_id: string | null
          raw_finix_response: Json | null
          service_application_id: string | null
          service_fee_cents: number
          statement_descriptor: string | null
          subcategory: string | null
          tax_submission_id: string | null
          total_amount_cents: number
          transfer_state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          bank_last_four?: string | null
          bill_id?: string | null
          bill_status?: string | null
          bill_type?: string | null
          business_address_line1?: string | null
          business_city?: string | null
          business_legal_name?: string | null
          business_license_id?: string | null
          business_state?: string | null
          business_zip_code?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          customer_apt_number?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_first_name?: string | null
          customer_id?: string | null
          customer_last_name?: string | null
          customer_state?: string | null
          customer_street_address?: string | null
          customer_zip_code?: string | null
          data_source_system?: string | null
          doing_business_as?: string | null
          due_date?: string | null
          entity_type?: string | null
          external_account_number?: string | null
          external_bill_number?: string | null
          external_business_name?: string | null
          external_customer_address_line1?: string | null
          external_customer_city?: string | null
          external_customer_name?: string | null
          external_customer_state?: string | null
          external_customer_zip_code?: string | null
          failure_code?: string | null
          failure_message?: string | null
          finix_created_at?: string | null
          finix_merchant_id: string
          finix_payment_instrument_id: string
          finix_transfer_id?: string | null
          finix_updated_at?: string | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id: string
          issue_date?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          original_amount_cents?: number | null
          payment_instrument_id?: string | null
          payment_processed_at?: string | null
          payment_status?: string | null
          payment_type: string
          permit_id?: string | null
          raw_finix_response?: Json | null
          service_application_id?: string | null
          service_fee_cents: number
          statement_descriptor?: string | null
          subcategory?: string | null
          tax_submission_id?: string | null
          total_amount_cents: number
          transfer_state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          bank_last_four?: string | null
          bill_id?: string | null
          bill_status?: string | null
          bill_type?: string | null
          business_address_line1?: string | null
          business_city?: string | null
          business_legal_name?: string | null
          business_license_id?: string | null
          business_state?: string | null
          business_zip_code?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          customer_apt_number?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_first_name?: string | null
          customer_id?: string | null
          customer_last_name?: string | null
          customer_state?: string | null
          customer_street_address?: string | null
          customer_zip_code?: string | null
          data_source_system?: string | null
          doing_business_as?: string | null
          due_date?: string | null
          entity_type?: string | null
          external_account_number?: string | null
          external_bill_number?: string | null
          external_business_name?: string | null
          external_customer_address_line1?: string | null
          external_customer_city?: string | null
          external_customer_name?: string | null
          external_customer_state?: string | null
          external_customer_zip_code?: string | null
          failure_code?: string | null
          failure_message?: string | null
          finix_created_at?: string | null
          finix_merchant_id?: string
          finix_payment_instrument_id?: string
          finix_transfer_id?: string | null
          finix_updated_at?: string | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id?: string
          issue_date?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          original_amount_cents?: number | null
          payment_instrument_id?: string | null
          payment_processed_at?: string | null
          payment_status?: string | null
          payment_type?: string
          permit_id?: string | null
          raw_finix_response?: Json | null
          service_application_id?: string | null
          service_fee_cents?: number
          statement_descriptor?: string | null
          subcategory?: string | null
          tax_submission_id?: string | null
          total_amount_cents?: number
          transfer_state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "master_bills"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "payment_history_business_license_id_fkey"
            columns: ["business_license_id"]
            isOneToOne: false
            referencedRelation: "business_license_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_payment_instrument_id_fkey"
            columns: ["payment_instrument_id"]
            isOneToOne: false
            referencedRelation: "user_payment_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permit_applications"
            referencedColumns: ["permit_id"]
          },
          {
            foreignKeyName: "payment_history_tax_submission_id_fkey"
            columns: ["tax_submission_id"]
            isOneToOne: false
            referencedRelation: "tax_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_applications: {
        Row: {
          ach_basis_points: number | null
          ach_fixed_fee: number | null
          applicant_address: string | null
          applicant_email: string | null
          applicant_full_name: string | null
          applicant_phone: string | null
          application_status: Database["public"]["Enums"]["permit_status_enum"]
          approved_at: string | null
          assigned_reviewer_id: string | null
          basis_points: number | null
          created_at: string
          customer_id: string
          denial_reason: string | null
          denied_at: string | null
          estimated_construction_value_cents: number
          expiration_date: string | null
          expired_at: string | null
          finix_identity_id: string | null
          finix_merchant_id: string | null
          finix_payout_profile_id: string | null
          finix_transfer_id: string | null
          fixed_fee: number | null
          fraud_session_id: string | null
          idempotency_id: string | null
          information_request_reason: string | null
          information_requested_at: string | null
          issued_at: string | null
          merchant_fee_profile_id: string | null
          merchant_finix_identity_id: string | null
          merchant_id: string | null
          merchant_name: string | null
          municipal_questions_responses: Json | null
          municipal_review_status: string | null
          owner_address: string | null
          owner_email: string | null
          owner_full_name: string | null
          owner_phone: string | null
          payment_amount_cents: number | null
          payment_instrument_id: string | null
          payment_method_type: string | null
          payment_processed_at: string | null
          payment_status: string | null
          payment_type: Database["public"]["Enums"]["payment_type_enum"] | null
          permit_id: string
          permit_merchant_id: string | null
          permit_number: string | null
          permit_type: string
          profile_id: string | null
          property_address: string
          property_pin: string | null
          resubmitted_at: string | null
          review_completed_at: string | null
          review_notes: string | null
          review_started_at: string | null
          reviewed_at: string | null
          same_as_applicant: boolean
          scope_of_work: string
          selected_municipality_id: string | null
          service_fee_cents: number | null
          submitted_at: string | null
          total_amount_cents: number | null
          under_review_at: string | null
          updated_at: string
          use_personal_info: boolean
          user_id: string
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          applicant_address?: string | null
          applicant_email?: string | null
          applicant_full_name?: string | null
          applicant_phone?: string | null
          application_status?: Database["public"]["Enums"]["permit_status_enum"]
          approved_at?: string | null
          assigned_reviewer_id?: string | null
          basis_points?: number | null
          created_at?: string
          customer_id: string
          denial_reason?: string | null
          denied_at?: string | null
          estimated_construction_value_cents?: number
          expiration_date?: string | null
          expired_at?: string | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_payout_profile_id?: string | null
          finix_transfer_id?: string | null
          fixed_fee?: number | null
          fraud_session_id?: string | null
          idempotency_id?: string | null
          information_request_reason?: string | null
          information_requested_at?: string | null
          issued_at?: string | null
          merchant_fee_profile_id?: string | null
          merchant_finix_identity_id?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          municipal_questions_responses?: Json | null
          municipal_review_status?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_full_name?: string | null
          owner_phone?: string | null
          payment_amount_cents?: number | null
          payment_instrument_id?: string | null
          payment_method_type?: string | null
          payment_processed_at?: string | null
          payment_status?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type_enum"] | null
          permit_id?: string
          permit_merchant_id?: string | null
          permit_number?: string | null
          permit_type: string
          profile_id?: string | null
          property_address: string
          property_pin?: string | null
          resubmitted_at?: string | null
          review_completed_at?: string | null
          review_notes?: string | null
          review_started_at?: string | null
          reviewed_at?: string | null
          same_as_applicant?: boolean
          scope_of_work: string
          selected_municipality_id?: string | null
          service_fee_cents?: number | null
          submitted_at?: string | null
          total_amount_cents?: number | null
          under_review_at?: string | null
          updated_at?: string
          use_personal_info?: boolean
          user_id: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          applicant_address?: string | null
          applicant_email?: string | null
          applicant_full_name?: string | null
          applicant_phone?: string | null
          application_status?: Database["public"]["Enums"]["permit_status_enum"]
          approved_at?: string | null
          assigned_reviewer_id?: string | null
          basis_points?: number | null
          created_at?: string
          customer_id?: string
          denial_reason?: string | null
          denied_at?: string | null
          estimated_construction_value_cents?: number
          expiration_date?: string | null
          expired_at?: string | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_payout_profile_id?: string | null
          finix_transfer_id?: string | null
          fixed_fee?: number | null
          fraud_session_id?: string | null
          idempotency_id?: string | null
          information_request_reason?: string | null
          information_requested_at?: string | null
          issued_at?: string | null
          merchant_fee_profile_id?: string | null
          merchant_finix_identity_id?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          municipal_questions_responses?: Json | null
          municipal_review_status?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_full_name?: string | null
          owner_phone?: string | null
          payment_amount_cents?: number | null
          payment_instrument_id?: string | null
          payment_method_type?: string | null
          payment_processed_at?: string | null
          payment_status?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type_enum"] | null
          permit_id?: string
          permit_merchant_id?: string | null
          permit_number?: string | null
          permit_type?: string
          profile_id?: string | null
          property_address?: string
          property_pin?: string | null
          resubmitted_at?: string | null
          review_completed_at?: string | null
          review_notes?: string | null
          review_started_at?: string | null
          reviewed_at?: string | null
          same_as_applicant?: boolean
          scope_of_work?: string
          selected_municipality_id?: string | null
          service_fee_cents?: number | null
          submitted_at?: string | null
          total_amount_cents?: number | null
          under_review_at?: string | null
          updated_at?: string
          use_personal_info?: boolean
          user_id?: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permit_applications_permit_merchant_id_fkey"
            columns: ["permit_merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_applications_selected_municipality_id_fkey"
            columns: ["selected_municipality_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      permit_contractors: {
        Row: {
          contractor_address: string | null
          contractor_email: string | null
          contractor_name: string | null
          contractor_phone: string | null
          contractor_type: string
          created_at: string
          id: string
          permit_id: string
        }
        Insert: {
          contractor_address?: string | null
          contractor_email?: string | null
          contractor_name?: string | null
          contractor_phone?: string | null
          contractor_type: string
          created_at?: string
          id?: string
          permit_id: string
        }
        Update: {
          contractor_address?: string | null
          contractor_email?: string | null
          contractor_name?: string | null
          contractor_phone?: string | null
          contractor_type?: string
          created_at?: string
          id?: string
          permit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_contractors_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permit_applications"
            referencedColumns: ["permit_id"]
          },
        ]
      }
      permit_documents: {
        Row: {
          content_type: string
          created_at: string
          customer_id: string
          description: string | null
          document_type: string
          file_name: string
          file_size: number
          id: string
          merchant_id: string | null
          merchant_name: string | null
          permit_id: string
          storage_path: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          customer_id: string
          description?: string | null
          document_type: string
          file_name: string
          file_size: number
          id?: string
          merchant_id?: string | null
          merchant_name?: string | null
          permit_id: string
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          customer_id?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number
          id?: string
          merchant_id?: string | null
          merchant_name?: string | null
          permit_id?: string
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_permit_documents_permit_id"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permit_applications"
            referencedColumns: ["permit_id"]
          },
        ]
      }
      permit_inspections: {
        Row: {
          completed_date: string | null
          created_at: string
          id: string
          inspection_type: string
          inspector_id: string | null
          notes: string | null
          permit_id: string
          result: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_type: string
          inspector_id?: string | null
          notes?: string | null
          permit_id: string
          result?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_type?: string
          inspector_id?: string | null
          notes?: string | null
          permit_id?: string
          result?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      permit_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          permit_id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          permit_id: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          permit_id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_permit_notifications_permit"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permit_applications"
            referencedColumns: ["permit_id"]
          },
          {
            foreignKeyName: "fk_permit_notifications_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_number_sequences: {
        Row: {
          created_at: string | null
          next_sequence: number
          updated_at: string | null
          year_code: string
        }
        Insert: {
          created_at?: string | null
          next_sequence?: number
          updated_at?: string | null
          year_code: string
        }
        Update: {
          created_at?: string | null
          next_sequence?: number
          updated_at?: string | null
          year_code?: string
        }
        Relationships: []
      }
      permit_review_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          is_internal: boolean | null
          permit_id: string
          reviewer_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          permit_id: string
          reviewer_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          permit_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_review_comments_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permit_applications"
            referencedColumns: ["permit_id"]
          },
        ]
      }
      permit_review_requests: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          permit_id: string
          request_details: string
          request_type: string
          reviewer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          permit_id: string
          request_details: string
          request_type: string
          reviewer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          permit_id?: string
          request_details?: string
          request_type?: string
          reviewer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_review_requests_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permit_applications"
            referencedColumns: ["permit_id"]
          },
        ]
      }
      permit_reviews: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          permit_id: string
          review_action: string
          reviewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          permit_id: string
          review_action: string
          reviewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          permit_id?: string
          review_action?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_reviews_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permit_applications"
            referencedColumns: ["permit_id"]
          },
        ]
      }
      permit_types: {
        Row: {
          base_fee_cents: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          processing_days: number
          requires_inspection: boolean
          updated_at: string
        }
        Insert: {
          base_fee_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          processing_days?: number
          requires_inspection?: boolean
          updated_at?: string
        }
        Update: {
          base_fee_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          processing_days?: number
          requires_inspection?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          address_validation_status: string | null
          apt_number: string | null
          business_legal_name: string | null
          city: string | null
          created_at: string
          customer_id: string | null
          email: string
          first_name: string
          id: string
          industry: string | null
          last_name: string
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
          customer_id?: string | null
          email: string
          first_name: string
          id: string
          industry?: string | null
          last_name: string
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
          customer_id?: string | null
          email?: string
          first_name?: string
          id?: string
          industry?: string | null
          last_name?: string
          original_address?: Json | null
          phone?: string | null
          role?: string
          standardized_address?: Json | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      refunds: {
        Row: {
          bank_last_four: string | null
          bill_id: string
          card_brand: string | null
          card_last_four: string | null
          category: string | null
          created_at: string
          customer_id: string
          external_account_number: string | null
          external_bill_number: string | null
          finix_merchant_id: string | null
          finix_payment_instrument_id: string | null
          finix_raw_response: Json | null
          finix_reversal_id: string | null
          finix_transfer_id: string
          id: string
          merchant_name: string | null
          municipal_user_id: string
          original_amount_cents: number
          original_due_date: string | null
          original_issue_date: string | null
          payment_history_id: string
          payment_type: string | null
          processed_at: string | null
          reason: string
          refund_amount_cents: number
          refund_status: string
          subcategory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_last_four?: string | null
          bill_id: string
          card_brand?: string | null
          card_last_four?: string | null
          category?: string | null
          created_at?: string
          customer_id: string
          external_account_number?: string | null
          external_bill_number?: string | null
          finix_merchant_id?: string | null
          finix_payment_instrument_id?: string | null
          finix_raw_response?: Json | null
          finix_reversal_id?: string | null
          finix_transfer_id: string
          id?: string
          merchant_name?: string | null
          municipal_user_id: string
          original_amount_cents: number
          original_due_date?: string | null
          original_issue_date?: string | null
          payment_history_id: string
          payment_type?: string | null
          processed_at?: string | null
          reason: string
          refund_amount_cents: number
          refund_status?: string
          subcategory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_last_four?: string | null
          bill_id?: string
          card_brand?: string | null
          card_last_four?: string | null
          category?: string | null
          created_at?: string
          customer_id?: string
          external_account_number?: string | null
          external_bill_number?: string | null
          finix_merchant_id?: string | null
          finix_payment_instrument_id?: string | null
          finix_raw_response?: Json | null
          finix_reversal_id?: string | null
          finix_transfer_id?: string
          id?: string
          merchant_name?: string | null
          municipal_user_id?: string
          original_amount_cents?: number
          original_due_date?: string | null
          original_issue_date?: string | null
          payment_history_id?: string
          payment_type?: string | null
          processed_at?: string | null
          reason?: string
          refund_amount_cents?: number
          refund_status?: string
          subcategory?: string | null
          updated_at?: string
          user_id?: string
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
      service_application_documents: {
        Row: {
          application_id: string
          content_type: string
          created_at: string
          customer_id: string
          description: string | null
          document_type: string
          file_name: string
          file_size: number
          id: string
          storage_path: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          content_type: string
          created_at?: string
          customer_id: string
          description?: string | null
          document_type: string
          file_name: string
          file_size: number
          id?: string
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          content_type?: string
          created_at?: string
          customer_id?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number
          id?: string
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_submission_documents: {
        Row: {
          content_type: string
          created_at: string
          description: string | null
          document_type: string
          error_message: string | null
          file_name: string
          file_size: number
          id: string
          original_file_name: string
          retry_count: number | null
          staging_id: string | null
          status: string
          storage_path: string
          tax_submission_id: string | null
          updated_at: string
          upload_progress: number | null
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          description?: string | null
          document_type?: string
          error_message?: string | null
          file_name: string
          file_size: number
          id?: string
          original_file_name: string
          retry_count?: number | null
          staging_id?: string | null
          status?: string
          storage_path: string
          tax_submission_id?: string | null
          updated_at?: string
          upload_progress?: number | null
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          description?: string | null
          document_type?: string
          error_message?: string | null
          file_name?: string
          file_size?: number
          id?: string
          original_file_name?: string
          retry_count?: number | null
          staging_id?: string | null
          status?: string
          storage_path?: string
          tax_submission_id?: string | null
          updated_at?: string
          upload_progress?: number | null
          uploaded_by?: string
        }
        Relationships: []
      }
      tax_submissions: {
        Row: {
          ach_basis_points: number | null
          ach_fixed_fee: number | null
          amount_cents: number
          basis_points: number | null
          calculation_notes: string
          category: string | null
          created_at: string
          customer_id: string
          due_date: string | null
          email: string | null
          failure_code: string | null
          failure_message: string | null
          finix_identity_id: string | null
          finix_merchant_id: string | null
          finix_transfer_id: string | null
          first_name: string | null
          fixed_fee: number | null
          fraud_session_id: string | null
          id: string
          idempotency_id: string | null
          last_name: string | null
          merchant_id: string | null
          merchant_name: string | null
          paid_at: string | null
          payer_business_name: string | null
          payer_city: string | null
          payer_ein: string | null
          payer_phone: string | null
          payer_state: string | null
          payer_street_address: string | null
          payer_zip_code: string | null
          payment_status: string | null
          payment_type: string | null
          raw_finix_response: Json | null
          service_fee_cents: number | null
          statement_descriptor: string | null
          subcategory: string | null
          submission_date: string
          submission_status: string
          submitted_at: string | null
          tax_period_end: string
          tax_period_start: string
          tax_type: string
          tax_year: number
          total_amount_cents: number
          total_amount_due_cents: number
          transfer_state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          amount_cents: number
          basis_points?: number | null
          calculation_notes: string
          category?: string | null
          created_at?: string
          customer_id: string
          due_date?: string | null
          email?: string | null
          failure_code?: string | null
          failure_message?: string | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_transfer_id?: string | null
          first_name?: string | null
          fixed_fee?: number | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id?: string | null
          last_name?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          paid_at?: string | null
          payer_business_name?: string | null
          payer_city?: string | null
          payer_ein?: string | null
          payer_phone?: string | null
          payer_state?: string | null
          payer_street_address?: string | null
          payer_zip_code?: string | null
          payment_status?: string | null
          payment_type?: string | null
          raw_finix_response?: Json | null
          service_fee_cents?: number | null
          statement_descriptor?: string | null
          subcategory?: string | null
          submission_date?: string
          submission_status?: string
          submitted_at?: string | null
          tax_period_end: string
          tax_period_start: string
          tax_type: string
          tax_year: number
          total_amount_cents: number
          total_amount_due_cents: number
          transfer_state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ach_basis_points?: number | null
          ach_fixed_fee?: number | null
          amount_cents?: number
          basis_points?: number | null
          calculation_notes?: string
          category?: string | null
          created_at?: string
          customer_id?: string
          due_date?: string | null
          email?: string | null
          failure_code?: string | null
          failure_message?: string | null
          finix_identity_id?: string | null
          finix_merchant_id?: string | null
          finix_transfer_id?: string | null
          first_name?: string | null
          fixed_fee?: number | null
          fraud_session_id?: string | null
          id?: string
          idempotency_id?: string | null
          last_name?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          paid_at?: string | null
          payer_business_name?: string | null
          payer_city?: string | null
          payer_ein?: string | null
          payer_phone?: string | null
          payer_state?: string | null
          payer_street_address?: string | null
          payer_zip_code?: string | null
          payment_status?: string | null
          payment_type?: string | null
          raw_finix_response?: Json | null
          service_fee_cents?: number | null
          statement_descriptor?: string | null
          subcategory?: string | null
          submission_date?: string
          submission_status?: string
          submitted_at?: string | null
          tax_period_end?: string
          tax_period_start?: string
          tax_type?: string
          tax_year?: number
          total_amount_cents?: number
          total_amount_due_cents?: number
          transfer_state?: string | null
          updated_at?: string
          user_id?: string
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
      user_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
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
          role_name: string | null
          user_email: string | null
          user_first_name: string | null
          user_id: string
          user_last_name: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          id?: string
          role_id: string
          role_name?: string | null
          user_email?: string | null
          user_first_name?: string | null
          user_id: string
          user_last_name?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          id?: string
          role_id?: string
          role_name?: string | null
          user_email?: string | null
          user_first_name?: string | null
          user_id?: string
          user_last_name?: string | null
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
      user_roles_detailed: {
        Row: {
          account_type: string | null
          created_at: string | null
          customer_id: string | null
          entity_id: string | null
          id: string | null
          role_id: string | null
          role_name: string | null
          role_name_current: string | null
          user_email: string | null
          user_first_name: string | null
          user_id: string | null
          user_last_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_organization_invitation: {
        Args: { p_invitation_token: string }
        Returns: boolean
      }
      assign_role_to_user: {
        Args: { _entity_id?: string; _role_name: string; _user_id: string }
        Returns: boolean
      }
      can_view_profile_for_permits: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_address_duplicate: {
        Args: {
          apt_input?: string
          city_input: string
          state_input: string
          street_input: string
          zip_input: string
        }
        Returns: boolean
      }
      check_customer_admin_exists: {
        Args: { p_customer_id: string }
        Returns: boolean
      }
      check_email_duplicate: {
        Args: { email_input: string }
        Returns: boolean
      }
      cleanup_expired_verification_codes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_staged_tax_documents: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_staged_tax_documents: {
        Args: { p_staging_id: string }
        Returns: undefined
      }
      confirm_staged_tax_documents: {
        Args: { p_staging_id: string; p_tax_submission_id: string }
        Returns: undefined
      }
      create_municipal_business_license_type: {
        Args:
          | {
              p_base_fee_cents: number
              p_business_license_type_id: string
              p_customer_id: string
              p_display_order?: number
              p_is_custom?: boolean
              p_merchant_id: string
              p_merchant_name: string
              p_municipal_label: string
            }
          | {
              p_base_fee_cents: number
              p_business_license_type_id?: string
              p_customer_id: string
              p_display_order?: number
              p_is_custom?: boolean
              p_merchant_id?: string
              p_merchant_name?: string
              p_municipal_label: string
            }
        Returns: string
      }
      create_municipal_team_invitation: {
        Args: {
          p_customer_id: string
          p_invitation_email: string
          p_role: string
        }
        Returns: string
      }
      create_organization_invitation: {
        Args: {
          p_invitation_email: string
          p_organization_type: string
          p_role: string
        }
        Returns: string
      }
      create_service_application_with_payment: {
        Args: {
          p_additional_information?: string
          p_amount_cents: number
          p_applicant_email?: string
          p_applicant_name?: string
          p_applicant_phone?: string
          p_apt_number?: string
          p_bank_last_four?: string
          p_business_legal_name?: string
          p_card_brand?: string
          p_card_last_four?: string
          p_city?: string
          p_customer_id: string
          p_documents?: Json
          p_finix_merchant_id: string
          p_fraud_session_id?: string
          p_idempotency_id: string
          p_merchant_id: string
          p_merchant_name: string
          p_payment_instrument_id: string
          p_payment_type: string
          p_service_fee_cents: number
          p_service_specific_data?: Json
          p_state?: string
          p_statement_descriptor: string
          p_street_address?: string
          p_tile_id: string
          p_total_amount_cents: number
          p_user_id: string
          p_zip_code?: string
        }
        Returns: Json
      }
      create_tax_submission_with_payment: {
        Args:
          | {
              p_amount_cents: number
              p_bank_last_four?: string
              p_calculation_data: Json
              p_card_brand?: string
              p_card_last_four?: string
              p_category?: string
              p_customer_id: string
              p_finix_merchant_id: string
              p_first_name?: string
              p_fraud_session_id?: string
              p_idempotency_id: string
              p_last_name?: string
              p_merchant_id: string
              p_merchant_name?: string
              p_payer_business_name?: string
              p_payer_city?: string
              p_payer_ein?: string
              p_payer_phone?: string
              p_payer_state?: string
              p_payer_street_address?: string
              p_payer_zip_code?: string
              p_payment_instrument_id: string
              p_payment_type: string
              p_service_fee_cents: number
              p_statement_descriptor?: string
              p_subcategory?: string
              p_tax_period_end: string
              p_tax_period_start: string
              p_tax_type: string
              p_tax_year: number
              p_total_amount_cents: number
              p_user_email?: string
              p_user_id: string
            }
          | {
              p_amount_cents: number
              p_bank_last_four?: string
              p_calculation_data: Json
              p_card_brand?: string
              p_card_last_four?: string
              p_category?: string
              p_customer_id: string
              p_finix_merchant_id: string
              p_first_name?: string
              p_fraud_session_id?: string
              p_idempotency_id: string
              p_last_name?: string
              p_merchant_id: string
              p_merchant_name?: string
              p_payment_instrument_id: string
              p_payment_type: string
              p_service_fee_cents: number
              p_statement_descriptor?: string
              p_subcategory?: string
              p_tax_period_end: string
              p_tax_period_start: string
              p_tax_type: string
              p_tax_year: number
              p_total_amount_cents: number
              p_user_email?: string
              p_user_id: string
            }
          | {
              p_amount_cents: number
              p_bank_last_four?: string
              p_calculation_notes: string
              p_card_brand?: string
              p_card_last_four?: string
              p_category?: string
              p_customer_id: string
              p_finix_merchant_id: string
              p_first_name?: string
              p_fraud_session_id?: string
              p_idempotency_id: string
              p_last_name?: string
              p_merchant_id: string
              p_merchant_name?: string
              p_payer_business_name?: string
              p_payer_city?: string
              p_payer_ein?: string
              p_payer_phone?: string
              p_payer_state?: string
              p_payer_street_address?: string
              p_payer_zip_code?: string
              p_payment_instrument_id: string
              p_payment_type: string
              p_service_fee_cents: number
              p_statement_descriptor?: string
              p_subcategory?: string
              p_tax_period_end: string
              p_tax_period_start: string
              p_tax_type: string
              p_tax_year: number
              p_total_amount_cents: number
              p_total_amount_due_cents: number
              p_user_email?: string
              p_user_id: string
            }
        Returns: Json
      }
      disable_user_payment_instrument: {
        Args: { p_id: string }
        Returns: undefined
      }
      generate_license_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_permit_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_service_application_number: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_municipal_business_license_types: {
        Args: { p_customer_id: string }
        Returns: {
          base_fee_cents: number
          business_license_type_id: string
          created_at: string
          customer_id: string
          display_order: number
          id: string
          is_active: boolean
          is_custom: boolean
          merchant_id: string
          merchant_name: string
          municipal_label: string
          updated_at: string
        }[]
      }
      get_municipal_questions: {
        Args: { p_customer_id: string; p_merchant_id?: string }
        Returns: {
          created_at: string
          customer_id: string
          display_order: number
          help_text: string
          id: string
          is_active: boolean
          is_required: boolean
          merchant_id: string
          merchant_name: string
          question_options: Json
          question_text: string
          question_type: string
          updated_at: string
        }[]
      }
      get_municipal_team_members: {
        Args: { p_customer_id: string }
        Returns: {
          email: string
          first_name: string
          id: string
          joined_at: string
          last_name: string
          member_id: string
          phone: string
          role: string
        }[]
      }
      get_organization_members: {
        Args: { user_id: string }
        Returns: {
          email: string
          first_name: string
          id: string
          joined_at: string
          last_name: string
          member_id: string
          organization_type: string
          phone: string
          role: string
        }[]
      }
      get_payment_instrument_display_name: {
        Args: {
          p_bank_last_four: string
          p_card_brand: string
          p_card_last_four: string
          p_instrument_type: string
          p_nickname: string
        }
        Returns: string
      }
      get_role_id_by_name: {
        Args: { _role_name: string }
        Returns: string
      }
      get_user_bill_summary_for_municipal: {
        Args: { p_user_id: string }
        Returns: {
          account_type: string
          apt_number: string
          business_legal_name: string
          city: string
          created_at: string
          email: string
          first_name: string
          has_bills: boolean
          last_name: string
          phone: string
          state: string
          street_address: string
          total_amount_due_cents: number
          unpaid_bill_count: number
          updated_at: string
          user_id: string
          zip_code: string
        }[]
      }
      get_user_payment_instruments_with_display_names: {
        Args: Record<PropertyKey, never>
        Returns: {
          bank_account_type: string
          bank_last_four: string
          billing_address_line1: string
          billing_city: string
          billing_postal_code: string
          billing_region: string
          card_brand: string
          card_expiration_month: number
          card_expiration_year: number
          card_last_four: string
          created_at: string
          display_name: string
          enabled: boolean
          finix_payment_instrument_id: string
          id: string
          instrument_type: string
          is_default: boolean
          nickname: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_profile_for_municipal: {
        Args: { p_user_id: string }
        Returns: {
          account_type: string
          apt_number: string
          business_legal_name: string
          city: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          state: string
          street_address: string
          updated_at: string
          zip_code: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          entity_id: string
          role: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_permission: {
        Args:
          | { _entity_id?: string; _permission: string; _user_id: string }
          | { permission_name: string }
        Returns: boolean
      }
      has_role: {
        Args: { _entity_id?: string; _role: string; _user_id: string }
        Returns: boolean
      }
      initialize_standard_business_license_types: {
        Args: { p_customer_id: string }
        Returns: boolean
      }
      is_business_admin: {
        Args: { business_id: string }
        Returns: boolean
      }
      is_current_user_super_admin: {
        Args: Record<PropertyKey, never>
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
          p_component_type?: string
          p_confidence_level?: string
          p_event_type: string
          p_original_value: string
          p_standardized_value?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      normalize_business_name: {
        Args: { business_name: string }
        Returns: string
      }
      remove_municipal_team_member: {
        Args: { p_customer_id: string; p_member_id: string }
        Returns: boolean
      }
      remove_role_from_user: {
        Args: { _entity_id?: string; _role_name: string; _user_id: string }
        Returns: boolean
      }
      rollback_service_application_payment: {
        Args: { p_application_id: string; p_payment_history_id: string }
        Returns: Json
      }
      set_default_user_payment_instrument: {
        Args: { p_id: string }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      smart_bill_matching: {
        Args: { input_bill_id: string }
        Returns: undefined
      }
      update_municipal_business_license_type: {
        Args: {
          p_base_fee_cents?: number
          p_display_order?: number
          p_id: string
          p_is_active?: boolean
          p_municipal_label?: string
        }
        Returns: boolean
      }
      update_municipal_team_member_role: {
        Args: { p_customer_id: string; p_member_id: string; p_new_role: string }
        Returns: boolean
      }
      validate_merchant_category_subcategory: {
        Args: { p_category: string; p_subcategory: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "municipaladmin"
        | "municipaluser"
        | "residentadmin"
        | "residentuser"
        | "businessadmin"
        | "businessuser"
      assignment_status_enum: "assigned" | "unassigned" | "pending_review"
      bill_status_enum:
        | "paid"
        | "unpaid"
        | "overdue"
        | "delinquent"
        | "cancelled"
        | "disputed"
        | "refunded"
      business_license_status_enum:
        | "draft"
        | "submitted"
        | "under_review"
        | "information_requested"
        | "resubmitted"
        | "approved"
        | "denied"
        | "withdrawn"
        | "expired"
        | "issued"
      data_quality_status_enum:
        | "validated"
        | "pending_validation"
        | "failed_validation"
        | "manual_review_required"
        | "corrected"
      fee_profile_sync_status: "pending" | "synced" | "error"
      payment_method_type: "card" | "ach"
      payment_status_enum: "paid" | "unpaid" | "partially_paid"
      payment_type_enum:
        | "PAYMENT_CARD"
        | "BANK_ACCOUNT"
        | "APPLE_PAY"
        | "GOOGLE_PAY"
      payout_frequency: "DAILY" | "MONTHLY" | "CONTINUOUS"
      payout_rail: "NEXT_DAY_ACH" | "SAME_DAY_ACH"
      payout_type: "GROSS" | "NET"
      permit_status_enum:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "issued"
        | "expired"
        | "information_requested"
        | "resubmitted"
        | "denied"
        | "withdrawn"
      service_application_status_enum:
        | "draft"
        | "submitted"
        | "under_review"
        | "information_requested"
        | "approved"
        | "denied"
        | "paid"
        | "completed"
        | "withdrawn"
        | "expired"
        | "issued"
      sync_status: "synced" | "pending" | "error"
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
        "superadmin",
        "municipaladmin",
        "municipaluser",
        "residentadmin",
        "residentuser",
        "businessadmin",
        "businessuser",
      ],
      assignment_status_enum: ["assigned", "unassigned", "pending_review"],
      bill_status_enum: [
        "paid",
        "unpaid",
        "overdue",
        "delinquent",
        "cancelled",
        "disputed",
        "refunded",
      ],
      business_license_status_enum: [
        "draft",
        "submitted",
        "under_review",
        "information_requested",
        "resubmitted",
        "approved",
        "denied",
        "withdrawn",
        "expired",
        "issued",
      ],
      data_quality_status_enum: [
        "validated",
        "pending_validation",
        "failed_validation",
        "manual_review_required",
        "corrected",
      ],
      fee_profile_sync_status: ["pending", "synced", "error"],
      payment_method_type: ["card", "ach"],
      payment_status_enum: ["paid", "unpaid", "partially_paid"],
      payment_type_enum: [
        "PAYMENT_CARD",
        "BANK_ACCOUNT",
        "APPLE_PAY",
        "GOOGLE_PAY",
      ],
      payout_frequency: ["DAILY", "MONTHLY", "CONTINUOUS"],
      payout_rail: ["NEXT_DAY_ACH", "SAME_DAY_ACH"],
      payout_type: ["GROSS", "NET"],
      permit_status_enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "issued",
        "expired",
        "information_requested",
        "resubmitted",
        "denied",
        "withdrawn",
      ],
      service_application_status_enum: [
        "draft",
        "submitted",
        "under_review",
        "information_requested",
        "approved",
        "denied",
        "paid",
        "completed",
        "withdrawn",
        "expired",
        "issued",
      ],
      sync_status: ["synced", "pending", "error"],
      vehicle_type: ["personal", "business"],
    },
  },
} as const
