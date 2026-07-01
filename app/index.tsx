import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../utils/auth';

/**
 * Auth gate. While the session bootstraps (`status === 'loading'`) we render
 * nothing and let the native splash stay up (see `app/_layout.tsx`); once
 * resolved we redirect into the right stack.
 */
export default function Index() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  return <Redirect href={status === 'authenticated' ? '/home' : '/login'} />;
}
