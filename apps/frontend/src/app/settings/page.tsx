'use client';

import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { SettingsContent } from '@/components/settings/settings-content';

export default function SettingsPage() {
  return (
    <SidebarLayout>
      <SettingsContent />
    </SidebarLayout>
  );
}
