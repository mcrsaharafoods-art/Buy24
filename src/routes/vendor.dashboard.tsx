import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Loader2, Plus, Edit, Trash, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getVendorProducts, saveProduct, deleteProduct } from "@/lib/product.functions";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/vendor/dashboard")({
  ssr: false,
  component: VendorDashboard,
});

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  selling_price: number;
  mrp: number;
  stock: number;
  unit: string;
  is_active: boolean;

  images: any;
};

function VendorDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    selling_price: "",
    mrp: "",
    stock: "",
    unit: "",
    is_active: true,
    images: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // Fetch data using server functions
      setReady(true);
    })();
  }, [navigate]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: () => getVendorProducts(),
    enabled: ready,
  });

  const saveProductFn = useServerFn(saveProduct);
  const deleteProductFn = useServerFn(deleteProduct);

  function resetForm() {
    setEditingId(null);
    setFormData({
      name: "",
      category: "",
      description: "",
      selling_price: "",
      mrp: "",
      stock: "",
      unit: "",
      is_active: true,
      images: [],
    });
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      category: p.category,
      description: p.description,
      selling_price: p.selling_price.toString(),
      mrp: p.mrp.toString(),
      stock: p.stock.toString(),
      unit: p.unit,
      is_active: p.is_active,
      images: p.images || [],
    });
    setIsDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProductFn({ data: { id } });
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 1024 * 1024) {
        toast.error("File size must be less than or equal to 1 MB.");
        continue;
      }

      // TEMPORARY: Save local preview/reference to bypass missing Firebase Storage
      const localRef = URL.createObjectURL(file);
      newImages.push(localRef);
    }
    setFormData((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
  }

  function removeImage(index: number) {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProductFn({
        data: {
          id: editingId || undefined,
          name: formData.name,
          category: formData.category,
          description: formData.description,
          selling_price: parseFloat(formData.selling_price) || 0,
          mrp: parseFloat(formData.mrp) || 0,
          stock: parseInt(formData.stock) || 0,
          unit: formData.unit,
          is_active: formData.is_active,
          images: formData.images,
        },
      });
      toast.success(editingId ? "Product updated" : "Product added");
      setIsDialogOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!ready || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your products</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Selling Price (₹)</Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>MRP (₹)</Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unit (e.g. kg, piece, liter)</Label>
                  <Input
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Product Images</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img}
                        className="h-16 w-16 object-cover rounded-md border"
                        alt="Preview"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-col items-center">
                    <label className="h-16 w-16 flex items-center justify-center rounded-md border border-dashed cursor-pointer hover:bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImagesChange}
                      />
                    </label>
                    <span className="mt-1 text-[11px] text-muted-foreground text-center">
                      Upload image
                      <br />
                      (Maximum size: 1 MB)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
                <Label>Active (Visible to customers)</Label>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Price / MRP</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No products found. Add your first product!
                </td>
              </tr>
            )}
            {products?.map((p: Product) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      className="h-10 w-10 rounded-md object-cover border"
                      alt={p.name}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                </td>
                <td className="px-4 py-3">
                  ₹{p.selling_price}{" "}
                  <span className="line-through text-muted-foreground text-xs">₹{p.mrp}</span> /{" "}
                  {p.unit}
                </td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
