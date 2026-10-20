'use client';

import { useEffect, useMemo, useState } from 'react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { authFetch } from '@/lib/auth-fetch';

type BrokerStatus = 'active' | 'inactive' | 'pending' | 'suspended' | string;

interface Broker {
  id: string;
  code: string;
  name: string;
  broker_commission_rate: number;
  branch_commission_rate: number;
  agent_commission_rate: number;
  policy_prefix: string;
  status: BrokerStatus;
  member_count: number;
  created_at?: string;
  updated_at?: string;
}

export default function BrokerCommunicationsPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'code'>('name');

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await authFetch('/api/operations/brokers');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch brokers');
      }

      setBrokers(Array.isArray(data.brokers) ? data.brokers : []);
    } catch (err) {
      console.error('Error fetching brokers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch brokers');
      setBrokers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBrokers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...brokers]
      .filter((broker) => {
        const haystack = [broker.name, broker.code, broker.policy_prefix]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesSearch = !query || haystack.includes(query);
        const matchesStatus = !statusFilter || broker.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'members') return (b.member_count || 0) - (a.member_count || 0);
        if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [brokers, searchTerm, statusFilter, sortBy]);

  const stats = useMemo(() => {
    return {
      total: brokers.length,
      active: brokers.filter((broker) => broker.status === 'active').length,
      totalMembers: brokers.reduce((sum, broker) => sum + (broker.member_count || 0), 0),
      shown: filteredBrokers.length,
    };
  }, [brokers, filteredBrokers]);

  const getStatusClass = (status: BrokerStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broker Communications</h1>
          <p className="mt-2 text-gray-600">Browse and filter brokers from the live brokers table.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Total Brokers</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Active</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{stats.active}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Total Members</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Visible Rows</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.shown}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Broker Directory</h2>
              <p className="mt-1 text-sm text-gray-600">Search by broker name, code, or policy prefix.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                placeholder="Search brokers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'members' | 'code')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="name">Sort by Name</option>
                <option value="code">Sort by Code</option>
                <option value="members">Sort by Members</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="text-gray-600">Loading brokers...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            {error}
          </div>
        ) : filteredBrokers.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">No brokers found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Policy Prefix
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Members
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Broker %
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Branch %
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Agent %
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredBrokers.map((broker) => (
                    <tr key={broker.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-gray-900">
                        {broker.code || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{broker.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-700">
                        {broker.policy_prefix || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        {broker.member_count || 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-700">
                        {broker.broker_commission_rate ?? 0}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-700">
                        {broker.branch_commission_rate ?? 0}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-700">
                        {broker.agent_commission_rate ?? 0}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(broker.status)}`}>
                          {String(broker.status || 'inactive').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
