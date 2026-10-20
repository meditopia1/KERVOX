'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth-fetch';

interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  phone: string;
  status: string;
  product: string;
  monthlyPremium: number;
  joinDate: string;
  policyNumber: string;
}

export default function CallCentreMembersPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setMembers([]);
      setHasSearched(true);
      return;
    }

    try {
      setSearching(true);
      setHasSearched(true);
      const response = await authFetch(`/api/call-centre/members?search=${encodeURIComponent(searchTerm.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search members');
      }

      setMembers(data.members || []);
    } catch (error) {
      console.error('Error searching members:', error);
      setMembers([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSearch();
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Lookup</h1>
          <p className="text-gray-600 mt-1">Search for members by name, ID, or policy number</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Members</CardTitle>
            <CardDescription>Enter member details to find their information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, ID number, email, or mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {!hasSearched && (
                <div className="text-center py-12 text-gray-500">
                  <p>Enter search criteria to find members</p>
                </div>
              )}

              {hasSearched && members.length === 0 && !searching && (
                <div className="text-center py-12 text-gray-500">
                  <p>No members found</p>
                </div>
              )}

              {members.length > 0 && (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Member</p>
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Member Number</p>
                          <p className="font-medium font-mono">{member.memberNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Plan</p>
                          <p className="font-medium">{member.product || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Status</p>
                          <p className="font-medium">{member.status}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">ID Number</p>
                          <p className="font-medium">{member.idNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Email</p>
                          <p className="font-medium break-all">{member.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Mobile</p>
                          <p className="font-medium">{member.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Join Date</p>
                          <p className="font-medium">{member.joinDate || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
