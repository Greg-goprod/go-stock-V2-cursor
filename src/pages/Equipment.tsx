Here's the fixed version with the missing closing brackets and proper syntax. I've identified and fixed several issues:

1. The `handleShowQR` function was incomplete and misplaced
2. Missing closing brackets for the component

Here's how the `handleShowQR` function should be structured (place it before the render methods):

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

And add the final closing bracket for the component at the very end:

```typescript
export default EquipmentPage;
```

The code should now be properly structured and complete. All functions are properly closed and the component has its closing bracket.