'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import { cilAccountLogout, cilPeople, cilUser } from '@coreui/icons';
import {
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CSpinner,
} from '@coreui/react';
import { useAuth } from '@/contexts/AuthContext';
import { Z_INDEX } from './constants';

/**
 * UserMenuDropdown Component
 *
 * Dropdown menu for user-related actions with authentication integration.
 * Shows different options based on auth status and user role.
 */
export default function UserMenuDropdown() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  const handleLogout = () => {
    logout();
  };

  const getDisplayName = () => {
    if (!user) return 'Sign In';
    if (user.first_name) return user.first_name;
    return user.username;
  };

  return (
    <CDropdown alignment="end" variant="nav-item">
      <CDropdownToggle
        caret={false}
        color="primary"
        className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold border-0"
        aria-label="User menu"
      >
        <CIcon icon={cilUser} />
        {getDisplayName()}
      </CDropdownToggle>

      <CDropdownMenu style={{ minWidth: '16rem', zIndex: Z_INDEX.DROPDOWN }}>
        {isLoading ? (
          <div className="py-4 text-center">
            <CSpinner color="primary" size="sm" />
          </div>
        ) : isAuthenticated && user ? (
          <>
            <CDropdownHeader className="py-3">
              <div className="fw-semibold">
                {user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.username}
              </div>
              <div className="small text-body-secondary">{user.email}</div>
            </CDropdownHeader>

            <CDropdownItem
              onClick={() => handleNavigate('/settings/profile')}
              className="d-flex align-items-center gap-2"
            >
              <CIcon icon={cilUser} />
              Profile Settings
            </CDropdownItem>

            {user.is_staff && (
              <CDropdownItem
                onClick={() => handleNavigate('/admin/users')}
                className="d-flex align-items-center gap-2"
              >
                <CIcon icon={cilPeople} />
                User Management
              </CDropdownItem>
            )}

            <CDropdownDivider />

            <CDropdownItem
              onClick={handleLogout}
              className="d-flex align-items-center gap-2 text-danger"
            >
              <CIcon icon={cilAccountLogout} />
              Sign Out
            </CDropdownItem>
          </>
        ) : (
          <>
            <CDropdownItem
              onClick={() => handleNavigate('/login')}
              className="d-flex align-items-center gap-2"
            >
              <CIcon icon={cilUser} />
              Sign In
            </CDropdownItem>
            <CDropdownItem
              onClick={() => handleNavigate('/register')}
              className="d-flex align-items-center gap-2"
            >
              <CIcon icon={cilUser} />
              Create Account
            </CDropdownItem>
          </>
        )}
      </CDropdownMenu>
    </CDropdown>
  );
}
