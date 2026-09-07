// Hand-written request and response shapes for the endpoints the mobile app
// uses in Phase 0, matching apps/api/swagger/v1/openapi.yaml. Session 0.9
// replaces this file with the openapi-typescript output in @curb/types; keep
// the names identical so that swap is mechanical.

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  home_label: string | null;
  is_host: boolean;
  links: Record<string, string>;
  clubs: unknown[];
  counts: Record<string, number>;
  viewer: { following: boolean; blocked: boolean; is_self: boolean; reported: boolean };
}

export interface User {
  id: string;
  email: string | null;
  role: 'member' | 'moderator' | 'admin';
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  profile: Profile;
  identities: Array<{ provider: 'apple' | 'google'; email: string | null }>;
  notification_prefs: Record<string, unknown>;
  unread_notifications_count?: number;
}

export interface Device {
  anonymous_id: string;
  platform: 'ios' | 'android' | 'web';
  push_enabled: boolean;
  push_token_present: boolean;
  app_version: string | null;
  timezone: string | null;
  user_id: string | null;
  home_location: { lat: number; lng: number } | null;
  last_seen_at: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> | null };
}

export interface SignInResponse {
  data: { token: string; user: User; is_new: boolean };
}

interface Json<T> {
  content: { 'application/json': T };
}

interface ErrorResponses {
  400: Json<ApiErrorBody>;
  401: Json<ApiErrorBody>;
  403: Json<ApiErrorBody>;
  404: Json<ApiErrorBody>;
  422: Json<ApiErrorBody>;
  429: Json<ApiErrorBody>;
}

export interface paths {
  '/v1/auth/apple': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            identity_token: string;
            authorization_code: string;
            nonce: string;
            full_name?: { givenName?: string | null; familyName?: string | null } | null;
          };
        };
      };
      responses: { 200: Json<SignInResponse>; 201: Json<SignInResponse> } & ErrorResponses;
    };
  };
  '/v1/auth/google': {
    post: {
      requestBody: { content: { 'application/json': { id_token: string } } };
      responses: { 200: Json<SignInResponse>; 201: Json<SignInResponse> } & ErrorResponses;
    };
  };
  '/v1/auth/session': {
    delete: { responses: { 204: { content: never } } & ErrorResponses };
  };
  '/v1/me': {
    get: { responses: { 200: Json<{ data: User }> } & ErrorResponses };
    patch: {
      requestBody: {
        content: { 'application/json': { profile: { handle?: string; display_name?: string } } };
      };
      responses: { 200: Json<{ data: User }> } & ErrorResponses;
    };
    delete: { responses: { 202: Json<{ data: { purge_after: string } }> } & ErrorResponses };
  };
  '/v1/devices': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            anonymous_id: string;
            platform: 'ios' | 'android' | 'web';
            push_token?: string | null;
            app_version?: string;
            home_location?: { lat: number; lng: number } | null;
            timezone?: string;
          };
        };
      };
      responses: { 200: Json<{ data: Device }>; 201: Json<{ data: Device }> } & ErrorResponses;
    };
  };
  '/v1/devices/{anonymous_id}': {
    patch: {
      parameters: { path: { anonymous_id: string } };
      requestBody: {
        content: {
          'application/json': {
            push_token?: string | null;
            push_enabled?: boolean;
            app_version?: string;
            home_location?: { lat: number; lng: number } | null;
            timezone?: string;
          };
        };
      };
      responses: { 200: Json<{ data: Device }> } & ErrorResponses;
    };
  };
  '/v1/health': {
    get: {
      responses: {
        200: Json<{ status: 'ok' | 'degraded'; db: boolean; queue_lag_s: number | null }>;
      };
    };
  };
}
