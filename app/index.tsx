import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../utils/auth';

export default function Index() {
  const { authed } = useAuth();
  return <Redirect href={authed ? '/home' : '/login'} />;
}
