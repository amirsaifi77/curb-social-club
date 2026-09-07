import type { components, paths } from './generated';
export type { components, paths } from './generated';
export type ApiPath = keyof paths;
type Schemas = components['schemas'];
export type ApiErrorBody = Schemas['Error'];
export type Profile = Schemas['Profile'];
export type User = Schemas['User'];
export type Device = Schemas['Device'];
type Operation<P extends ApiPath, M extends keyof paths[P]> = NonNullable<paths[P][M]>;
export type JsonResponse<P extends ApiPath, M extends keyof paths[P], S extends number> = Operation<P, M> extends {
    responses: infer R;
} ? S extends keyof R ? R[S] extends {
    content: {
        'application/json': infer Body;
    };
} ? Body : never : never : never;
export type JsonRequest<P extends ApiPath, M extends keyof paths[P]> = Operation<P, M> extends {
    requestBody?: infer Request;
} ? NonNullable<Request> extends {
    content: {
        'application/json': infer Body;
    };
} ? Body : never : never;
export type SignInWithAppleBody = JsonRequest<'/v1/auth/apple', 'post'>;
export type SignInWithGoogleBody = JsonRequest<'/v1/auth/google', 'post'>;
export type SignInResponse = JsonResponse<'/v1/auth/google', 'post', 200>;
export type MeResponse = JsonResponse<'/v1/me', 'get', 200>;
export type UpdateMeBody = JsonRequest<'/v1/me', 'patch'>;
export type DeleteMeResponse = JsonResponse<'/v1/me', 'delete', 202>;
export type RegisterDeviceBody = JsonRequest<'/v1/devices', 'post'>;
export type UpdateDeviceBody = JsonRequest<'/v1/devices/{anonymous_id}', 'patch'>;
export type DeviceResponse = JsonResponse<'/v1/devices', 'post', 201>;
export type HealthResponse = JsonResponse<'/v1/health', 'get', 200>;
//# sourceMappingURL=index.d.ts.map