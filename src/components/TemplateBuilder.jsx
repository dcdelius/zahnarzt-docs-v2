import { useState, useEffect } from 'react';

export default function TemplateBuilder({ template, onChange }) {
  const [content, setContent] = useState(template?.Text || '');
  
  // Sync content when template.Text changes
  useEffect(() => {
    if (template?.Text !== undefined) {
      setContent(template.Text);
    }
  }, [template?.Text]);
  
  const handleContentChange = (newContent) => {
    setContent(newContent);
    onChange?.({ ...template, Text: newContent });
  };



  return (
    <div className="space-y-6">
      {/* Editor */}
      <div className="space-y-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm p-4">
          <textarea
            id="template-textarea"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Geben Sie hier Ihre Vorlage ein..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/90 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[500px] font-mono text-sm"
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
} 