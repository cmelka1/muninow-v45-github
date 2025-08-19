import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign } from 'lucide-react';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';

interface ServiceTileCardProps {
  tile: MunicipalServiceTile;
  onApply: (tile: MunicipalServiceTile) => void;
}

const ServiceTileCard: React.FC<ServiceTileCardProps> = ({ tile, onApply }) => {
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-200 border-border hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2 text-foreground">{tile.title}</CardTitle>
            {tile.description && (
              <CardDescription className="text-muted-foreground">
                {tile.description}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            <Badge variant="secondary" className="whitespace-nowrap">
              <DollarSign className="h-3 w-3 mr-1" />
              {formatAmount(tile.amount_cents)}
            </Badge>
            {tile.requires_review && (
              <Badge variant="outline" className="text-xs">
                Requires Review
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {tile.pdf_form_url && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>PDF Form Available</span>
            </div>
          )}
          
          {tile.form_fields && tile.form_fields.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span>{tile.form_fields.length} form field(s) required</span>
            </div>
          )}
          
          <Button 
            onClick={() => onApply(tile)}
            className="w-full"
            size="lg"
          >
            Apply Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceTileCard;