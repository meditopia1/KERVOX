'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { PageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PolicySectionItems } from '@/components/policy/PolicySectionItems';
import { authFetch } from '@/lib/auth-fetch';

interface Definition {
  id: string;
  term: string;
  definition: string;
  category: string;
  display_order: number;
}

const POLICY_SECTIONS = [
  { id: 'definitions', label: 'Definitions' },
  { id: 'waiting-periods', label: 'Waiting Periods' },
  { id: 'general-provisions', label: 'General Provisions' },
  { id: 'payment-premium', label: 'Payment of Premium' },
  { id: 'exclusions-limitations', label: 'Exclusions & Limitations' },
  { id: 'general-conditions', label: 'General Conditions' },
  { id: 'insuring-section', label: 'Insuring Section' },
  { id: 'funeral-benefit', label: 'Funeral Benefit' },
  { id: 'critical-illness-definitions', label: 'Critical Illness Definitions' },
];

export default function PolicyDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.id as string;
  const activeTab = searchParams.get('tab') || 'definitions';

  const [product, setProduct] = useState<any>(null);
  const [sectionItems, setSectionItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [productId, activeTab]);

  const fetchData = async () => {
    try {
      console.log('[fetchData] Starting fetch for product:', productId, 'tab:', activeTab);
      // Fetch product from Supabase
      const productRes = await authFetch(`/api/admin/products/${productId}`);
      if (productRes.ok) {
        const productData = await productRes.json();
        setProduct(productData);
      } else {
        console.error('Failed to fetch product:', productRes.status, productRes.statusText);
      }
      
      // Fetch policy section items
      const sectionsRes = await authFetch(`/api/admin/products/${productId}/policy-sections?t=${Date.now()}`);
      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        
        console.log('[fetchData] Sections data received:', {
          sectionKeys: Object.keys(sectionsData.sections || {}),
          definitionsCount: sectionsData.sections?.definitions?.length || 0,
          activeTab
        });
        
        // Set section items for current tab
        if (sectionsData.sections && sectionsData.sections[activeTab]) {
          console.log('[fetchData] Setting section items for tab:', activeTab, 'count:', sectionsData.sections[activeTab].length);
          setSectionItems(sectionsData.sections[activeTab]);
        } else {
          console.log('[fetchData] No section items found for tab:', activeTab);
          setSectionItems([]);
        }
        
      } else {
        console.error('Failed to fetch policy sections:', sectionsRes.status, sectionsRes.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSectionItem = async (data: { title: string; content: string }) => {
    const response = await authFetch(`/api/admin/products/${productId}/policy-sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sectionType: activeTab,
        title: data.title,
        content: data.content,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to add section item');
    }

    await fetchData();
  };

  const handleUpdateSectionItem = async (itemId: string, data: { title: string; content: string }) => {
    const response = await authFetch(`/api/admin/products/policy-sections/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: data.title,
        content: data.content,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update section item');
    }

    await fetchData();
  };

  const handleDeleteSectionItem = async (itemId: string) => {
    const response = await authFetch(`/api/admin/products/policy-sections/${itemId}`, {
      method: 'DELETE',
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to delete section item');
    }

    await fetchData();
  };

  if (loading) {
    return (
      <SidebarLayout>
        <PageLoading message="Loading product benefits..." />
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/products')}>
              ← Back to Policy Creator
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">{product?.name} - Policy Document</h1>
            <p className="text-gray-600 mt-1">Configure policy sections and definitions</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {POLICY_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => router.push(`/admin/products/${productId}/benefits?tab=${section.id}`)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === section.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'definitions' && (
          <Card>
            <CardHeader>
              <CardTitle>Definitions ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                In this Policy, unless the context indicates a contrary intention, the following words and expressions bear the meanings assigned to them and cognate expressions bear corresponding meanings
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="Definitions"
              />
            </CardContent>
          </Card>
        )}

        {/* Waiting Periods Tab */}
        {activeTab === 'waiting-periods' && (
          <Card>
            <CardHeader>
              <CardTitle>Waiting Periods ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                The Waiting Period is the period subsequent to the Inception Date of the Policy, in which no Benefits will be paid
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="Waiting Period Items"
              />
            </CardContent>
          </Card>
        )}

        {/* General Provisions Tab */}
        {activeTab === 'general-provisions' && (
          <Card>
            <CardHeader>
              <CardTitle>General Provisions ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                It is declared and agreed that:
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="General Provisions"
              />
            </CardContent>
          </Card>
        )}

        {/* Payment of Premium Tab */}
        {activeTab === 'payment-premium' && (
          <Card>
            <CardHeader>
              <CardTitle>Payment of Premium ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Terms and conditions for premium payments
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="Payment of Premium"
              />
            </CardContent>
          </Card>
        )}

        {/* Exclusions & Limitations Tab */}
        {activeTab === 'exclusions-limitations' && (
          <Card>
            <CardHeader>
              <CardTitle>Exclusions & Limitations ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                The Insurer shall not be liable to pay Compensation for Bodily Injury, Illness, Maternity or Critical Illness in respect of any Insured Person:
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="Exclusions and Limitations"
              />
            </CardContent>
          </Card>
        )}

        {/* General Conditions Tab */}
        {activeTab === 'general-conditions' && (
          <Card>
            <CardHeader>
              <CardTitle>General Conditions ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                General terms and conditions of the policy
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="General Conditions"
              />
            </CardContent>
          </Card>
        )}

        {/* Insuring Section Tab */}
        {activeTab === 'insuring-section' && (
          <Card>
            <CardHeader>
              <CardTitle>Insuring Section ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                The following Insurance Cover and Benefits shall be available to the Insured Persons and payable directly to the Service Provider as follows:
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="Benefits"
              />
            </CardContent>
          </Card>
        )}

        {/* Funeral Benefit Tab */}
        {activeTab === 'funeral-benefit' && (
          <Card>
            <CardHeader>
              <CardTitle>Funeral Benefit ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                The following Insurance Cover and Benefits shall be available to the Insured Person's estate as follows:
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="Funeral Benefits"
              />
            </CardContent>
          </Card>
        )}

        {/* Critical Illness Definitions Tab */}
        {activeTab === 'critical-illness-definitions' && (
          <Card>
            <CardHeader>
              <CardTitle>Critical Illness Definitions ({sectionItems.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Definitions of Heart Attack, Stroke and Cancer
              </p>
            </CardHeader>
            <CardContent>
              <PolicySectionItems
                items={sectionItems}
                onAdd={handleAddSectionItem}
                onUpdate={handleUpdateSectionItem}
                onDelete={handleDeleteSectionItem}
                sectionName="Critical Illness Definitions"
              />
            </CardContent>
          </Card>
        )}

        {/* Other sections - Coming soon */}
        {activeTab !== 'definitions' && activeTab !== 'waiting-periods' && activeTab !== 'general-provisions' && activeTab !== 'payment-premium' && activeTab !== 'exclusions-limitations' && activeTab !== 'general-conditions' && activeTab !== 'insuring-section' && activeTab !== 'funeral-benefit' && activeTab !== 'critical-illness-definitions' && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {POLICY_SECTIONS.find(s => s.id === activeTab)?.label}
                </h3>
                <p className="text-gray-600">This section is coming soon.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}
