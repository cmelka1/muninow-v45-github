import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';

interface ServiceTileCardProps {
  tile: MunicipalServiceTile;
  onApply: (tile: MunicipalServiceTile) => void;
}

const ServiceTileCard: React.FC<ServiceTileCardProps> = ({ tile, onApply }) => {
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
          
          <div className="flex gap-2">
            {tile.pdf_form_url && (
              <Button 
                type="button"
                variant="outline" 
                size="lg"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = tile.pdf_form_url!;
                  link.download = `${tile.title.replace(/[^a-zA-Z0-9]/g, '_')}_form.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Form
              </Button>
            )}
            
            <Button 
              onClick={() => onApply(tile)}
              className="flex-1"
              size="lg"
            >
              Apply Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceTileCard;