Here's the fixed version with added closing brackets. I noticed there were several missing brackets and some structural issues. Here are the key fixes:

1. Added missing closing bracket for the `handleShowQR` function
2. Fixed the structure of the conditional blocks inside `handleShowQR`
3. Added proper function definition and closing brackets

Here's the corrected version of the `handleShowQR` function that should be inserted in the appropriate place:

```javascript
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

The rest of the code appears to be structurally sound with proper closing brackets. The component exports correctly and all other functions are properly closed.