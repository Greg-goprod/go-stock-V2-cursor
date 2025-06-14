import React, { useState, useRef } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ExcelImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

interface ImportRow {
  name: string;
  description: string;
  category: string;
  serial_number: string;
  status: string;
  location: string;
  supplier: string;
  image_url: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [step, setStep] = useState<'upload' | 'validate' | 'import'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Laptop Dell XPS 13',
        description: 'Ordinateur portable Dell XPS 13 avec 16GB RAM',
        category: 'Électronique',
        serial_number: 'DL-XPS-001',
        status: 'available',
        location: 'Bureau principal',
        supplier: 'TechSource Inc.',
        image_url: 'https://images.pexels.com/photos/18105/pexels-photo.jpg'
      },
      {
        name: 'Perceuse électrique',
        description: 'Perceuse sans fil 20V avec batterie',
        category: 'Outils',
        serial_number: 'DW-20V-002',
        status: 'available',
        location: 'Atelier',
        supplier: 'ToolMaster Supply',
        image_url: ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matériel');

    // Ajout des instructions dans une deuxième feuille
    const instructions = [
      { Champ: 'name', Description: 'Nom du matériel (obligatoire)', Exemple: 'Laptop Dell XPS 13' },
      { Champ: 'description', Description: 'Description détaillée (optionnel)', Exemple: 'Ordinateur portable avec 16GB RAM' },
      { Champ: 'category', Description: 'Catégorie du matériel (optionnel)', Exemple: 'Électronique' },
      { Champ: 'serial_number', Description: 'Numéro de série unique (obligatoire)', Exemple: 'DL-XPS-001' },
      { Champ: 'status', Description: 'Statut: available, maintenance, retired', Exemple: 'available' },
      { Champ: 'location', Description: 'Emplacement du matériel (optionnel)', Exemple: 'Bureau principal' },
      { Champ: 'supplier', Description: 'Nom du fournisseur (optionnel)', Exemple: 'TechSource Inc.' },
      { Champ: 'image_url', Description: 'URL de l\'image (optionnel)', Exemple: 'https://example.com/image.jpg' }
    ];

    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    XLSX.writeFile(wb, 'GO-Mat_Modele_Import.xlsx');
    toast.success('Modèle Excel téléchargé');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        toast.error('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
        return;
      }
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const parsedData: ImportRow[] = jsonData.map(row => ({
          name: row.name || '',
          description: row.description || '',
          category: row.category || '',
          serial_number: row.serial_number || '',
          status: row.status || 'available',
          location: row.location || '',
          supplier: row.supplier || '',
          image_url: row.image_url || ''
        }));

        setData(parsedData);
        validateData(parsedData);
        setStep('validate');
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Erreur lors de la lecture du fichier Excel');
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const validateData = (data: ImportRow[]) => {
    const errors: ValidationError[] = [];
    const serialNumbers = new Set<string>();

    data.forEach((row, index) => {
      const rowNumber = index + 1;

      // Validation des champs obligatoires
      if (!row.name.trim()) {
        errors.push({ row: rowNumber, field: 'name', message: 'Le nom est obligatoire' });
      }

      if (!row.serial_number.trim()) {
        errors.push({ row: rowNumber, field: 'serial_number', message: 'Le numéro de série est obligatoire' });
      } else {
        // Vérification des doublons dans le fichier
        if (serialNumbers.has(row.serial_number)) {
          errors.push({ row: rowNumber, field: 'serial_number', message: 'Numéro de série en double dans le fichier' });
        } else {
          serialNumbers.add(row.serial_number);
        }
      }

      // Validation du statut
      const validStatuses = ['available', 'checked-out', 'maintenance', 'retired'];
      if (row.status && !validStatuses.includes(row.status)) {
        errors.push({ row: rowNumber, field: 'status', message: 'Statut invalide. Utilisez: available, checked-out, maintenance, retired' });
      }

      // Validation de l'URL d'image
      if (row.image_url && !isValidUrl(row.image_url)) {
        errors.push({ row: rowNumber, field: 'image_url', message: 'URL d\'image invalide' });
      }
    });

    setValidationErrors(errors);
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error('Veuillez corriger les erreurs avant d\'importer');
      return;
    }

    setIsLoading(true);
    setStep('import');
    let successCount = 0;
    let errorCount = 0;

    try {
      // Récupérer les catégories et fournisseurs existants
      const { data: categories } = await supabase.from('categories').select('id, name');
      const { data: suppliers } = await supabase.from('suppliers').select('id, name');

      const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);
      const supplierMap = new Map(suppliers?.map(s => [s.name, s.id]) || []);

      for (const row of data) {
        try {
          // Préparer les données pour l'insertion
          const equipmentData: any = {
            name: row.name.trim(),
            description: row.description.trim() || null,
            serial_number: row.serial_number.trim(),
            status: row.status || 'available',
            location: row.location.trim() || null,
            image_url: row.image_url.trim() || null
          };

          // Gérer la catégorie
          if (row.category.trim()) {
            let categoryId = categoryMap.get(row.category.trim());
            if (!categoryId) {
              // Créer une nouvelle catégorie
              const { data: newCategory, error: categoryError } = await supabase
                .from('categories')
                .insert([{ name: row.category.trim() }])
                .select()
                .single();

              if (categoryError) throw categoryError;
              categoryId = newCategory.id;
              categoryMap.set(row.category.trim(), categoryId);
            }
            equipmentData.category_id = categoryId;
          }

          // Gérer le fournisseur
          if (row.supplier.trim()) {
            let supplierId = supplierMap.get(row.supplier.trim());
            if (!supplierId) {
              // Créer un nouveau fournisseur
              const { data: newSupplier, error: supplierError } = await supabase
                .from('suppliers')
                .insert([{ name: row.supplier.trim() }])
                .select()
                .single();

              if (supplierError) throw supplierError;
              supplierId = newSupplier.id;
              supplierMap.set(row.supplier.trim(), supplierId);
            }
            equipmentData.supplier_id = supplierId;
          }

          // Insérer l'équipement
          const { error: equipmentError } = await supabase
            .from('equipment')
            .insert([equipmentData]);

          if (equipmentError) {
            console.error(`Error importing row ${data.indexOf(row) + 1}:`, equipmentError);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing row ${data.indexOf(row) + 1}:`, error);
          errorCount++;
        }
      }

      setImportResults({ success: successCount, errors: errorCount });
      
      if (successCount > 0) {
        toast.success(`${successCount} équipements importés avec succès`);
        if (onImportComplete) {
          onImportComplete();
        }
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} erreurs lors de l'import`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erreur lors de l\'import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setData([]);
    setValidationErrors([]);
    setImportResults({ success: 0, errors: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Excel - Matériel"
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 'upload' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="ml-2">Fichier</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center ${step === 'validate' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'validate' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="ml-2">Validation</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center ${step === 'import' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'import' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="ml-2">Import</span>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Import de matériel depuis Excel
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Téléchargez le modèle Excel, remplissez-le avec vos données, puis importez-le.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                icon={<Download size={18} />}
                onClick={downloadTemplate}
              >
                Télécharger le modèle Excel
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
              <div className="text-center">
                <Upload size={32} className="mx-auto text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    Glissez-déposez votre fichier Excel ici ou
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Lecture du fichier...' : 'Sélectionner un fichier'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Formats supportés: .xlsx, .xls
                </p>
              </div>
            </div>

            {file && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center">
                  <FileSpreadsheet size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
                  <span className="text-blue-800 dark:text-blue-200 font-medium">{file.name}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Validation */}
        {step === 'validate' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Validation des données
              </h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {data.length} lignes trouvées
                </span>
                {validationErrors.length === 0 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle size={16} className="mr-1" />
                    <span className="text-sm">Validation réussie</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <AlertCircle size={16} className="mr-1" />
                    <span className="text-sm">{validationErrors.length} erreurs</span>
                  </div>
                )}
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  Erreurs de validation
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 dark:text-red-300">
                      Ligne {error.row}, champ "{error.field}": {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nom</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">N° Série</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Catégorie</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Emplacement</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.slice(0, 50).map((row, index) => {
                      const rowErrors = validationErrors.filter(e => e.row === index + 1);
                      const hasErrors = rowErrors.length > 0;
                      
                      return (
                        <tr key={index} className={hasErrors ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {row.name}
                            {rowErrors.some(e => e.field === 'name') && (
                              <AlertCircle size={14} className="inline ml-1 text-red-500" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {row.serial_number}
                            {rowErrors.some(e => e.field === 'serial_number') && (
                              <AlertCircle size={14} className="inline ml-1 text-red-500" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{row.category}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {row.status}
                            {rowErrors.some(e => e.field === 'status') && (
                              <AlertCircle size={14} className="inline ml-1 text-red-500" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{row.location}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {data.length > 50 && (
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  ... et {data.length - 50} autres lignes
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
              >
                Retour
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={validationErrors.length > 0 || isLoading}
              >
                Importer {data.length} équipements
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Import Results */}
        {step === 'import' && (
          <div className="space-y-6">
            <div className="text-center">
              {isLoading ? (
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Import en cours...
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Veuillez patienter pendant l'import des données.
                  </p>
                </div>
              ) : (
                <div>
                  <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Import terminé
                  </h3>
                  <div className="space-y-2">
                    <p className="text-green-600 dark:text-green-400">
                      ✓ {importResults.success} équipements importés avec succès
                    </p>
                    {importResults.errors > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        ✗ {importResults.errors} erreurs lors de l'import
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isLoading && (
              <div className="flex justify-center">
                <Button
                  variant="primary"
                  onClick={handleClose}
                >
                  Fermer
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExcelImport;