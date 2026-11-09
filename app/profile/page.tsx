'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AvatarImage, type UserMenuUser } from '@/app/components/user/UserMenu';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserMenuUser | null>(null);
  const [name, setName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
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
        setName(data.user.name || '');
      } catch (err) {
        console.error('Failed to load profile:', err);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'Name cannot be empty', variant: 'destructive' });
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: data.error || 'Failed to update name',
          variant: 'destructive',
        });
        return;
      }

      const data = await res.json();
      setUser(data.user);
      toast({ title: 'Name updated' });
    } catch (err) {
      console.error('Failed to update name:', err);
      toast({ title: 'Failed to update name', variant: 'destructive' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: data.error || 'Failed to upload avatar',
          variant: 'destructive',
        });
        return;
      }

      const data = await res.json();
      setUser((prev) => (prev ? { ...prev, avatarUrl: data.avatarUrl } : prev));
      toast({ title: 'Avatar updated' });
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      toast({ title: 'Failed to upload avatar', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemoving(true);
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: data.error || 'Failed to remove avatar',
          variant: 'destructive',
        });
        return;
      }

      setUser((prev) => (prev ? { ...prev, avatarUrl: null } : prev));
      toast({ title: 'Avatar removed' });
    } catch (err) {
      console.error('Failed to remove avatar:', err);
      toast({ title: 'Failed to remove avatar', variant: 'destructive' });
    } finally {
      setIsRemoving(false);
    }
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard" />}
            nativeButton={false}
          >
            <ArrowLeft />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Manage your avatar, display name and account info
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <AvatarImage
                  user={user}
                  sizeClass="h-24 w-24"
                  textClass="text-3xl"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  aria-label="Change avatar"
                  title="Change avatar"
                  className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-2 text-white shadow hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div>
                <p className="font-medium text-gray-900">Avatar</p>
                <p className="text-sm text-gray-600">
                  JPG, PNG, WebP or GIF, up to 5MB
                </p>
                {isUploading && (
                  <p className="mt-1 text-sm text-blue-600">Uploading...</p>
                )}
                {user.avatarUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isRemoving || isUploading}
                    className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {isRemoving ? 'Removing...' : 'Remove avatar'}
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={100}
                />
                <Button
                  onClick={handleSaveName}
                  disabled={isSavingName || name.trim() === (user.name || '')}
                >
                  {isSavingName ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled readOnly />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
