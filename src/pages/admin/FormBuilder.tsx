import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, GripVertical, Save, Eye } from 'lucide-react';
import { FormEngine } from '@/components/offline/FormEngine';

// Simple Form Builder for MVP (Expandable later)
export const FormBuilder: React.FC = () => {
  const [formName, setFormName] = useState('New Inspection Templates');
  const [items, setItems] = useState<any[]>([
    { id: 'item-1', label: 'Check Foundation', type: 'select', options: ['Pass', 'Fail', 'N/A'] },
    { id: 'item-2', label: 'Photo of Structure', type: 'photo' },
    { id: 'item-3', label: 'Inspector Signature', type: 'signature' },
  ]);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
  };

  const addItem = (type: string) => {
    const id = `field-${Date.now()}`;
    const newItem = {
      id,
      label: `New ${type} Field`,
      type,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
    };
    setItems([...items, newItem]);
  };

  const saveTemplate = async () => {
    try {
      // Convert UI state to Schema format expected by FormEngine
      const schema = {
        sections: [
          {
            id: 'section-1',
            title: 'General Inspection',
            items: items
          }
        ]
      };

      const { error } = await supabase
        .from('inspection_form_templates' as any)
        .insert({
          name: formName,
          schema: schema,
          version: 1,
          is_active: true
        });

      if (error) throw error;
      toast({ title: "Success", description: "Template saved successfully." });
      
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
    }
  };

  if (previewMode) {
    const previewSchema = {
      sections: [{ id: 's1', title: 'Start Preview', items }]
    };
    return (
      <div className="container mx-auto p-4">
        <Button onClick={() => setPreviewMode(false)} className="mb-4" variant="secondary">Back to Editor</Button>
        <div className="border p-4 rounded-md">
           <FormEngine inspectionId="preview-123" template={previewSchema} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
       <div className="flex justify-between items-center mb-6">
         <div>
           <h1 className="text-2xl font-bold">Form Builder</h1>
           <p className="text-muted-foreground">Create inspection checklists for offline use.</p>
         </div>
         <div className="flex gap-2">
           <Button variant="outline" onClick={() => setPreviewMode(true)}>
             <Eye className="mr-2 h-4 w-4" /> Preview
           </Button>
           <Button onClick={saveTemplate}>
             <Save className="mr-2 h-4 w-4" /> Save Template
           </Button>
         </div>
       </div>

       <div className="flex gap-6">
         {/* Toolbox */}
         <Card className="w-64 h-fit">
           <CardHeader>
             <CardTitle className="text-sm">Toolbox</CardTitle>
           </CardHeader>
           <CardContent className="space-y-2">
             <Button variant="outline" className="w-full justify-start" onClick={() => addItem('text')}> Text Input</Button>
             <Button variant="outline" className="w-full justify-start" onClick={() => addItem('select')}> Dropdown</Button>
             <Button variant="outline" className="w-full justify-start" onClick={() => addItem('photo')}> Photo Capture</Button>
             <Button variant="outline" className="w-full justify-start" onClick={() => addItem('signature')}> Signature</Button>
           </CardContent>
         </Card>

         {/* Canvas */}
         <div className="flex-1 space-y-4">
           <Input 
             value={formName} 
             onChange={(e) => setFormName(e.target.value)} 
             className="text-lg font-medium"
           />
           
           <DragDropContext onDragEnd={handleDragEnd}>
             <Droppable droppableId="form-canvas">
               {(provided) => (
                 <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                   {items.map((item, index) => (
                     <Draggable key={item.id} draggableId={item.id} index={index}>
                       {(provided) => (
                         <Card 
                           ref={provided.innerRef}
                           {...provided.draggableProps}
                           className="bg-white"
                         >
                           <CardContent className="p-4 flex items-center gap-4">
                             <div {...provided.dragHandleProps} className="cursor-grab text-gray-400">
                               <GripVertical className="h-5 w-5" />
                             </div>
                             <div className="flex-1">
                               <Input 
                                 value={item.label} 
                                 onChange={(e) => {
                                   const newItems = [...items];
                                   newItems[index].label = e.target.value;
                                   setItems(newItems);
                                 }}
                                 className="font-medium border-transparent hover:border-input focus:border-input"
                               />
                               <span className="text-xs text-muted-foreground ml-2 capitalize">{item.type} Field</span>
                             </div>
                           </CardContent>
                         </Card>
                       )}
                     </Draggable>
                   ))}
                   {provided.placeholder}
                 </div>
               )}
             </Droppable>
           </DragDropContext>
         </div>
       </div>
    </div>
  );
};
