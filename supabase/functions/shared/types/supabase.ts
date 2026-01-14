/**
 * Supabase client type for Edge Functions.
 * 
 * This provides a minimal type interface for the Supabase client used in Edge Functions.
 * We avoid importing the full Supabase types to keep the Edge Function bundle small,
 * but this gives us some structure and autocomplete for common operations.
 */

/**
 * Generic query result type for Supabase operations
 * The data type uses an index signature to allow flexible field access
 */
export interface SupabaseQueryResult<T = Record<string, unknown>> {
  data: (T & Record<string, unknown>) | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

/**
 * Type for RPC call results
 */
export interface SupabaseRpcResult<T = Record<string, unknown>> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/**
 * Type for Edge Function invocation results
 */
export interface SupabaseFunctionResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

/**
 * Minimal interface for Supabase query builder
 * This provides type hints for the most common operations
 */
export interface SupabaseQueryBuilder<T = Record<string, unknown>> {
  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): SupabaseQueryBuilder<T>;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder<T>;
  update(values: Record<string, unknown>): SupabaseQueryBuilder<T>;
  delete(): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  neq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  gt(column: string, value: unknown): SupabaseQueryBuilder<T>;
  gte(column: string, value: unknown): SupabaseQueryBuilder<T>;
  lt(column: string, value: unknown): SupabaseQueryBuilder<T>;
  lte(column: string, value: unknown): SupabaseQueryBuilder<T>;
  like(column: string, pattern: string): SupabaseQueryBuilder<T>;
  ilike(column: string, pattern: string): SupabaseQueryBuilder<T>;
  is(column: string, value: null | boolean): SupabaseQueryBuilder<T>;
  in(column: string, values: unknown[]): SupabaseQueryBuilder<T>;
  contains(column: string, value: unknown): SupabaseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  limit(count: number): SupabaseQueryBuilder<T>;
  range(from: number, to: number): SupabaseQueryBuilder<T>;
  single(): Promise<SupabaseQueryResult<T>>;
  maybeSingle(): Promise<SupabaseQueryResult<T | null>>;
  then<TResult>(onfulfilled?: (value: SupabaseQueryResult<T[]>) => TResult | Promise<TResult>): Promise<TResult>;
}

/**
 * Minimal interface for Supabase auth
 */
export interface SupabaseAuth {
  getUser(): Promise<{ data: { user: { id: string; email?: string } | null }; error: { message: string } | null }>;
}

/**
 * Minimal interface for Supabase storage
 */
export interface SupabaseStorage {
  from(bucket: string): {
    upload(path: string, file: Blob | File, options?: Record<string, unknown>): Promise<{ data: { path: string } | null; error: { message: string } | null }>;
    download(path: string): Promise<{ data: Blob | null; error: { message: string } | null }>;
    getPublicUrl(path: string): { data: { publicUrl: string } };
    remove(paths: string[]): Promise<{ data: unknown; error: { message: string } | null }>;
  };
}

/**
 * Minimal interface for Supabase Edge Functions client
 */
export interface SupabaseFunctions {
  invoke<T = unknown>(name: string, options?: { body?: Record<string, unknown> }): Promise<SupabaseFunctionResult<T>>;
}

/**
 * Minimal Supabase client interface for Edge Functions
 * 
 * This is intentionally kept simple to avoid type complexity while still
 * providing useful autocomplete and type checking for common operations.
 */
export interface SupabaseEdgeClient {
  from<T = Record<string, unknown>>(table: string): SupabaseQueryBuilder<T>;
  rpc<T = Record<string, unknown>>(fn: string, params?: Record<string, unknown>): Promise<SupabaseRpcResult<T>>;
  auth: SupabaseAuth;
  storage: SupabaseStorage;
  functions: SupabaseFunctions;
}

/**
 * Type alias for cleaner function signatures
 * Use this instead of `any` for supabase parameters
 */
export type SupabaseClient = SupabaseEdgeClient;
