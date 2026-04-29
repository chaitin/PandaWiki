'use client';

import LoginModal from '@/components/LoginModal';

export default function PagesClientChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <LoginModal />
    </>
  );
}
