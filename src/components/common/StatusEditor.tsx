import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from './Button';
import { Pencil, Save, X } from 'lucide-react';

interface StatusEditorProps {
  id: string;
  name: string;
  onSave: (id: string, newName: string) => void;
}

const StatusEditor: React.FC<StatusEditorProps> = ({ id, name, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const { t } = useLanguage();

  const handleSave = () => {
    if (editedName.trim()) {
      onSave(id, editedName.trim());
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-900 dark:text-gray-100">{name}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={editedName}
        onChange={(e) => setEditedName(e.target.value)}
        className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
        autoFocus
      />
      <Button
        variant="success"
        size="sm"
        icon={<Save size={14} />}
        onClick={handleSave}
      />
      <Button
        variant="danger"
        size="sm"
        icon={<X size={14} />}
        onClick={() => setIsEditing(false)}
      />
    </div>
  );
};

export default StatusEditor;