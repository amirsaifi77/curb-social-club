import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('sentry-test', 'routes/sentry-test.tsx'),
] satisfies RouteConfig;
