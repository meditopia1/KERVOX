'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth-fetch';

const getTodayLocalDate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

interface LookupMember {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  id_number: string | null;
  status: string;
  plan_name: string | null;
  email: string | null;
  mobile: string | null;
}

export default function PreAuthSubmissionPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [preauthNumber, setPreauthNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');
  const [member, setMember] = useState<LookupMember | null>(null);

  // Patient Information
  const [memberNumber, setMemberNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [idNumber, setIdNumber] = useState('');

  // Pre-Auth Information
  const [procedureType, setProcedureType] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [procedureCode, setProcedureCode] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [urgency, setUrgency] = useState('routine');

  // Clinical Information
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');

  // Documents
  const [documents, setDocuments] = useState<File[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <SidebarLayout>
        <InlinePageLoading
          title="Request Pre-Authorization"
          description="Submit a pre-authorization request for planned procedures"
          message="Opening pre-authorization form..."
        />
      </SidebarLayout>
    );
  }

  if (!user) {
    return null;
  }

  const resetForm = () => {
    setMemberNumber('');
    setPatientName('');
    setIdNumber('');
    setProcedureType('');
    setDiagnosisCode('');
    setProcedureCode('');
    setProposedDate('');
    setEstimatedCost('');
    setUrgency('routine');
    setClinicalNotes('');
    setMedicalHistory('');
    setTreatmentPlan('');
    setDocuments([]);
    setMember(null);
    setLookupMessage('');
    setFormError('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments([...documents, ...Array.from(e.target.files)]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleMemberLookup = async () => {
    if (!memberNumber && !idNumber) {
      setFormError('Enter a member number or ID number first.');
      return;
    }

    setIsLookingUp(true);
    setFormError('');
    setLookupMessage('');

    try {
      const response = await authFetch('/api/provider/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_number: memberNumber || undefined,
          id_number: idNumber || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMember(null);
        setLookupMessage(data.error || 'Member lookup failed.');
        return;
      }

      if (!data.eligible || !data.member) {
        setMember(null);
        setLookupMessage(data.message || 'Member not found or not eligible.');
        return;
      }

      setMember(data.member);
      setPatientName(`${data.member.first_name || ''} ${data.member.last_name || ''}`.trim());
      setIdNumber(data.member.id_number || idNumber);
      setMemberNumber(data.member.member_number || memberNumber);
      setLookupMessage(`Member found: ${data.member.first_name} ${data.member.last_name}`);
    } catch (error) {
      console.error('Error looking up member:', error);
      setMember(null);
      setLookupMessage('Failed to look up member. Please try again.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!member?.id) {
      setFormError('Please verify the member before submitting the pre-authorization.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authFetch('/api/provider/preauth/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          service_date: proposedDate,
          estimated_cost: parseFloat(estimatedCost || '0'),
          diagnosis_codes: [diagnosisCode],
          procedure_codes: [procedureCode],
          clinical_notes: [clinicalNotes, medicalHistory, treatmentPlan].filter(Boolean).join('\n\n'),
          urgency
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || 'Failed to submit pre-authorization request.');
        setIsSubmitting(false);
        return;
      }

      setPreauthNumber(data.preauth_number || '');
      setShowSuccess(true);
      setIsSubmitting(false);

      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        router.push('/provider/preauth');
      }, 2500);
    } catch (error) {
      console.error('Error submitting pre-authorization:', error);
      setFormError('Failed to submit pre-authorization request. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request Pre-Authorization</h1>
          <p className="text-gray-600 mt-1">
            Submit a pre-authorization request for planned procedures
          </p>
        </div>

        {showSuccess && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="space-y-1">
                <p className="font-medium text-green-900">Pre-Authorization Request Submitted</p>
                <p className="text-sm text-green-700">
                  Reference: {preauthNumber || 'Generated successfully'}
                </p>
                <p className="text-sm text-green-700">
                  You will receive a response once the claims team reviews the request.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {formError && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="pt-6 text-sm text-red-700">{formError}</CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Look up the member first so the request links to the correct record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="memberNumber" className="text-sm font-medium">
                    Member Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="memberNumber"
                    placeholder="ARC1000417"
                    value={memberNumber}
                    onChange={(e) => setMemberNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="patientName" className="text-sm font-medium">
                    Patient Name
                  </label>
                  <Input
                    id="patientName"
                    placeholder="Auto-filled after lookup"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    disabled={!!member}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="idNumber" className="text-sm font-medium">
                    ID Number
                  </label>
                  <Input
                    id="idNumber"
                    placeholder="8001015800083"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    disabled={!!member}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" onClick={handleMemberLookup} disabled={isLookingUp}>
                  {isLookingUp ? 'Checking Member...' : 'Verify Member'}
                </Button>
                {member && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMember(null);
                      setLookupMessage('');
                    }}
                  >
                    Clear Member
                  </Button>
                )}
              </div>

              {lookupMessage && (
                <p className={`text-sm ${member ? 'text-green-700' : 'text-amber-700'}`}>{lookupMessage}</p>
              )}

              {member && (
                <div className="rounded-lg border bg-green-50 border-green-200 p-4 text-sm">
                  <p className="font-medium text-green-900">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-green-800">Member Number: {member.member_number}</p>
                  <p className="text-green-800">Plan: {member.plan_name || 'Not set'}</p>
                  <p className="text-green-800">Status: {member.status}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Procedure Information</CardTitle>
              <CardDescription>Details of the planned procedure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="procedureType" className="text-sm font-medium">
                    Procedure Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="procedureType"
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select procedure type</option>
                    <option value="surgery">Surgery</option>
                    <option value="hospitalization">Hospitalization</option>
                    <option value="specialist_consultation">Specialist Consultation</option>
                    <option value="diagnostic_imaging">Diagnostic Imaging</option>
                    <option value="oncology">Oncology Treatment</option>
                    <option value="chronic_medication">Chronic Medication</option>
                    <option value="dental_procedure">Dental Procedure</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="urgency" className="text-sm font-medium">
                    Urgency <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="urgency"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="diagnosisCode" className="text-sm font-medium">
                    Diagnosis Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="diagnosisCode"
                    placeholder="ICD-10 (e.g. C50.9)"
                    value={diagnosisCode}
                    onChange={(e) => setDiagnosisCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="procedureCode" className="text-sm font-medium">
                    Procedure Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="procedureCode"
                    placeholder="e.g. 3001"
                    value={procedureCode}
                    onChange={(e) => setProcedureCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="estimatedCost" className="text-sm font-medium">
                    Estimated Cost (R) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="estimatedCost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    required
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <label htmlFor="proposedDate" className="text-sm font-medium">
                    Proposed Procedure Date <span className="text-red-500">*</span>
                  </label>
                  <div className="inline-flex items-center gap-2">
                    <Input
                      id="proposedDate"
                      type="date"
                      value={proposedDate}
                      onChange={(e) => setProposedDate(e.target.value)}
                      required
                      max={getTodayLocalDate()}
                      className="w-[220px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-blue-200 bg-blue-50 px-3 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                      onClick={() => setProposedDate(getTodayLocalDate())}
                    >
                      Today
                    </Button>
                  </div>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinical Information</CardTitle>
              <CardDescription>Provide clinical justification for the procedure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="clinicalNotes" className="text-sm font-medium">
                  Clinical Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="clinicalNotes"
                  rows={4}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Describe the patient's condition and symptoms..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="medicalHistory" className="text-sm font-medium">
                  Relevant Medical History
                </label>
                <textarea
                  id="medicalHistory"
                  rows={3}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Previous treatments, chronic conditions, allergies..."
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="treatmentPlan" className="text-sm font-medium">
                  Treatment Plan <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="treatmentPlan"
                  rows={4}
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Describe the proposed treatment and expected outcomes..."
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supporting Documents</CardTitle>
              <CardDescription>
                Keep documents here for now; upload wiring can be added next once the request flow is stable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label
                htmlFor="fileUpload"
                className="flex items-center justify-center w-full h-32 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50"
              >
                <div className="text-center">
                  <p className="mt-2 text-sm text-gray-600">Click to attach local files</p>
                  <p className="text-xs text-gray-500">These are not uploaded yet in the live submit flow</p>
                </div>
                <input
                  id="fileUpload"
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </label>

              {documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Attached Files ({documents.length})</p>
                  {documents.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeDocument(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting} className="min-w-[220px]">
              {isSubmitting ? 'Submitting...' : 'Submit Pre-Authorization Request'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/provider/preauth')}>
              Back to Requests
            </Button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
