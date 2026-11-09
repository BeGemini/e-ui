'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardOverview from '@/app/components/dashboard/DashboardOverview';
import ExerciseList from '@/app/components/exercise-list/ExerciseList';
import UserMenu, { type UserMenuUser } from '@/app/components/user/UserMenu';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserMenuUser | null>(null);

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
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/assets/logo.png"
                alt="Logo"
                className="h-10 w-10 rounded-lg"
              />
              {user && (
                <p className="text-sm text-gray-600">
                  Welcome, {user.name || user.email}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user && <UserMenu user={user} />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <DashboardOverview />

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Browse exercises
          </h2>

          <ExerciseList />
        </section>
      </main>
    </div>
  );
}
