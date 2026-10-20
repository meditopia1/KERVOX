'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { PageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { authFetch } from '@/lib/auth-fetch';
import { FileText } from 'lucide-react';

type AuthorizationPage =
  | 'dashboard'
  | 'member-verification'
  | 'ambulance-benefit'
  | 'hospital-benefit'
  | 'gop-intake'
  | 'history';

interface AuthorizationWorkspaceProps {
  page: AuthorizationPage;
}

const sharedChecks = [
  'Member active status',
  'Policy status',
  'Plan name',
  'Waiting periods',
  'Current exclusions',
  'Verification audit note',
];

export function AuthorizationWorkspace({ page }: AuthorizationWorkspaceProps) {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const roles = user?.roles || [];
  const isAmbulance = roles.includes('ambulance_operator');
  const isAfricaAssist = roles.includes('africa_assist_authorization');
  const isAuthorized = isAmbulance || isAfricaAssist;
  const workspaceName = isAfricaAssist ? 'Africa Assist Pre-Auth' : 'Ambulance Authorization';

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <PageLoading message="Loading authorization workspace..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isAuthorized) {
    return (
      <SidebarLayout>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Authorizations</h1>
          <Card>
            <CardHeader>
              <CardTitle>Access Restricted</CardTitle>
              <CardDescription>This workspace is limited to authorization users.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  const isRolePageAllowed =
    page !== 'ambulance-benefit' || isAmbulance;
  const isPartnerPageAllowed =
    !['hospital-benefit', 'gop-intake'].includes(page) || isAfricaAssist;

  if (!isRolePageAllowed || !isPartnerPageAllowed) {
    return (
      <SidebarLayout>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Authorizations</h1>
          <Card>
            <CardHeader>
              <CardTitle>Workspace Not Available</CardTitle>
              <CardDescription>This page is not enabled for your authorization role.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/authorizations/dashboard')}>Go to Authorization Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Authorizations</p>
            <h1 className="text-3xl font-bold text-gray-900">{pageTitle(page, isAfricaAssist)}</h1>
            <p className="mt-1 text-gray-600">{workspaceName}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
            Signed in as <span className="font-medium text-gray-900">{user?.email}</span>
          </div>
        </div>

        {page === 'dashboard' && (
          <DashboardView isAfricaAssist={isAfricaAssist} />
        )}

        {page === 'member-verification' && (
          <VerificationView
            title={isAfricaAssist ? 'Hospital Benefit Check' : 'Ambulance Benefit Check'}
            description={
              isAfricaAssist
                ? 'Search once to verify the member and auto-fill policy status, plan name, and hospital benefit result.'
                : 'Search once to verify the member and auto-fill policy status, plan name, and ambulance benefit result.'
            }
            checks={isAfricaAssist ? hospitalBenefitChecks() : ambulanceBenefitChecks()}
            actionLabel={isAfricaAssist ? 'Verify Hospital Benefit' : 'Verify Ambulance Benefit'}
            benefitType={isAfricaAssist ? 'hospital' : 'ambulance'}
          />
        )}

        {page === 'ambulance-benefit' && (
          <VerificationView
            title="Ambulance Benefit Check"
            description="Confirm whether the active plan includes ambulance benefits before authorization proceeds."
            checks={[
              ...sharedChecks,
              'Ambulance benefit included in plan',
              'Emergency transport limits',
              'Trip or annual limit status',
              'Authorization proceed / decline outcome',
            ]}
            actionLabel="Check Ambulance Benefit"
            benefitType="ambulance"
          />
        )}

        {page === 'hospital-benefit' && (
          <VerificationView
            title="Hospital Benefit Check"
            description="Confirm whether the active plan includes hospital benefits before GOP or pre-auth proceeds."
            checks={[
              ...sharedChecks,
              'Hospital benefit included in plan',
              'Admission benefit limits',
              'Accident / illness cover rules',
              'GOP proceed / decline outcome',
            ]}
            actionLabel="Check Hospital Benefit"
            benefitType="hospital"
          />
        )}

        {page === 'gop-intake' && (
          <GopIntakeView />
        )}

        {page === 'history' && (
          <HistoryView />
        )}
      </div>
    </SidebarLayout>
  );
}

function DashboardView({ isAfricaAssist }: { isAfricaAssist: boolean }) {
  const primaryCheck = isAfricaAssist ? 'Hospital Benefit Check' : 'Ambulance Benefit Check';
  const primaryDescription = isAfricaAssist
    ? 'Verify active hospital benefit, waiting periods, limits, and whether GOP can proceed.'
    : 'Verify active ambulance benefit, waiting periods, limits, and whether authorization can proceed.';

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Pending Verifications" value="0" tone="text-yellow-700" />
        <MetricCard label="Cleared Today" value="0" tone="text-green-700" />
        <MetricCard label={isAfricaAssist ? 'GOP Intakes' : 'Ambulance Checks'} value="0" tone="text-blue-700" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ActionCard title={primaryCheck} description={primaryDescription} href="/authorizations/member-verification" />
        {isAfricaAssist ? (
          <ActionCard title="GOP Intake" description="Upload or submit GOP details into the Hospital Claims intake flow." href="/authorizations/gop-intake" />
        ) : (
          <ActionCard title="Verification History" description="Review ambulance authorization checks completed by this workspace." href="/authorizations/history" />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Rules</CardTitle>
          <CardDescription>These dashboards are review workspaces only until live lookup APIs are connected.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              'Only search the minimum details needed for verification.',
              'Show policy status and benefit result without exposing unrelated private data.',
              'Record a verification audit entry for every completed check.',
              'Africa Assist GOP submissions go to intake, not directly into final claims.',
            ].map((rule) => (
              <div key={rule} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {rule}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function VerificationView({
  title,
  description,
  checks,
  actionLabel,
  benefitType,
}: {
  title: string;
  description: string;
  checks: string[];
  actionLabel: string;
  benefitType: 'ambulance' | 'hospital';
}) {
  const [fields, setFields] = useState({
    memberName: '',
    idNumber: '',
    memberNumber: '',
    cellPhone: '',
  });
  const [member, setMember] = useState<AuthorizationMember | null>(null);
  const [benefitVerified, setBenefitVerified] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(true);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [error, setError] = useState('');

  const canSearch = Object.values(fields).some((value) => value.trim().length > 0);
  const isActive = member?.status === 'Active';
  const benefitLabel = benefitType === 'hospital' ? 'Hospital cover included' : 'Ambulance cover included';

  async function searchMember() {
    if (!canSearch) {
      setError('Enter a member name, ID, member number, or cell phone number.');
      return;
    }

    setLoadingLookup(true);
    setError('');
    setBenefitVerified(false);

    try {
      const response = await authFetch('/api/authorizations/member-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, benefitType }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to verify member');
      }

      if (!data.member) {
        throw new Error(data.message || 'No matching member found');
      }

      setMember(data.member);
      setFields({
        memberName: data.member.memberName || '',
        idNumber: data.member.idNumber || '',
        memberNumber: data.member.memberNumber || '',
        cellPhone: data.member.cellPhone || '',
      });
    } catch (lookupError) {
      setMember(null);
      setError(lookupError instanceof Error ? lookupError.message : 'Unable to verify member');
    } finally {
      setLoadingLookup(false);
    }
  }

  function verifyBenefit() {
    if (!member) {
      setError('Search and select a member before verifying the benefit.');
      return;
    }

    setBenefitVerified(true);
    setError('');
  }

  function clearForm() {
    setFields({ memberName: '', idNumber: '', memberNumber: '', cellPhone: '' });
    setMember(null);
    setBenefitVerified(false);
    setError('');
  }

  return (
    <div className={outputCollapsed ? 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_56px]' : 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Member name"
              value={fields.memberName}
              onChange={(event) => setFields((current) => ({ ...current, memberName: event.target.value }))}
            />
            <Input
              placeholder="ID number"
              value={fields.idNumber}
              onChange={(event) => setFields((current) => ({ ...current, idNumber: event.target.value }))}
            />
            <Input
              placeholder="Member number"
              value={fields.memberNumber}
              onChange={(event) => setFields((current) => ({ ...current, memberNumber: event.target.value }))}
            />
            <Input
              placeholder="Cell phone number"
              value={fields.cellPhone}
              onChange={(event) => setFields((current) => ({ ...current, cellPhone: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={searchMember} disabled={loadingLookup || !canSearch}>
              {loadingLookup ? 'Searching...' : 'Search Member'}
            </Button>
            <Button onClick={verifyBenefit} disabled={!member || loadingLookup}>
              {actionLabel}
            </Button>
            <Button variant="outline" onClick={clearForm}>Clear</Button>
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          {!member && !error && (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
              Search with any one field. The member details and active or suspended status will auto-fill here.
            </div>
          )}
          {member && (
            <div className="space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-gray-500">Verified member</p>
                  <p className="text-xl font-semibold text-gray-900">{member.memberName || '-'}</p>
                </div>
                <span className={`w-fit rounded-md px-3 py-1 text-sm font-semibold ${isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {member.status}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <ResultTile label="ID" value={member.idNumber} />
                <ResultTile label="Member Number" value={member.memberNumber} />
                <ResultTile label="Cell Phone" value={member.cellPhone} />
                <ResultTile label="Policy Status" value={member.policyStatus} />
              </div>

              {benefitVerified && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ResultTile label="Cover Plan Name" value={member.planName} />
                  <ResultTile
                    label={benefitType === 'hospital' ? 'Hospital Benefit' : 'Ambulance Benefit'}
                    value={member.benefitIncluded ? benefitLabel : `${benefitType === 'hospital' ? 'Hospital' : 'Ambulance'} cover not found on plan`}
                    tone={member.benefitIncluded ? 'success' : 'warning'}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={outputCollapsed ? 'hidden' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Check Output</CardTitle>
              <CardDescription>Fields this page must answer.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOutputCollapsed(true)} aria-label="Collapse check output">
              ›
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.map((check) => (
            <div key={check} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              {check}
            </div>
          ))}
        </CardContent>
      </Card>

      {outputCollapsed && (
        <button
          type="button"
          onClick={() => setOutputCollapsed(false)}
          className="hidden h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white text-lg font-semibold text-gray-700 shadow-sm hover:border-green-300 hover:bg-green-50 xl:flex"
          aria-label="Open check output"
          title="Open check output"
        >
          ‹
        </button>
      )}
    </div>
  );
}

interface AuthorizationMember {
  id: string;
  memberName: string;
  idNumber: string;
  memberNumber: string;
  cellPhone: string;
  status: 'Active' | 'Suspended';
  policyStatus: string;
  planName: string;
  waitingPeriods: string;
  currentExclusions: string;
  benefitIncluded: boolean;
}

function ResultTile({ label, value, tone }: { label: string; value?: string; tone?: 'success' | 'warning' }) {
  const toneClass =
    tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : tone === 'warning'
        ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
        : 'border-gray-200 bg-gray-50 text-gray-900';

  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || '-'}</p>
    </div>
  );
}

function ambulanceBenefitChecks() {
  return [
    ...sharedChecks,
    'Ambulance benefit included in plan',
    'Emergency transport limits',
    'Trip or annual limit status',
    'Authorization proceed / decline outcome',
  ];
}

function hospitalBenefitChecks() {
  return [
    ...sharedChecks,
    'Hospital benefit included in plan',
    'Admission benefit limits',
    'Accident / illness cover rules',
    'GOP proceed / decline outcome',
  ];
}

function GopIntakeView() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitResult, setSubmitResult] = useState<{
    nextClaimNumber: string;
    confidence: number;
    documentType: string;
    extractedFields: { label: string; value: string; confidence: number }[];
  } | null>(null);

  const fileTypeLabel = selectedFile
    ? selectedFile.name.toLowerCase().endsWith('.pdf')
      ? 'PDF'
      : selectedFile.name.toLowerCase().endsWith('.docx')
        ? 'DOCX'
        : selectedFile.type || 'Document'
    : '';

  async function submitGopDocument() {
    if (!selectedFile) {
      setSubmitError('Select a GOP or application file first.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = new FormData();
      payload.append('file', selectedFile);
      payload.append('existingClaimNumbers', JSON.stringify([]));

      const response = await authFetch('/api/claims-assessor/hospital-intake', {
        method: 'POST',
        body: payload,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to submit GOP document');
      }

      setSubmitResult({
        nextClaimNumber: data.nextClaimNumber,
        confidence: data.confidence,
        documentType: data.document?.documentType || 'unknown',
        extractedFields: data.extractedFields || [],
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('day1:gop-intake-updated'));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit GOP document');
      setSubmitResult(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GOP Intake / Submit GOP</CardTitle>
        <CardDescription>For Africa Assist users after member and hospital benefit verification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input placeholder="Africa Assist reference" />
          <Input placeholder="Policy number" />
          <Input placeholder="Hospital practice number" />
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-green-300 bg-green-50/40 px-4 py-8 text-center hover:bg-green-50">
          <span className="text-sm font-semibold text-green-800">Upload GOP Document</span>
          <span className="mt-1 text-xs text-gray-500">PDF or DOCX upload</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setSelectedFile(file);
              setSubmitResult(null);
              setSubmitError('');
            }}
          />
        </label>
        {selectedFile && (
          <div className="flex items-center gap-3 rounded-md border border-green-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-green-50 text-green-700">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {fileTypeLabel} / {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setSubmitResult(null);
                setSubmitError('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Remove
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={submitGopDocument} disabled={!selectedFile || submitting || Boolean(submitResult)}>
            {submitting ? 'Submitting...' : submitResult ? 'Submitted' : 'Submit to Hospital Claims Intake'}
          </Button>
        </div>
        {submitError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            Failed to submit GOP document: {submitError}
          </div>
        )}
        {submitResult && (
          <div className="space-y-3 rounded-md border border-green-200 bg-green-50 p-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-green-800">GOP upload successful</span>
              <span className="rounded-full bg-white px-2 py-1 font-medium text-gray-700">
                Claim No: {submitResult.nextClaimNumber}
              </span>
              <span className="rounded-full bg-white px-2 py-1 font-medium text-gray-700">
                OCR Confidence: {submitResult.confidence}%
              </span>
              <span className="rounded-full bg-white px-2 py-1 font-medium text-gray-700">
                {submitResult.documentType.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {submitResult.extractedFields.slice(0, 6).map((field) => (
                <div key={`${field.label}-${field.value}`} className="rounded-md border border-green-100 bg-white px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{field.label}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm text-gray-600">
          This will connect to the same Hospital Claims intake scanner and review flow used by the claims workspace.
        </p>
      </CardContent>
    </Card>
  );
}

function HistoryView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification History</CardTitle>
        <CardDescription>Completed authorization checks will be listed here with audit details.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
          No verification history has been recorded in this demo workspace yet.
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-gray-600">{label}</p>
        <p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, description, href }: { title: string; description: string; href: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm hover:border-green-300 hover:bg-green-50/30"
    >
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </button>
  );
}

function pageTitle(page: AuthorizationPage, isAfricaAssist: boolean) {
  if (page === 'dashboard') return 'Authorization Dashboard';
  if (page === 'member-verification') return isAfricaAssist ? 'Hospital Benefit Check' : 'Ambulance Benefit Check';
  if (page === 'ambulance-benefit') return 'Ambulance Benefit Check';
  if (page === 'hospital-benefit') return 'Hospital Benefit Check';
  if (page === 'gop-intake') return 'GOP Intake';
  if (page === 'history') return 'Verification History';
  return isAfricaAssist ? 'Africa Assist Pre-Auth' : 'Ambulance Authorization';
}
