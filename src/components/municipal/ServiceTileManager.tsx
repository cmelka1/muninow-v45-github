import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import { ServiceTileForm } from '@/components/municipal/ServiceTileForm';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';

interface ServiceTileManagerProps {
  serviceTiles: MunicipalServiceTile[];
  isLoading: boolean;
  customerId?: string;
}

export function ServiceTileManager({ serviceTiles, isLoading, customerId }: ServiceTileManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTile, setEditingTile] = useState<MunicipalServiceTile | null>(null);

  const filteredTiles = serviceTiles.filter(tile =>
    tile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tile.description && tile.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateNew = () => {
    setEditingTile(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (tile: MunicipalServiceTile) => {
    setEditingTile(tile);
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTile(null);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search service tiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTile ? 'Edit Service Tile' : 'Create New Service Tile'}
              </DialogTitle>
            </DialogHeader>
            <ServiceTileForm
              tile={editingTile}
              customerId={customerId}
              onClose={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Service Tiles Grid */}
      {filteredTiles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchTerm ? 'No services match your search.' : 'No service tiles created yet.'}
            </div>
            {!searchTerm && (
              <Button onClick={handleCreateNew} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Service
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTiles.map((tile) => (
            <Card key={tile.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{tile.title}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={tile.is_active ? "default" : "secondary"}>
                        {tile.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {tile.requires_review && (
                        <Badge variant="outline">Requires Review</Badge>
                      )}
                      {tile.pdf_form_url && (
                        <Badge variant="outline">PDF Form</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {tile.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {tile.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold text-primary">
                    {tile.allow_user_defined_amount ? 'Varies' : formatCurrency(tile.amount_cents)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tile.form_fields?.length || 0} form fields
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(tile)}
                    className="flex-1 gap-2"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}