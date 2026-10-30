'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ExerciseList from '@/app/components/exercise-list/ExerciseList';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }

        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error('Auth check failed:', err);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Logout failed:', err);
    }

    localStorage.removeItem('token');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                English Listening Dictation
              </h1>
              {user && (
                <p className="text-sm text-gray-600">
                  Welcome, {user.email}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user?.role === 'admin' && (
                <Button variant="outline" render={<Link href="/admin" />} nativeButton={false}>
                  Content management
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-gray-300 hover:bg-gray-100"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Available Exercises
          </h2>
          <p className="text-sm text-gray-600">
            Choose an exercise to practice
          </p>
        </div>

        <ExerciseList />
      </main>
    </div>
  );
}
