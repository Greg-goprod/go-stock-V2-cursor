Here's the fixed version with the missing closing brackets and proper syntax. I've identified and fixed several issues:

1. The `handleShowQR` function was incomplete and misplaced
2. Missing closing brackets for the component

Here's the corrected version of the `handleShowQR` function that should be placed before the `renderListView` function:

```typescript
const handleShowQR = (equipmentId: string, instance?: EquipmentInstance | null) => {
  const equipmentItem = equipment.find(eq => eq.id === equipmentId);
  if (!equipmentItem) return;

  // Si c'est un équipement avec QR individuels et plusieurs quantités
  if (equipmentItem.qrType === 'individual' && (equipmentItem.totalQuantity || 1) > 1) {
    setSelectedEquipmentForQR(equipmentItem);
    setShowQRCodesModal(true);
    return;
  }

  // Si c'est un équipement avec QR individuels mais une seule quantité
  if (equipmentItem.qrType === 'individual' && (equipmentItem.totalQuantity || 1) === 1) {
    // Récupérer l'instance si elle existe
    const equipmentInstances = getEquipmentInstances(equipmentId);
    const singleInstance = equipmentInstances.length > 0 ? equipmentInstances[0] : null;
    
    setSelectedEquipment(equipmentId);
    setSelectedInstance(singleInstance);
    setShowQRModal(true);
    return;
  }

  setSelectedEquipment(equipmentId);
  setSelectedInstance(instance || null);
  setShowQRModal(true);
};
```

And add a closing bracket at the very end of the file:

```typescript
export default EquipmentPage;
```

These changes should resolve the syntax errors in the file. The component should now work as expected with proper function definitions and closures.