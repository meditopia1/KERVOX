'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Columns3,
  Download,
  FileText,
  Upload,
  PanelRightOpen,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { authFetch } from '@/lib/auth-fetch';

interface HospitalClaim {
  id: string;
  claim_number: string;
  pre_auth_number?: string | null;
  member: { first_name: string; last_name: string; member_number: string } | null;
  provider: { name: string; provider_number: string } | null;
  service_date: string;
  submission_date: string;
  claim_type: string;
  claimed_amount: string;
  approved_amount?: string | null;
  status: string;
  is_pmb?: boolean | null;
  pre_auth_required?: boolean | null;
  fraud_alert_triggered?: boolean | null;
  claim_data?: Record<string, any> | null;
}

interface RegisterRow {
  id: string;
  authNumber: string;
  reportedDate: string;
  dol: string;
  claimNumber: string;
  memberNumber: string;
  surname: string;
  initials: string;
  patientName: string;
  principalId: string;
  gender: string;
  patientDob: string;
  relationship: string;
  totalIncurred: number;
  finalisedPaid: number;
  outstanding: number;
  actualCosts: number;
  memberCosts: number;
  accident: number | null;
  illness: number | null;
  death: number | null;
  dread: number | null;
  extension: number | null;
  casualty: number | null;
  exGratia: number | null;
  repudiation: number | null;
  status: string;
  group: string;
  cause: string;
  hospital: string;
  lengthOfStay: string;
  beneficiary: string;
  beneficiaryId: string;
  beneficiaryName: string;
  paymentDate: string;
  plan: string;
  inceptionDate: string;
  icd10: string;
  province: string;
  policyPeriod: string;
  practiceNumber: string;
  workspaceYear?: number;
  workspaceMonth?: number | null;
  rowType?: 'claim' | 'subtotal';
  sourceClaim: HospitalClaim;
}

type ColumnKey = keyof Omit<RegisterRow, 'id' | 'sourceClaim' | 'workspaceYear' | 'workspaceMonth' | 'rowType'>;

interface HospitalRegisterRecord {
  id: string;
  row_type: 'claim' | 'subtotal';
  workbook_row_number: number;
  workspace_year: number;
  workspace_month: number | null;
  auth_number: string | null;
  date_of_claim_reported_received: string | null;
  dol: string | null;
  claim_number: string | null;
  member_number: string | null;
  surname: string | null;
  initials: string | null;
  patient_name: string | null;
  id_number_principal_member: string | null;
  gender: string | null;
  patient_dob: string | null;
  relationship: string | null;
  total_claims_incurred: number | null;
  finalised_paid_to_date: number | null;
  claims_outstanding: number | null;
  actual_costs_invoices_received: number | null;
  member_costs: number | null;
  accident: number | null;
  illness: number | null;
  death: number | null;
  dread: number | null;
  extension: number | null;
  casualty_admitted_hospital: number | null;
  ex_gratia: number | null;
  repudiation_claim_amount: number | null;
  status: string | null;
  group_name: string | null;
  cause: string | null;
  hospital: string | null;
  length_of_stay: string | null;
  beneficiary: string | null;
  beneficiary_death_payment_id: string | null;
  beneficiary_death_surname_initials: string | null;
  payment_date: string | null;
  plan: string | null;
  inception_date: string | null;
  icd10_code: string | null;
  province: string | null;
  policy_period: string | null;
  practice_number: string | null;
  member_id: string | null;
}

interface ScannedField {
  label: string;
  value: string;
  confidence: number;
  source: 'gop' | 'claim_form' | 'system';
}

interface IntakeScanResult {
  document: {
    fileName: string;
    fileType: string;
    size: number;
    documentType: 'gop' | 'claim_form' | 'unknown';
  };
  nextClaimNumber: string;
  confidence: number;
  extractedFields: ScannedField[];
  fullTextPreview: string;
  comparison?: ClaimFormComparison | null;
}

interface ClaimFormComparison {
  matchedRegisterId: string | null;
  matchedClaimNumber: string | null;
  requiresManualReview: boolean;
  majorDifferences: Array<{
    label: string;
    existingValue: string;
    formValue: string;
  }>;
  adminPrompt: string;
}

interface HospitalClaimIntake {
  id: string;
  intake_number: string;
  source_type: string;
  source_reference: string | null;
  document_type: 'gop' | 'claim_form' | 'unknown';
  file_name: string;
  file_size_bytes: number | null;
  status: string;
  notification_status: string | null;
  ocr_confidence: number | null;
  ocr_fields: ScannedField[] | null;
  raw_text: string | null;
  matched_register_id?: string | null;
  review_notes?: string | null;
  comparison?: ClaimFormComparison | null;
  created_at: string;
}

interface RegisterColumn {
  key: ColumnKey;
  label: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  frozen?: boolean;
  format?: 'currency' | 'date' | 'status';
}

const registerColumns: RegisterColumn[] = [
  { key: 'authNumber', label: 'Auth Number', width: 150 },
  { key: 'reportedDate', label: 'Date of Claim reported / received', width: 190, format: 'date' },
  { key: 'dol', label: 'DOL', width: 120, format: 'date' },
  { key: 'claimNumber', label: 'Claim Number', width: 160 },
  { key: 'memberNumber', label: 'Member Number', width: 160 },
  { key: 'surname', label: 'Surname', width: 150 },
  { key: 'initials', label: 'Initials', width: 90 },
  { key: 'patientName', label: 'Name of Patient', width: 170 },
  { key: 'principalId', label: 'ID Number Principal Member', width: 190 },
  { key: 'gender', label: 'Gender (M / F)', width: 120, align: 'center' },
  { key: 'patientDob', label: 'Patient DOB', width: 130, format: 'date' },
  { key: 'relationship', label: 'Relationship', width: 160 },
  { key: 'totalIncurred', label: 'Total Claims Incurred', width: 160, align: 'right', format: 'currency' },
  { key: 'finalisedPaid', label: 'Finalised (Paid to date)', width: 170, align: 'right', format: 'currency' },
  { key: 'outstanding', label: 'Claims Outstanding', width: 160, align: 'right', format: 'currency' },
  { key: 'actualCosts', label: 'Actual Costs (Invoices Received)', width: 210, align: 'right', format: 'currency' },
  { key: 'memberCosts', label: 'Member Costs', width: 140, align: 'right', format: 'currency' },
  { key: 'accident', label: 'Accident', width: 120, align: 'right', format: 'currency' },
  { key: 'illness', label: 'Illness', width: 120, align: 'right', format: 'currency' },
  { key: 'death', label: 'Death', width: 120, align: 'right', format: 'currency' },
  { key: 'dread', label: 'Dread', width: 120, align: 'right', format: 'currency' },
  { key: 'extension', label: 'Extension', width: 120, align: 'right', format: 'currency' },
  { key: 'casualty', label: 'Casualty up to R2000', width: 160, align: 'right', format: 'currency' },
  { key: 'exGratia', label: 'Ex-Gratia', width: 120, align: 'right', format: 'currency' },
  { key: 'repudiation', label: 'Repudiation Claim Amount', width: 180, align: 'right', format: 'currency' },
  { key: 'status', label: 'Status', width: 130, format: 'status' },
  { key: 'group', label: 'Group', width: 170 },
  { key: 'cause', label: 'Cause', width: 240 },
  { key: 'hospital', label: 'HOSPITAL', width: 210 },
  { key: 'lengthOfStay', label: 'Length of Stay', width: 130 },
  { key: 'paymentDate', label: 'Payment Date', width: 150 },
  { key: 'beneficiary', label: 'Beneficiary', width: 140 },
  { key: 'beneficiaryId', label: 'Beneficiary Death Payment ID', width: 210 },
  { key: 'beneficiaryName', label: 'Beneficiary Death Surname & Initials', width: 230 },
  { key: 'plan', label: 'PLAN', width: 180 },
  { key: 'inceptionDate', label: 'INCEPTION DATE', width: 140, format: 'date' },
  { key: 'icd10', label: 'ICD10 CODE', width: 150 },
  { key: 'province', label: 'PROVINCE', width: 150 },
  { key: 'policyPeriod', label: 'POLICY PERIOD', width: 150 },
  { key: 'practiceNumber', label: 'Practice Number', width: 150 },
];

const defaultVisibleColumns = registerColumns.map((column) => column.key);
const registerDbFieldByColumn: Partial<Record<ColumnKey, string>> = {
  authNumber: 'auth_number',
  reportedDate: 'date_of_claim_reported_received',
  dol: 'dol',
  claimNumber: 'claim_number',
  memberNumber: 'member_number',
  surname: 'surname',
  initials: 'initials',
  patientName: 'patient_name',
  principalId: 'id_number_principal_member',
  gender: 'gender',
  patientDob: 'patient_dob',
  relationship: 'relationship',
  totalIncurred: 'total_claims_incurred',
  finalisedPaid: 'finalised_paid_to_date',
  outstanding: 'claims_outstanding',
  actualCosts: 'actual_costs_invoices_received',
  memberCosts: 'member_costs',
  accident: 'accident',
  illness: 'illness',
  death: 'death',
  dread: 'dread',
  extension: 'extension',
  casualty: 'casualty_admitted_hospital',
  exGratia: 'ex_gratia',
  repudiation: 'repudiation_claim_amount',
  status: 'status',
  group: 'group_name',
  cause: 'cause',
  hospital: 'hospital',
  lengthOfStay: 'length_of_stay',
  beneficiary: 'beneficiary',
  beneficiaryId: 'beneficiary_death_payment_id',
  beneficiaryName: 'beneficiary_death_surname_initials',
  paymentDate: 'payment_date',
  plan: 'plan',
  inceptionDate: 'inception_date',
  icd10: 'icd10_code',
  province: 'province',
  policyPeriod: 'policy_period',
  practiceNumber: 'practice_number',
};
const numericColumnKeys = new Set<ColumnKey>([
  'totalIncurred',
  'finalisedPaid',
  'outstanding',
  'actualCosts',
  'memberCosts',
  'accident',
  'illness',
  'death',
  'dread',
  'extension',
  'casualty',
  'exGratia',
  'repudiation',
]);
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthKeyFromDate(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

const currencyFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 2,
});

function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount !== 0 ? currencyFormatter.format(amount) : '-';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = parseRegisterDate(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-ZA');
}

function parseRegisterDate(value: string | null | undefined) {
  if (!value) return new Date('');
  const clean = value.trim();
  const dotMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
  }

  return new Date(clean);
}

function parseAmount(value: string | null | undefined) {
  if (!value) return 0;
  const amount = Number(value.replace(/[^\d.,-]/g, '').replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function normaliseDate(value: string | null | undefined) {
  if (!value) return '';
  const clean = value.trim();
  const date = new Date(clean);
  if (!Number.isNaN(date.getTime())) return date.toISOString();

  const slashMatch = clean.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!slashMatch) return '';

  const [, day, month, year] = slashMatch;
  const fullYear = year.length === 2 ? `20${year}` : year;
  const parsed = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function normaliseStatus(status: string) {
  const lower = (status || '').toLowerCase();
  if (lower === 'pended') return 'Pending Documentation';
  if (lower === 'pending') return 'Open';
  if (lower === 'approved') return 'Ready for Payment';
  if (lower === 'paid') return 'Paid';
  if (lower === 'rejected') return 'Repudiated';
  return status || 'Under Review';
}

function statusClass(status: string) {
  const label = normaliseStatus(status).toLowerCase();
  if (label.includes('paid')) return 'bg-green-100 text-green-800 border-green-200';
  if (label.includes('documentation')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (label.includes('gop')) return 'bg-orange-100 text-orange-800 border-orange-200';
  if (label.includes('review')) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (label.includes('repudiated')) return 'bg-gray-100 text-gray-700 border-gray-200';
  if (label.includes('ready')) return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function rowTint(status: string) {
  const label = normaliseStatus(status).toLowerCase();
  if (label.includes('paid')) return 'bg-green-50/60';
  if (label.includes('documentation')) return 'bg-yellow-50/70';
  if (label.includes('gop')) return 'bg-orange-50/60';
  if (label.includes('review')) return 'bg-purple-50/50';
  if (label.includes('repudiated')) return 'bg-gray-50';
  if (label.includes('ready')) return 'bg-blue-50/50';
  return 'bg-white';
}

function initialsFromName(firstName?: string, lastName?: string) {
  return [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '-';
}

function moneyBucket(claim: HospitalClaim, bucket: 'accident' | 'illness' | 'death' | 'dread') {
  const type = [claim.claim_type, claim.claim_data?.benefitType, claim.claim_data?.cause]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const amount = Number(claim.claimed_amount || 0);

  if (bucket === 'accident' && type.includes('accident')) return amount;
  if (bucket === 'illness' && !type.includes('accident') && !type.includes('death') && !type.includes('dread')) return amount;
  if (bucket === 'death' && type.includes('death')) return amount;
  if (bucket === 'dread' && (type.includes('dread') || type.includes('stroke') || type.includes('heart'))) return amount;
  return null;
}

function isHospitalClaim(claim: HospitalClaim) {
  const text = [
    claim.claim_type,
    claim.provider?.name,
    claim.claim_data?.hospital,
    claim.claim_data?.hospitalName,
    claim.claim_data?.providerName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    claim.pre_auth_required ||
    text.includes('hospital') ||
    text.includes('admission') ||
    text.includes('surgical') ||
    text.includes('procedure')
  );
}

function toRegisterRow(claim: HospitalClaim): RegisterRow {
  const claimed = Number(claim.claimed_amount || 0);
  const approved = Number(claim.approved_amount || 0);
  const firstName = claim.member?.first_name || claim.claim_data?.patientFirstName || '';
  const lastName = claim.member?.last_name || claim.claim_data?.patientSurname || '';

  return {
    id: claim.id,
    authNumber: claim.pre_auth_number || claim.claim_data?.authNumber || claim.claim_data?.africaAssistReference || '-',
    reportedDate: claim.submission_date,
    dol: claim.service_date,
    claimNumber: claim.claim_number,
    memberNumber: claim.member?.member_number || claim.claim_data?.memberNumber || '-',
    surname: lastName || '-',
    initials: initialsFromName(firstName, lastName),
    patientName: [firstName, lastName].filter(Boolean).join(' ') || claim.claim_data?.patientName || '-',
    principalId: claim.claim_data?.principalId || claim.claim_data?.memberId || '-',
    gender: claim.claim_data?.gender || '-',
    patientDob: claim.claim_data?.patientDob || '-',
    relationship: claim.claim_data?.relationship || 'Principal',
    totalIncurred: claimed,
    finalisedPaid: approved,
    outstanding: Math.max(claimed - approved, 0),
    actualCosts: claimed,
    memberCosts: Number(claim.claim_data?.memberCosts || 0),
    accident: moneyBucket(claim, 'accident'),
    illness: moneyBucket(claim, 'illness'),
    death: moneyBucket(claim, 'death'),
    dread: moneyBucket(claim, 'dread'),
    extension: Number(claim.claim_data?.extension || 0) || null,
    casualty: claim.claim_type?.toLowerCase().includes('casualty') ? Math.min(claimed, 2000) : null,
    exGratia: Number(claim.claim_data?.exGratia || 0) || null,
    repudiation: claim.status === 'rejected' ? claimed : null,
    status: normaliseStatus(claim.status),
    group: claim.claim_data?.group || '-',
    cause: claim.claim_data?.cause || claim.claim_type || '-',
    hospital: claim.provider?.name || claim.claim_data?.hospitalName || claim.claim_data?.hospital || 'Unknown hospital',
    lengthOfStay: claim.claim_data?.lengthOfStay || (claim.pre_auth_required ? 'Admitted' : '-'),
    beneficiary: claim.claim_data?.beneficiary || 'Principal',
    beneficiaryId: claim.claim_data?.beneficiaryId || '-',
    beneficiaryName: claim.claim_data?.beneficiaryName || '-',
    paymentDate: claim.claim_data?.paymentDate || '-',
    plan: claim.claim_data?.plan || claim.claim_data?.planName || '-',
    inceptionDate: claim.claim_data?.inceptionDate || '-',
    icd10: Array.isArray(claim.claim_data?.icd10)
      ? claim.claim_data.icd10.join(', ')
      : claim.claim_data?.icd10 || claim.claim_data?.icd10Code || '-',
    province: claim.claim_data?.province || '-',
    policyPeriod: claim.claim_data?.policyPeriod || '-',
    practiceNumber: claim.provider?.provider_number || claim.claim_data?.practiceNumber || '-',
    workspaceYear: new Date().getFullYear(),
    workspaceMonth: new Date().getMonth() + 1,
    rowType: 'claim',
    sourceClaim: claim,
  };
}

function fromHospitalRegisterRecord(record: HospitalRegisterRecord): RegisterRow {
  const monthLabel =
    record.row_type === 'subtotal' && record.workspace_month && record.workspace_month >= 1 && record.workspace_month <= 12
      ? `${monthNames[record.workspace_month - 1].slice(0, 3)}-${String(record.workspace_year).slice(-2)} Total`
      : record.auth_number || '-';

  return {
    id: record.id,
    authNumber: monthLabel,
    reportedDate: record.date_of_claim_reported_received || '',
    dol: record.dol || '',
    claimNumber: record.claim_number || '-',
    memberNumber: record.member_number || '-',
    surname: record.surname || '-',
    initials: record.initials || '-',
    patientName: record.patient_name || '-',
    principalId: record.id_number_principal_member || '-',
    gender: record.gender || '-',
    patientDob: record.patient_dob || '-',
    relationship: record.relationship || '-',
    totalIncurred: Number(record.total_claims_incurred || 0),
    finalisedPaid: Number(record.finalised_paid_to_date || 0),
    outstanding: Number(record.claims_outstanding || 0),
    actualCosts: Number(record.actual_costs_invoices_received || 0),
    memberCosts: Number(record.member_costs || 0),
    accident: Number(record.accident || 0) || null,
    illness: Number(record.illness || 0) || null,
    death: Number(record.death || 0) || null,
    dread: Number(record.dread || 0) || null,
    extension: Number(record.extension || 0) || null,
    casualty: Number(record.casualty_admitted_hospital || 0) || null,
    exGratia: Number(record.ex_gratia || 0) || null,
    repudiation: Number(record.repudiation_claim_amount || 0) || null,
    status: normaliseStatus(record.status || 'Open'),
    group: record.group_name || '-',
    cause: record.cause || '-',
    hospital: record.hospital || '-',
    lengthOfStay: record.length_of_stay || '-',
    beneficiary: record.beneficiary || '-',
    beneficiaryId: record.beneficiary_death_payment_id || '-',
    beneficiaryName: record.beneficiary_death_surname_initials || '-',
    paymentDate: record.payment_date || '-',
    plan: record.plan || '-',
    inceptionDate: record.inception_date || '-',
    icd10: record.icd10_code || '-',
    province: record.province || '-',
    policyPeriod: record.policy_period || '-',
    practiceNumber: record.practice_number || '-',
    workspaceYear: record.workspace_year,
    workspaceMonth: record.workspace_month,
    rowType: record.row_type,
    sourceClaim: {
      id: record.id,
      claim_number: record.claim_number || '',
      pre_auth_number: record.auth_number,
      member: record.member_number
        ? {
            first_name: record.patient_name || '',
            last_name: record.surname || '',
            member_number: record.member_number,
          }
        : null,
      provider: record.hospital
        ? {
            name: record.hospital,
            provider_number: record.practice_number || '',
          }
        : null,
      service_date: record.dol || '',
      submission_date: record.date_of_claim_reported_received || '',
      claim_type: record.cause || 'Hospital Claim',
      claimed_amount: String(record.total_claims_incurred || 0),
      approved_amount: String(record.finalised_paid_to_date || 0),
      status: record.status || 'Open',
      pre_auth_required: Boolean(record.auth_number),
      claim_data: {
        source: 'hospital_claims_register',
        rowType: record.row_type,
        workbookRowNumber: record.workbook_row_number,
        memberId: record.member_id,
      },
    },
  };
}

function getMonthKey(row: RegisterRow) {
  if (row.workspaceYear && row.workspaceMonth && row.workspaceMonth >= 1 && row.workspaceMonth <= 12) {
    return `${monthNames[row.workspaceMonth - 1]} ${row.workspaceYear}`;
  }

  const date = parseRegisterDate(row.reportedDate || row.dol);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  return date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}

function monthSortKey(month: string) {
  if (month === 'Unscheduled') return Number.MAX_SAFE_INTEGER;
  const [monthName, yearValue] = month.split(' ');
  const monthIndex = monthNames.indexOf(monthName);
  const year = Number(yearValue);
  if (monthIndex === -1 || !Number.isFinite(year)) return Number.MAX_SAFE_INTEGER;
  return year * 100 + monthIndex + 1;
}

function formatCell(row: RegisterRow, column: RegisterColumn) {
  const value = row[column.key];
  if (column.format === 'currency') return formatCurrency(value as number | string | null);
  if (column.format === 'date') return formatDate(value as string);
  if (column.format === 'status') {
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(String(value))}`}>
        {String(value)}
      </span>
    );
  }
  return String(value || '-');
}

function editableValue(row: RegisterRow, key: ColumnKey) {
  const value = row[key];
  if (value === null || value === undefined || value === '-') return '';
  return String(value);
}

function parseEditableValue(key: ColumnKey, value: string) {
  if (numericColumnKeys.has(key)) return parseAmount(value);
  return value.trim() || '-';
}

function dbValueForColumn(key: ColumnKey, value: RegisterRow[ColumnKey]) {
  if (numericColumnKeys.has(key)) return Number(value || 0);
  if (value === '-') return null;
  return value ?? null;
}

function cellAlignment(column: RegisterColumn) {
  if (column.align === 'right') return 'text-right';
  if (column.align === 'center') return 'text-center';
  return 'text-left';
}

function frozenLeft(columns: RegisterColumn[], index: number) {
  return columns.slice(0, index).reduce((sum, column) => sum + (column.frozen ? column.width : 0), 0);
}

function hasCellValue(value: unknown) {
  if (value === null || value === undefined || value === '' || value === '-') return false;
  if (typeof value === 'number') return value !== 0;
  return String(value).trim() !== '';
}

function columnFillRatio(column: RegisterColumn, rows: RegisterRow[]) {
  if (rows.length === 0) return 1;

  const filledRows = rows.filter((row) => hasCellValue(row[column.key])).length;
  return filledRows / rows.length;
}

function displayColumnWidth(column: RegisterColumn, rows: RegisterRow[]) {
  const fillRatio = columnFillRatio(column, rows);
  if (fillRatio === 0) return 46;
  return column.width;
}

export default function HospitalClaimsPage() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const [claims, setClaims] = useState<RegisterRow[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(defaultVisibleColumns);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [currentMonthKey, setCurrentMonthKey] = useState(() => monthKeyFromDate(new Date()));
  const [selectedRow, setSelectedRow] = useState<RegisterRow | null>(null);
  const [intakeFile, setIntakeFile] = useState<File | null>(null);
  const [intakeScan, setIntakeScan] = useState<IntakeScanResult | null>(null);
  const [scanningIntake, setScanningIntake] = useState(false);
  const [intakeError, setIntakeError] = useState('');
  const [draftRows, setDraftRows] = useState<RegisterRow[]>([]);
  const [newIntakes, setNewIntakes] = useState<HospitalClaimIntake[]>([]);
  const [selectedIntakeReview, setSelectedIntakeReview] = useState<HospitalClaimIntake | null>(null);
  const [acceptingIntakeReview, setAcceptingIntakeReview] = useState(false);
  const [intakeReviewError, setIntakeReviewError] = useState('');
  const [drawerNotice, setDrawerNotice] = useState('');
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [drawerDirty, setDrawerDirty] = useState(false);
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  const [drawerSaved, setDrawerSaved] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchClaims();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const refreshWorkspace = () => {
      void fetchClaims();
    };

    window.addEventListener('day1:gop-intake-updated', refreshWorkspace);
    return () => window.removeEventListener('day1:gop-intake-updated', refreshWorkspace);
  }, []);

  const fetchClaims = async () => {
    try {
      setLoadingClaims(true);
      const response = await authFetch('/api/claims/hospital/register?year=2026&include_subtotals=true');
      if (!response.ok) {
        throw new Error('Failed to fetch hospital claims');
      }
      const data = await response.json();
      setClaims((data.rows || []).map(fromHospitalRegisterRecord));
      setNewIntakes(data.newIntakes || []);
    } catch (error) {
      console.error('Error fetching hospital claims:', error);
    } finally {
      setLoadingClaims(false);
    }
  };

  const registerRows = useMemo(() => [...draftRows, ...claims], [claims, draftRows]);

  const activeColumns = useMemo(
    () => registerColumns.filter((column) => visibleColumns.includes(column.key)),
    [visibleColumns]
  );

  const filteredRows = useMemo(() => {
    return registerRows.filter((row) => {
      const search = [
        row.authNumber,
        row.claimNumber,
        row.memberNumber,
        row.surname,
        row.patientName,
        row.hospital,
        row.cause,
        row.plan,
        row.status,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = search.includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [registerRows, searchTerm, statusFilter]);

  const groupedRows = useMemo(() => {
    return filteredRows.reduce<Record<string, RegisterRow[]>>((groups, row) => {
      const month = getMonthKey(row);
      groups[month] = groups[month] || [];
      groups[month].push(row);
      return groups;
    }, {});
  }, [filteredRows]);

  const groupedEntries = useMemo(() => {
    const entries = new Map(Object.entries(groupedRows));
    if (!entries.has(currentMonthKey)) {
      entries.set(currentMonthKey, []);
    }
    return Array.from(entries.entries()).sort(([monthA], [monthB]) => monthSortKey(monthB) - monthSortKey(monthA));
  }, [groupedRows, currentMonthKey]);

  useEffect(() => {
    setCollapsedMonths((current) => {
      const next = new Set(current);
      groupedEntries.forEach(([month]) => {
        if (!next.has(month)) {
          next.add(month);
        }
      });
      return next;
    });
  }, [groupedEntries]);

  useEffect(() => {
    const now = new Date();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 1);
    const timeout = window.setTimeout(() => {
      setCurrentMonthKey(monthKeyFromDate(new Date()));
    }, Math.max(nextMonthStart.getTime() - now.getTime(), 60_000));

    return () => window.clearTimeout(timeout);
  }, [currentMonthKey]);

  const stats = useMemo(() => {
    const claimRows = registerRows.filter((row) => row.rowType !== 'subtotal');
    const openRows = claimRows.filter((row) => !['Paid', 'Repudiated'].includes(row.status));
    const outstandingValue = openRows.reduce((sum, row) => sum + row.outstanding, 0);
    const totalIncurred = claimRows.reduce((sum, row) => sum + row.totalIncurred, 0);

    return {
      openClaims: openRows.length,
      todaysClaims: claimRows.filter((row) => formatDate(row.reportedDate) === new Date().toLocaleDateString('en-ZA')).length,
      outstandingValue,
      awaitingDocumentation: claimRows.filter((row) => row.status === 'Pending Documentation').length,
      readyForPayment: claimRows.filter((row) => row.status === 'Ready for Payment').length,
      paidToday: claimRows.filter((row) => row.status === 'Paid').length,
      hospitalClaims: claimRows.length,
      totalIncurred,
      newGops: newIntakes.length,
    };
  }, [registerRows, newIntakes]);

  const toggleMonth = (month: string) => {
    setCollapsedMonths((current) => {
      const next = new Set(current);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((columnKey) => columnKey !== key);
      }
      return [...current, key];
    });
  };

  const openClaimDrawer = (row: RegisterRow) => {
    setSelectedRow(row);
    setDrawerNotice('');
    setDrawerDirty(false);
    setDrawerError('');
    setDrawerSaved(false);
  };

  const closeClaimDrawer = () => {
    setSelectedRow(null);
    setDrawerNotice('');
    setDrawerDirty(false);
    setDrawerError('');
    setDrawerSaved(false);
  };

  const updateSelectedRowField = (key: ColumnKey, value: string) => {
    setDrawerDirty(true);
    setDrawerSaved(false);
    setDrawerError('');
    setSelectedRow((current) => {
      if (!current) return current;
      return { ...current, [key]: parseEditableValue(key, value) };
    });
  };

  const saveSelectedRow = async () => {
    if (!selectedRow) return;

    const updates = Object.fromEntries(
      Object.entries(registerDbFieldByColumn)
        .map(([columnKey, dbField]) => {
          const key = columnKey as ColumnKey;
          return [dbField, dbValueForColumn(key, selectedRow[key])];
        })
        .filter(([dbField]) => Boolean(dbField))
    );

    try {
      setSavingDrawer(true);
      setDrawerError('');
      setDrawerSaved(false);

      const response = await authFetch('/api/claims/hospital/register', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRow.id, updates }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to save claim row');
      }

      const savedRow = fromHospitalRegisterRecord(data.row);
      setClaims((current) => current.map((row) => (row.id === savedRow.id ? savedRow : row)));
      setDraftRows((current) => current.map((row) => (row.id === savedRow.id ? savedRow : row)));
      setSelectedRow(savedRow);
      setDrawerDirty(false);
      setDrawerSaved(true);
    } catch (error) {
      setDrawerError(error instanceof Error ? error.message : 'Failed to save claim row');
    } finally {
      setSavingDrawer(false);
    }
  };

  const handleIntakeFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setIntakeFile(file);
      scanIntakeFile(file);
    }
    event.target.value = '';
  };

  const closeIntakeDrawer = () => {
    setIntakeFile(null);
    setIntakeScan(null);
    setIntakeError('');
    setScanningIntake(false);
  };

  const openIntakeReview = (intake: HospitalClaimIntake) => {
    setIntakeReviewError('');
    setSelectedIntakeReview(intake);
  };

  const closeIntakeReview = () => {
    setAcceptingIntakeReview(false);
    setIntakeReviewError('');
    setSelectedIntakeReview(null);
  };

  const acceptIntakeIntoWorkspace = async () => {
    if (!selectedIntakeReview || acceptingIntakeReview) return;

    try {
      setAcceptingIntakeReview(true);
      setIntakeReviewError('');

      const response = await authFetch('/api/claims/hospital/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intakeId: selectedIntakeReview.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.row) {
          const existingRow = fromHospitalRegisterRecord(data.row);
          setClaims((current) => {
            if (current.some((row) => row.id === existingRow.id)) return current;
            return [existingRow, ...current];
          });
          setSelectedRow(existingRow);
          setNewIntakes((current) => current.filter((intake) => intake.id !== selectedIntakeReview.id));
          closeIntakeReview();
          window.dispatchEvent(new CustomEvent('day1:gop-intake-updated'));
          return;
        }
        throw new Error(data.error || data.details || 'Failed to insert intake into workspace');
      }

      if (data.row) {
        const insertedRow = fromHospitalRegisterRecord(data.row);
        setClaims((current) => {
          if (current.some((row) => row.id === insertedRow.id)) {
            return current.map((row) => (row.id === insertedRow.id ? insertedRow : row));
          }
          return [insertedRow, ...current];
        });
        setSelectedRow(insertedRow);
        setDrawerNotice(data.comparison?.adminPrompt || '');
      }

      setNewIntakes((current) => current.filter((intake) => intake.id !== selectedIntakeReview.id));
      closeIntakeReview();
      window.dispatchEvent(new CustomEvent('day1:gop-intake-updated'));
    } catch (error) {
      setIntakeReviewError(error instanceof Error ? error.message : 'Failed to insert intake into workspace');
    } finally {
      setAcceptingIntakeReview(false);
    }
  };

  const scanIntakeFile = async (file: File) => {
    try {
      setScanningIntake(true);
      setIntakeScan(null);
      setIntakeError('');

      const payload = new FormData();
      payload.append('file', file);
      payload.append('existingClaimNumbers', JSON.stringify(registerRows.map((row) => row.claimNumber)));

      const response = await authFetch('/api/claims-assessor/hospital-intake', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error([data.error, data.details].filter(Boolean).join(': ') || 'Failed to scan intake file');
      }

      setIntakeScan(data);
    } catch (error) {
      setIntakeError(error instanceof Error ? error.message : 'Failed to scan intake file');
    } finally {
      setScanningIntake(false);
    }
  };

  const addScannedIntakeToClaims = () => {
    if (!intakeScan) return;

    if (intakeScan.document.documentType === 'claim_form') {
      setIntakeError(
        intakeScan.comparison?.adminPrompt ||
          'Claim form captured. Please open the claim form and review it personally against the existing claim before making changes.'
      );
      return;
    }

    const field = (label: string) => intakeScan.extractedFields.find((item) => item.label === label)?.value || '';
    const patientName = field('Name Of Patient') || field('Full name of Patient') || field('Member Name and Surname') || '-';
    const [firstName = '', ...surnameParts] = patientName.split(' ');
    const surname = surnameParts.join(' ') || field('Name of Principal Member') || '-';
    const totalIncurred = parseAmount(field('Authorised Amount') || field('Total Guaranteed Amount') || field('Maximum GOP Amount'));
    const reportedDate = new Date().toISOString();
    const dol = normaliseDate(field('Date Of Admission') || field('Date of Incident')) || reportedDate;

    const sourceClaim: HospitalClaim = {
      id: `draft-${intakeScan.nextClaimNumber}`,
      claim_number: intakeScan.nextClaimNumber,
      pre_auth_number: field('Auth Number') || field('Africa-Assist Ref Number') || '',
      member: {
        first_name: firstName,
        last_name: surname,
        member_number: field('Policy Number') || field('Membership Number') || field('Detected Member Number') || '-',
      },
      provider: {
        name: field('Hospital Name') || '-',
        provider_number: field('Hospital Practice Number') || field('Practice Number') || '-',
      },
      service_date: dol,
      submission_date: reportedDate,
      claim_type: field('Benefit Type') || 'Hospital Claim',
      claimed_amount: String(totalIncurred),
      approved_amount: null,
      status: 'pending',
      is_pmb: false,
      pre_auth_required: true,
      fraud_alert_triggered: false,
      claim_data: {
        source: 'hcr_intake_scan',
        documentType: intakeScan.document.documentType,
        fileName: intakeScan.document.fileName,
        confidence: intakeScan.confidence,
        memberId: field('Member ID') || field('Detected ID Number'),
        patientId: field('Patient ID') || field('Secondary ID Number') || field('Detected ID Number'),
        patientName,
        principalId: field('Member ID') || field('Detected ID Number'),
        hospitalName: field('Hospital Name'),
        practiceNumber: field('Hospital Practice Number') || field('Practice Number'),
        authNumber: field('Auth Number'),
        africaAssistReference: field('Africa-Assist Ref Number'),
        cause: field('Diagnosis') || field('Incident Description') || field('Benefit Type'),
        plan: field('Benefit Type')?.replace(/^ACCIDENT\s*[-–]\s*/i, ''),
        inceptionDate: field('Policy Inception Date'),
        paymentDate: '',
        group: '',
      },
    };

    setDraftRows((current) => [toRegisterRow(sourceClaim), ...current]);
    closeIntakeDrawer();
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hospital Claims Workspace</h1>
            <p className="text-gray-600 mt-1">Excel-style GOP and hospital claims register</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-md bg-green-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-green-700">
              <Upload className="mr-2 h-4 w-4" />
              New GOP/Application
              <input
                type="file"
                accept=".pdf,.docx"
                className="sr-only"
                onChange={handleIntakeFile}
              />
            </label>
            <Button variant="outline" size="sm" onClick={() => setShowColumns((value) => !value)}>
              <Columns3 className="mr-2 h-4 w-4" />
              Columns
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${summaryCollapsed ? 'xl:grid-cols-[minmax(0,1fr)_44px]' : 'xl:grid-cols-[minmax(0,1fr)_280px]'}`}>
          <div className="space-y-4 min-w-0">
            <Card>
              <CardContent className="pt-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_160px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-9"
                      placeholder="Search claim, auth, member, hospital, cause, plan..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Awaiting GOP">Awaiting GOP</option>
                    <option value="Pending Documentation">Pending Documentation</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Ready for Payment">Ready for Payment</option>
                    <option value="Paid">Paid</option>
                    <option value="Repudiated">Repudiated</option>
                  </select>
                  <Button variant="outline" className="h-10">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </div>

                {showColumns && (
                  <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Visible register columns</p>
                      <button
                        type="button"
                        className="text-xs font-medium text-green-700 hover:text-green-800"
                        onClick={() => setVisibleColumns(defaultVisibleColumns)}
                      >
                        Reset columns
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {registerColumns.map((column) => (
                        <label key={column.key} className="flex items-center gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(column.key)}
                            onChange={() => toggleColumn(column.key)}
                            className="h-4 w-4 rounded border-gray-300 text-green-600"
                          />
                          <span className="truncate">{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {newIntakes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>New Intake Queue</CardTitle>
                  <CardDescription>
                    {`${newIntakes.length} hospital intake${newIntakes.length === 1 ? '' : 's'} waiting for claims processing`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {newIntakes.map((intake) => (
                      <div key={intake.id} className="rounded-md border border-red-200 bg-red-50/40 px-4 py-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{intake.source_reference || intake.intake_number}</span>
                              <span className="inline-flex items-center rounded-full border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                {intake.document_type === 'claim_form' ? 'Claim Form' : 'New GOP'}
                              </span>
                              {intake.ocr_confidence !== null && intake.ocr_confidence !== undefined && (
                                <span className="text-xs text-gray-500">OCR {intake.ocr_confidence}%</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{intake.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(intake.created_at)} / {intake.document_type.replace('_', ' ')} / {normaliseStatus(intake.status)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openIntakeReview(intake)}
                          >
                            Review source
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Hospital Claims Register</CardTitle>
                <CardDescription>
                  Showing {filteredRows.filter((row) => row.rowType !== 'subtotal').length} claims in an Excel-style workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClaims ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading hospital claims...</p>
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hospital claims found</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-310px)] overflow-auto rounded-md border border-gray-200">
                    <table
                      className="border-separate border-spacing-0 text-xs"
                      style={{
                        minWidth: activeColumns.reduce((sum, column) => sum + displayColumnWidth(column, filteredRows), 0),
                      }}
                    >
                      <thead className="sticky top-0 z-20">
                        <tr>
                          {activeColumns.map((column, index) => {
                            const columnWidth = displayColumnWidth(column, filteredRows);
                            const isCompressed = columnWidth < column.width;

                            return (
                              <th
                                key={column.key}
                                title={column.label}
                                className={`border-b border-r border-gray-200 bg-gray-100 px-2 py-2 font-semibold text-gray-700 ${cellAlignment(column)} ${column.frozen ? 'sticky z-30' : ''}`}
                                style={{
                                  width: columnWidth,
                                  minWidth: columnWidth,
                                  maxWidth: columnWidth,
                                  left: column.frozen ? frozenLeft(activeColumns, index) : undefined,
                                }}
                              >
                                <span className={isCompressed ? 'block truncate text-[10px]' : 'block whitespace-normal'}>
                                  {column.label}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {groupedEntries.map(([month, rows]) => {
                          const isCollapsed = collapsedMonths.has(month);
                          return (
                            <Fragment key={month}>
                              <tr key={`${month}-header`} className="sticky top-[33px] z-10">
                                <td
                                  colSpan={activeColumns.length}
                                  className="border-b border-gray-200 bg-slate-50 px-3 py-2"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleMonth(month)}
                                    className="flex items-center gap-2 text-sm font-semibold text-gray-800"
                                  >
                                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    {month} ({rows.length} Claims)
                                  </button>
                                </td>
                              </tr>
                              {!isCollapsed && rows.length === 0 && (
                                <tr className="bg-white">
                                  <td colSpan={activeColumns.length} className="border-b border-gray-200 px-3 py-4 text-sm text-gray-500">
                                    No claims yet for {month}. Upload a new GOP/Application or claim form to start this month.
                                  </td>
                                </tr>
                              )}
                              {!isCollapsed &&
                                rows.map((row) => (
                                  <tr
                                    key={row.id}
                                    onClick={() => openClaimDrawer(row)}
                                    className={
                                      row.rowType === 'subtotal'
                                        ? 'cursor-pointer bg-blue-50 font-semibold text-gray-950 hover:bg-blue-100'
                                        : `${rowTint(row.status)} cursor-pointer hover:bg-emerald-50`
                                    }
                                  >
                                    {activeColumns.map((column, index) => {
                                      const columnWidth = displayColumnWidth(column, filteredRows);
                                      const formattedValue = formatCell(row, column);

                                      return (
                                        <td
                                          key={`${row.id}-${column.key}`}
                                          title={typeof formattedValue === 'string' ? formattedValue : undefined}
                                          className={`border-b border-r border-gray-200 px-2 py-2 align-top text-gray-800 ${cellAlignment(column)} ${column.frozen ? 'sticky z-10 shadow-[1px_0_0_#e5e7eb]' : ''}`}
                                          style={{
                                            width: columnWidth,
                                            minWidth: columnWidth,
                                            maxWidth: columnWidth,
                                            left: column.frozen ? frozenLeft(activeColumns, index) : undefined,
                                            background: column.frozen ? 'inherit' : undefined,
                                          }}
                                        >
                                          <div className="truncate">{formattedValue}</div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            {summaryCollapsed ? (
              <button
                type="button"
                aria-label="Expand claims summary"
                title="Expand claims summary"
                onClick={() => setSummaryCollapsed(false)}
                className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-r-0 border-green-200 bg-gradient-to-t from-green-50 to-green-100 text-green-900 shadow-sm transition-colors before:absolute before:right-0 before:top-1/2 before:z-30 before:h-[60%] before:w-[5px] before:-translate-y-1/2 before:rounded-l before:bg-green-500 before:shadow-[-2px_0_10px_rgba(34,197,94,0.9)] after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-r after:from-transparent after:from-40% after:via-green-100 after:via-70% after:to-green-200 after:shadow-[hsl(var(--foreground)/0.15)_0px_1px_0px_inset] hover:border-green-300 hover:text-green-950"
              >
                <PanelRightOpen className="relative z-30 h-5 w-5" />
              </button>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">Claims Summary</CardTitle>
                      <CardDescription>Live workspace totals</CardDescription>
                    </div>
                    <button
                      type="button"
                      aria-label="Collapse claims summary"
                      title="Collapse claims summary"
                      onClick={() => setSummaryCollapsed(true)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <SummaryRow label="Open Claims" value={stats.openClaims} tone="text-emerald-700" />
                  <SummaryRow label="Today's Claims" value={stats.todaysClaims} />
                  <SummaryRow label="Outstanding Value" value={formatCurrency(stats.outstandingValue)} tone="text-red-700" />
                  <SummaryRow label="Awaiting Documentation" value={stats.awaitingDocumentation} tone="text-yellow-700" />
                  <SummaryRow label="New Intakes" value={stats.newGops} tone="text-red-700" />
                  <SummaryRow label="Ready for Payment" value={stats.readyForPayment} tone="text-blue-700" />
                  <SummaryRow label="Claims Paid Today" value={stats.paidToday} tone="text-green-700" />
                  <SummaryRow label="Hospital Claims" value={stats.hospitalClaims} />
                  <SummaryRow label="Total Incurred" value={formatCurrency(stats.totalIncurred)} />
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        {intakeFile && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
            <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
              <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">New GOP/Application</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">Scan Review</h2>
                    <p className="text-sm text-gray-500">{intakeFile.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={closeIntakeDrawer}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <DrawerSection title="Uploaded Document">
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    <p className="font-medium text-gray-900">{intakeFile.name}</p>
                    <p className="text-gray-500">{intakeFile.type || 'Unknown file type'} / {(intakeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </DrawerSection>

                <DrawerSection title="Scanned Field Information">
                  {scanningIntake && (
                    <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                      Scanning document and generating next HCR claim number...
                    </div>
                  )}

                  {intakeError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      {intakeError}
                    </div>
                  )}

                  {!scanningIntake && !intakeError && !intakeScan && (
                    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                      OCR scanning will populate GOP/application fields here before anything is added to the main claims register.
                    </div>
                  )}

                  {intakeScan && (
                    <>
                      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        <span className="font-semibold">OCR Confidence:</span> {intakeScan.confidence}% /{' '}
                        <span className="font-semibold">Document:</span> {intakeScan.document.documentType.replace('_', ' ')}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {intakeScan.extractedFields.map((field) => (
                          <div
                            key={`${field.label}-${field.value}`}
                            className={`rounded-md border px-3 py-2 ${
                              field.confidence < 70 ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-gray-500">{field.label}</p>
                              <span className="text-[10px] font-medium text-gray-400">{field.confidence}%</span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-gray-900">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </DrawerSection>

                <DrawerSection title="Automatic Lookup">
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    Once OCR identifies key values like ID number, member number, policy number, auth number, or practice number, the system will auto-fill everything possible from the database.
                  </div>
                </DrawerSection>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button variant="outline" onClick={closeIntakeDrawer}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!intakeScan || scanningIntake}
                    onClick={addScannedIntakeToClaims}
                    title={!intakeScan ? 'Scan must complete before adding to claims' : undefined}
                  >
                    Add to claims
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedIntakeReview && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
            <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
              <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      {selectedIntakeReview.document_type === 'claim_form' ? 'New Claim Form Intake' : 'New GOP Intake'}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">
                      {selectedIntakeReview.source_reference || selectedIntakeReview.intake_number}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedIntakeReview.file_name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={closeIntakeReview}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <DrawerSection title="Intake Details">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <StaticDetail label="Intake Number" value={selectedIntakeReview.intake_number} />
                    <StaticDetail label="Claim Number" value={selectedIntakeReview.source_reference || '-'} />
                    <StaticDetail label="Document Type" value={selectedIntakeReview.document_type.replace('_', ' ')} />
                    <StaticDetail label="Status" value={normaliseStatus(selectedIntakeReview.status)} />
                    <StaticDetail label="Uploaded" value={formatDate(selectedIntakeReview.created_at)} />
                    <StaticDetail
                      label="OCR Confidence"
                      value={
                        selectedIntakeReview.ocr_confidence !== null && selectedIntakeReview.ocr_confidence !== undefined
                          ? `${selectedIntakeReview.ocr_confidence}%`
                          : '-'
                      }
                    />
                  </div>
                </DrawerSection>

                <DrawerSection title="Scanned Field Information">
                  {!selectedIntakeReview.ocr_fields || selectedIntakeReview.ocr_fields.length === 0 ? (
                    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                      No OCR field data was stored for this intake.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {selectedIntakeReview.ocr_fields
                        .filter(
                          (field) =>
                            ![
                              'Medical Aid Status',
                              'Consent Status',
                              'Detected Member Number',
                              'Total Guaranteed Amount',
                            ].includes(field.label)
                        )
                        .map((field) => (
                        <div
                          key={`${selectedIntakeReview.id}-${field.label}-${field.value}`}
                          className={`rounded-md border px-3 py-2 ${
                            field.confidence < 70 ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-gray-500">{field.label}</p>
                            <span className="text-[10px] font-medium text-gray-400">{field.confidence}%</span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-900">{field.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </DrawerSection>

                {selectedIntakeReview.document_type === 'claim_form' && selectedIntakeReview.comparison && (
                  <DrawerSection title="Major Differences Review">
                    <div className="space-y-3">
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                        {selectedIntakeReview.comparison.adminPrompt}
                      </div>
                      {selectedIntakeReview.comparison.majorDifferences.length === 0 ? (
                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
                          No major differences were detected against the matched HCR claim. The admin should still open the claim form and review it personally.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedIntakeReview.comparison.majorDifferences.map((difference) => (
                            <div key={`${difference.label}-${difference.formValue}`} className="rounded-md border border-amber-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{difference.label}</p>
                              <p className="mt-1 text-sm text-gray-700">
                                <span className="font-medium text-gray-900">Current claim:</span> {difference.existingValue}
                              </p>
                              <p className="mt-1 text-sm text-gray-700">
                                <span className="font-medium text-gray-900">Claim form:</span> {difference.formValue}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DrawerSection>
                )}

                <DrawerSection title="Workspace Action">
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
                    {selectedIntakeReview.document_type === 'claim_form'
                      ? 'Only major differences are shown here. Please open the claim form and review it personally before accepting any claim updates.'
                      : 'Review the scanned fields, then accept this GOP to insert the next claim line into the Hospital Claims Workspace for the current month.'}
                  </div>
                </DrawerSection>

                <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white pt-4">
                  <div className="mr-auto flex items-center">
                    {intakeReviewError && <span className="text-sm font-medium text-red-700">{intakeReviewError}</span>}
                  </div>
                  <Button variant="outline" onClick={closeIntakeReview}>
                    Close
                  </Button>
                  <Button
                    onClick={acceptIntakeIntoWorkspace}
                    disabled={
                      acceptingIntakeReview ||
                      selectedIntakeReview.status === 'inserted' ||
                      (selectedIntakeReview.document_type === 'claim_form' && !selectedIntakeReview.matched_register_id)
                    }
                  >
                    {selectedIntakeReview.document_type === 'claim_form' && !selectedIntakeReview.matched_register_id
                      ? 'No matched claim found'
                      : selectedIntakeReview.status === 'inserted'
                      ? 'Already inserted'
                      : acceptingIntakeReview
                        ? 'Inserting...'
                        : selectedIntakeReview.document_type === 'claim_form'
                          ? 'Open matched claim for review'
                          : 'Accept and insert into workspace'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedRow && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
            <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
              <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Claim Drawer</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">{selectedRow.claimNumber}</h2>
                    <p className="text-sm text-gray-500">{selectedRow.patientName} / {selectedRow.memberNumber}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={closeClaimDrawer}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="sticky top-[89px] z-10 flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                  <div className="text-xs">
                    {!drawerError && drawerNotice && <span className="font-medium text-amber-700">{drawerNotice}</span>}
                    {drawerError && <span className="font-medium text-red-700">{drawerError}</span>}
                    {!drawerError && !drawerNotice && drawerDirty && <span className="font-medium text-orange-700">Unsaved changes</span>}
                    {!drawerError && !drawerNotice && drawerSaved && <span className="font-medium text-green-700">Saved</span>}
                    {!drawerError && !drawerNotice && !drawerDirty && !drawerSaved && <span className="text-gray-500">Editable claim register row</span>}
                  </div>
                  <Button size="sm" onClick={saveSelectedRow} disabled={savingDrawer || !drawerDirty}>
                    {savingDrawer ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
                <DrawerSection title="Register Details">
                  <EditableDetailGrid
                    row={selectedRow}
                    keys={['authNumber', 'reportedDate', 'dol', 'status', 'hospital', 'cause', 'plan', 'icd10']}
                    onChange={updateSelectedRowField}
                  />
                </DrawerSection>
                <DrawerSection title="Financials">
                  <EditableDetailGrid
                    row={selectedRow}
                    keys={['totalIncurred', 'finalisedPaid', 'outstanding', 'actualCosts', 'memberCosts', 'accident', 'illness', 'casualty', 'exGratia', 'repudiation']}
                    onChange={updateSelectedRowField}
                  />
                </DrawerSection>
                <DrawerSection title="Member and Patient">
                  <EditableDetailGrid
                    row={selectedRow}
                    keys={['memberNumber', 'surname', 'initials', 'patientName', 'principalId', 'gender', 'patientDob', 'relationship']}
                    onChange={updateSelectedRowField}
                  />
                </DrawerSection>
                <DrawerSection title="Documents">
                  <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                    GOP PDFs, invoices, discharge summaries, radiology, pathology, emails, and claim forms will appear here in the scanning phase.
                  </div>
                </DrawerSection>
                <DrawerSection title="Smart Alerts">
                  <div className="space-y-2">
                    {selectedRow.sourceClaim.pre_auth_required && !selectedRow.sourceClaim.pre_auth_number && (
                      <AlertRow text="GOP required or missing authorisation number." />
                    )}
                    {selectedRow.sourceClaim.fraud_alert_triggered && <AlertRow text="Fraud alert has been triggered." />}
                    {selectedRow.outstanding > 0 && <AlertRow text="Claim has outstanding value." />}
                    {!selectedRow.sourceClaim.pre_auth_required && !selectedRow.sourceClaim.fraud_alert_triggered && selectedRow.outstanding <= 0 && (
                      <p className="text-sm text-gray-500">No current alerts.</p>
                    )}
                  </div>
                </DrawerSection>
                <DrawerSection title="Timeline">
                  <div className="space-y-3 text-sm">
                    <TimelineItem title="Claim loaded into workspace" detail={formatDate(selectedRow.reportedDate)} />
                    <TimelineItem title="Awaiting GOP/OCR integration" detail="Next build phase" />
                    <TimelineItem title="Database mapping pending" detail="Final build phase" />
                  </div>
                </DrawerSection>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

function SummaryRow({ label, value, tone = 'text-gray-900' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-600">{label}</span>
      <span className={`text-right font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <PanelRightOpen className="h-4 w-4 text-green-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StaticDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || '-'}</p>
    </div>
  );
}

function EditableDetailGrid({
  row,
  keys,
  onChange,
}: {
  row: RegisterRow;
  keys: ColumnKey[];
  onChange: (key: ColumnKey, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {keys.map((key) => {
        const column = registerColumns.find((item) => item.key === key);
        if (!column) return null;
        const isNumeric = numericColumnKeys.has(key);

        return (
          <label key={key} className="block rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-500">{column.label}</span>
            <input
              type={isNumeric ? 'number' : 'text'}
              step={isNumeric ? '0.01' : undefined}
              value={editableValue(row, key)}
              onChange={(event) => onChange(key, event.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-sm font-medium text-gray-900 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
          </label>
        );
      })}
    </div>
  );
}

function AlertRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function TimelineItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 h-2 w-2 rounded-full bg-green-600" />
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-gray-500">{detail}</p>
      </div>
    </div>
  );
}
