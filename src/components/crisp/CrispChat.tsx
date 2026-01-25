'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const HIDDEN_PATH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

const CRISP_SCRIPT_ID = 'crisp-chat-widget';

export function CrispChat() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const shouldHide = useMemo(() => {
    if (!pathname) return false;
    return HIDDEN_PATH_PREFIXES.some((path) => pathname.startsWith(path));
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated || shouldHide) {
      if (typeof window !== 'undefined' && window.$crisp) {
        window.$crisp.push(['do', 'chat:hide']);
      }
      return;
    }

    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!websiteId) {
      console.warn('Crisp Website ID not configured');
      return;
    }

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = websiteId;

    if (!document.getElementById(CRISP_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = CRISP_SCRIPT_ID;
      script.src = 'https://client.crisp.chat/l.js';
      script.async = true;
      document.head.appendChild(script);
    }

    window.$crisp.push(['do', 'chat:show']);
  }, [isAuthenticated, shouldHide]);

  useEffect(() => {
    if (!isAuthenticated || !user || shouldHide) return;
    if (typeof window === 'undefined' || !window.$crisp) return;

    const timeout = setTimeout(() => {
      try {
        const isAdmin = (user as { is_admin?: boolean; is_staff?: boolean }).is_admin
          ?? (user as { is_staff?: boolean }).is_staff;

        if (user.email) {
          window.$crisp.push(['set', 'user:email', [user.email]]);
        }

        const nickname = user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.username;

        if (nickname) {
          window.$crisp.push(['set', 'user:nickname', [nickname]]);
        }

        window.$crisp.push(['set', 'session:data', [
          ['user_id', user.id?.toString() || ''],
          ['username', user.username || ''],
          ['role', user.role || ''],
          ['is_admin', isAdmin ? 'Yes' : 'No'],
        ]]);

        const segments = [user.role || 'unknown'];
        if (isAdmin) segments.push('admin');
        window.$crisp.push(['set', 'session:segments', [segments]]);
      } catch (error) {
        console.error('Error setting Crisp user data:', error);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, shouldHide, user]);

  return null;
}

export default CrispChat;
