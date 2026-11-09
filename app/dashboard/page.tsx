'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardOverview from '@/app/components/dashboard/DashboardOverview';
import ExerciseList from '@/app/components/exercise-list/ExerciseList';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
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
