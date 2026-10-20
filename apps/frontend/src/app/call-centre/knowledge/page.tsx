'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const knowledgeSections = [
  {
    title: 'Member Verification Checklist',
    points: [
      'Confirm the member number and ID number match the member record.',
      'Check that status is active and a plan is assigned.',
      'Confirm the start date before discussing waiting periods.',
      'Use the eligibility screen before promising benefit availability.',
    ],
  },
  {
    title: 'Application Verification Flow',
    points: [
      'Open the submitted application from Member Support.',
      'Review personal details, address, plan, banking, and uploaded documents.',
      'Call the applicant, verify identity, and record the conversation.',
      'Only move the application to under_review after notes and call recording are complete.',
    ],
  },
  {
    title: 'When to Escalate',
    points: [
      'Send to Operations if member records or payment grouping need correction.',
      'Send to Claims if the issue is claim status, pended reasons, or fraud review.',
      'Send to Admin if an application needs approval or a system-level override.',
      'Log broken screens, missing data, or workflow bugs through the support escalation process.',
    ],
  },
  {
    title: 'Provider Support Reminders',
    points: [
      'Use Eligibility Check before advising on benefits.',
      'Pre-authorization requests must resolve to a real member record.',
      'Provider claims history is linked to the provider table id, not just the auth user id.',
      'If a provider says claims are missing, verify the provider record and member match first.',
    ],
  },
];

export default function CallCentreKnowledgePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && !user.roles.includes('call_centre_agent')) {
      router.push('/dashboard');
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600 mt-1">Quick guides for member support, verification, and escalation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {knowledgeSections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-700">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Jump straight into the tools the team uses most</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => router.push('/call-centre/support')}>Open Member Support</Button>
            <Button variant="outline" onClick={() => router.push('/call-centre/members')}>Open Member Lookup</Button>
            <Button variant="outline" onClick={() => router.push('/provider/eligibility')}>Provider Eligibility</Button>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
