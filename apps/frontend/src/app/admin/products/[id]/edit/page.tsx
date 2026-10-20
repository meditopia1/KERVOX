'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { PageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/auth-fetch';

type ProductForm = {
  name: string;
  code: string;
  description: string;
  regime: 'insurance' | 'medical_scheme';
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'archived';
  category: string;
  monthly_premium: string;
  cover_amount: string;
  price_single: string;
  price_couple: string;
  price_per_child: string;
  price_range_min: string;
  price_range_max: string;
  age_restriction: string;
};

const EMPTY_FORM: ProductForm = {
  name: '',
  code: '',
  description: '',
  regime: 'insurance',
  status: 'draft',
  category: 'general',
  monthly_premium: '0',
  cover_amount: '0',
  price_single: '0',
  price_couple: '0',
  price_per_child: '0',
  price_range_min: '0',
  price_range_max: '0',
  age_restriction: 'All ages',
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await authFetch(`/api/admin/products/${productId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load product');
        }

        setForm({
          name: data.name || '',
          code: data.code || '',
          description: data.description || '',
          regime: data.regime || 'insurance',
          status: data.status || 'draft',
          category: data.category || 'general',
          monthly_premium: String(data.monthly_premium || 0),
          cover_amount: String(data.cover_amount || 0),
          price_single: String(data.price_single || 0),
          price_couple: String(data.price_couple || 0),
          price_per_child: String(data.price_per_child || 0),
          price_range_min: String(data.price_range_min || 0),
          price_range_max: String(data.price_range_max || 0),
          age_restriction: data.age_restriction || 'All ages',
        });
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  const updateField = (field: keyof ProductForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await authFetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          monthly_premium: Number(form.monthly_premium || 0),
          cover_amount: Number(form.cover_amount || 0),
          price_single: Number(form.price_single || 0),
          price_couple: Number(form.price_couple || 0),
          price_per_child: Number(form.price_per_child || 0),
          price_range_min: Number(form.price_range_min || 0),
          price_range_max: Number(form.price_range_max || 0),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      router.push('/admin/products');
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <PageLoading message="Loading product..." />
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600 mt-1">Maintain the product shell, pricing, and publishing state.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/products')}>
            Back to Policy Creator
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Core Product Fields</CardTitle>
            <CardDescription>These are the top-level product fields used across listing, routing, and pricing views.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="code">Product Code</Label>
                <Input id="code" value={form.code} onChange={(e) => updateField('code', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={form.category} onChange={(e) => updateField('category', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="age_restriction">Age Restriction</Label>
                <Input id="age_restriction" value={form.age_restriction} onChange={(e) => updateField('age_restriction', e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={4}
                className="w-full px-3 py-2 border rounded-md"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="regime">Regime</Label>
                <select
                  id="regime"
                  className="w-full px-3 py-2 border rounded-md"
                  value={form.regime}
                  onChange={(e) => updateField('regime', e.target.value)}
                >
                  <option value="insurance">Insurance</option>
                  <option value="medical_scheme">Medical Scheme</option>
                </select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border rounded-md"
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <Label htmlFor="monthly_premium">Monthly Premium</Label>
                <Input id="monthly_premium" type="number" value={form.monthly_premium} onChange={(e) => updateField('monthly_premium', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cover_amount">Cover Amount</Label>
                <Input id="cover_amount" type="number" value={form.cover_amount} onChange={(e) => updateField('cover_amount', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="price_single">Single</Label>
                <Input id="price_single" type="number" value={form.price_single} onChange={(e) => updateField('price_single', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="price_couple">Couple</Label>
                <Input id="price_couple" type="number" value={form.price_couple} onChange={(e) => updateField('price_couple', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="price_per_child">Per Child</Label>
                <Input id="price_per_child" type="number" value={form.price_per_child} onChange={(e) => updateField('price_per_child', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="price_range_min">Price Range Min</Label>
                <Input id="price_range_min" type="number" value={form.price_range_min} onChange={(e) => updateField('price_range_min', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="price_range_max">Price Range Max</Label>
                <Input id="price_range_max" type="number" value={form.price_range_max} onChange={(e) => updateField('price_range_max', e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.push(`/admin/products/${productId}/benefits`)}>
                Configure Plan
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
