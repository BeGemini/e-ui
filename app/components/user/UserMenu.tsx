'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface UserMenuUser {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: string;
}

function resolveAvatarSrc(avatarUrl: string): string {
  // Full URLs (external or legacy) are used as-is; COS object keys go
  // through the authenticated avatar proxy.
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const base = `/api/avatar/${avatarUrl}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function AvatarImage({
  user,
  sizeClass = 'h-9 w-9',
  textClass = 'text-sm',
}: {
  user: UserMenuUser;
  sizeClass?: string;
  textClass?: string;
}) {
  const initial = (user.name || user.email).charAt(0).toUpperCase();

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolveAvatarSrc(user.avatarUrl)}
        alt={user.name || user.email}
        className={`${sizeClass} rounded-full object-cover border border-gray-200`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-blue-600 text-white flex items-center justify-center font-medium ${textClass}`}
    >
      {initial}
    </div>
  );
}

export default function UserMenu({ user }: { user: UserMenuUser }) {
  const router = useRouter();

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }

    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button aria-label="User menu" title="User menu" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer" />}
      >
        <AvatarImage user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              {user.name && (
                <span className="text-sm font-medium text-gray-900">{user.name}</span>
              )}
              <span className="truncate">{user.email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/profile" />}
          className="cursor-pointer"
        >
          <UserIcon />
          Profile
        </DropdownMenuItem>
        {user.role === 'admin' && (
          <DropdownMenuItem
            render={<Link href="/admin" />}
            className="cursor-pointer"
          >
            <Settings />
            Content management
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onClick={handleLogout}
          className="cursor-pointer"
        >
          <LogOut />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
