'use client';

import { useEffect, useMemo, useState } from 'react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth-fetch';

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  source: string;
  event: string;
  entity: string;
  action: string;
  details: string;
  resource_type?: string | null;
  resource_id?: string | null;
  claim_number?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
}

interface AuditStats {
  totalEvents: number;
  todayEvents: number;
  platformEvents: number;
  workflowEvents: number;
}

interface AuditResponse {
  events: AuditEvent[];
  stats: AuditStats;
}

const emptyStats: AuditStats = {
  totalEvents: 0,
  todayEvents: 0,
  platformEvents: 0,
  workflowEvents: 0,
};

export default function AdminAuditPage() {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAuditEvents();
  }, [searchTerm, sourceFilter, dateRange]);

  const loadAuditEvents = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);
      if (dateRange) params.set('date_range', dateRange);

      const response = await authFetch(`/api/admin/audit?${params.toString()}`, {
        cache: 'no-store',
      });
      const data: AuditResponse & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load audit log');
      }

      setEvents(data.events || []);
      setStats(data.stats || emptyStats);
    } catch (err: any) {
      console.error('Failed to load audit log:', err);
      setError(err.message || 'Failed to load audit log');
      setEvents([]);
      setStats(emptyStats);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
  };

  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    return new Intl.DateTimeFormat('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const sourceOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Events' },
      { value: 'platform', label: 'Platform Events' },
      { value: 'claims', label: 'Claim Events' },
      { value: 'preauth', label: 'Preauth Events' },
    ];
  }, []);

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600 mt-1">System-wide audit trail and activity monitoring</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-3xl font-bold mt-1">{stats.totalEvents.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Today's Events</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">{stats.todayEvents}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Platform Events</p>
                <p className="text-3xl font-bold mt-1 text-purple-600">{stats.platformEvents}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Workflow Events</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{stats.workflowEvents}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="User, event, details..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                  />
                  <Button onClick={handleSearch}>Search</Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Source</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Audit Events</CardTitle>
              <Button variant="outline" size="sm" disabled>
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-600">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                <p className="mt-3 text-sm">Loading audit events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No audit events found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Timestamp</th>
                      <th className="text-left py-3 px-4 font-medium">Source</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Event</th>
                      <th className="text-left py-3 px-4 font-medium">Entity</th>
                      <th className="text-left py-3 px-4 font-medium">Resource</th>
                      <th className="text-left py-3 px-4 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-mono">{formatTimestamp(event.timestamp)}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                            {event.source}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{event.user}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {event.event}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{event.entity}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {event.resource_type
                            ? `${event.resource_type}${event.resource_id ? ` - ${event.resource_id}` : ''}`
                            : event.claim_number || event.resource_id || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{event.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
