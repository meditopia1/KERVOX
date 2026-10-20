'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth-fetch';

type Rule = {
  id: string
  productId: string
  productBenefitId: string
  benefitName: string
  name: string
  type: string
  product: string
  version: string
  status: 'active' | 'draft'
  source: string
  description: string | null
  coverAmount: number | null
  annualLimit: number | null
  waitingPeriodDays: number
  preExistingExclusionDays: number
  exclusions: string[]
}

type Stats = {
  totalRules: number
  active: number
  draft: number
  types: number
}

type Pagination = {
  page: number
  pageSize: number
  totalFiltered: number
  totalPages: number
}

export default function RulesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRules: 0,
    active: 0,
    draft: 0,
    types: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    totalFiltered: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    coverAmount: '',
    annualLimit: '',
    waitingPeriodDays: '0',
    preExistingExclusionDays: '0',
    exclusions: '',
  });

  useEffect(() => {
    fetchRules();
  }, [page, searchTerm, selectedProduct]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
      });

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      if (selectedProduct) {
        params.set('product', selectedProduct);
      }

      const response = await authFetch(`/api/admin/rules?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rules');
      }

      setRules(data.rules || []);
      setStats(data.stats || { totalRules: 0, active: 0, draft: 0, types: 0 });
      setProductOptions(data.productOptions || []);
      setPagination(data.pagination || { page: 1, pageSize: 10, totalFiltered: 0, totalPages: 1 });
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setEditForm({
      description: rule.description || '',
      coverAmount: rule.coverAmount === null ? '' : String(rule.coverAmount),
      annualLimit: rule.annualLimit === null ? '' : String(rule.annualLimit),
      waitingPeriodDays: String(rule.waitingPeriodDays || 0),
      preExistingExclusionDays: String(rule.preExistingExclusionDays || 0),
      exclusions: (rule.exclusions || []).join(', '),
    });
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
    setSavingRuleId(null);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setPage(1);
  };

  const handleProductChange = (value: string) => {
    setSelectedProduct(value);
    setPage(1);
  };

  const saveRule = async (rule: Rule) => {
    setSavingRuleId(rule.id);
    try {
      const response = await authFetch(`/api/admin/products/benefits/${rule.productBenefitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: editForm.description,
          cover_amount: editForm.coverAmount === '' ? null : Number(editForm.coverAmount),
          annual_limit: editForm.annualLimit === '' ? null : Number(editForm.annualLimit),
          waiting_period_days: Number(editForm.waitingPeriodDays || 0),
          pre_existing_exclusion_days: Number(editForm.preExistingExclusionDays || 0),
          exclusions: editForm.exclusions
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update rule');
      }

      await fetchRules();
      setEditingRuleId(null);
    } catch (error) {
      console.error('Failed to update rule:', error);
      alert('Failed to update rule');
    } finally {
      setSavingRuleId(null);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rules Engine</h1>
          <p className="text-gray-600 mt-1">Manage business rules and policy logic</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Rules</p>
                <p className="text-3xl font-bold mt-1">{stats.totalRules}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Draft</p>
                <p className="text-3xl font-bold mt-1 text-yellow-600">{stats.draft}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Rule Types</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">{stats.types}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Rule name or ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSearch}
                  disabled={!searchTerm}
                >
                  Clear Text
                </Button>
              </div>
              <select
                className="workspace-field"
                value={selectedProduct}
                onChange={(e) => handleProductChange(e.target.value)}
              >
                <option value="">All plans</option>
                {productOptions.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-gray-600">
              Showing {pagination.totalFiltered === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
              {' '}-{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.totalFiltered)} of {pagination.totalFiltered} matching rules
            </p>
          </CardContent>
        </Card>

        {/* Rules Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Business Rules</CardTitle>
              <Button size="sm" disabled>Rule Builder Soon</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-gray-600">Loading live rules...</div>
            ) : rules.length === 0 ? (
              <div className="py-8 text-center text-gray-600">No live rules found yet.</div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/70">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50/80">
                        <th className="text-left py-3 px-4 font-medium">Rule ID</th>
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Type</th>
                        <th className="text-left py-3 px-4 font-medium">Product</th>
                        <th className="text-left py-3 px-4 font-medium">Version</th>
                        <th className="text-left py-3 px-4 font-medium">Source</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => (
                        <Fragment key={rule.id}>
                          <tr key={rule.id} className="border-b border-gray-200 hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-medium">{rule.id}</td>
                            <td className="py-3 px-4">{rule.name}</td>
                            <td className="py-3 px-4">
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                {rule.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">{rule.product}</td>
                            <td className="py-3 px-4 text-sm font-mono">{rule.version}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{rule.source}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-1 rounded ${
                                rule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {rule.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 space-x-2">
                              <Button variant="outline" size="sm" onClick={() => startEditing(rule)}>
                                Edit Rule
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/admin/products/${rule.productId}/edit`)}
                              >
                                Open Product
                              </Button>
                            </td>
                          </tr>
                          {editingRuleId === rule.id && (
                            <tr className="border-b border-gray-200 bg-slate-50/80">
                              <td colSpan={8} className="p-4">
                                <div className="space-y-4">
                                  <div>
                                    <p className="font-semibold text-gray-900">{rule.benefitName}</p>
                                    <p className="text-sm text-gray-600">Editing the underlying `product_benefits` record that currently drives this rule.</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea
                                      rows={3}
                                      className="workspace-textarea mt-1 w-full"
                                      value={editForm.description}
                                      onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))}
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Cover Amount</label>
                                      <Input value={editForm.coverAmount} onChange={(e) => setEditForm((current) => ({ ...current, coverAmount: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Annual Limit</label>
                                      <Input value={editForm.annualLimit} onChange={(e) => setEditForm((current) => ({ ...current, annualLimit: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Waiting Period Days</label>
                                      <Input value={editForm.waitingPeriodDays} onChange={(e) => setEditForm((current) => ({ ...current, waitingPeriodDays: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Pre-existing Exclusion Days</label>
                                      <Input value={editForm.preExistingExclusionDays} onChange={(e) => setEditForm((current) => ({ ...current, preExistingExclusionDays: e.target.value }))} />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Exclusions</label>
                                    <Input
                                      value={editForm.exclusions}
                                      onChange={(e) => setEditForm((current) => ({ ...current, exclusions: e.target.value }))}
                                      placeholder="Comma-separated exclusions"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button onClick={() => saveRule(rule)} disabled={savingRuleId === rule.id}>
                                      {savingRuleId === rule.id ? 'Saving...' : 'Save Rule'}
                                    </Button>
                                    <Button variant="outline" onClick={cancelEditing}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.max(current - 1, 1))}
                      disabled={pagination.page <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
                      disabled={pagination.page >= pagination.totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
