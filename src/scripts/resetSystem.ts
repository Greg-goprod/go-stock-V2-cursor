import { supabase } from '../lib/supabase';

/**
 * Script de remise à zéro du système pour la production
 * 
 * ⚠️ ATTENTION: Ce script supprime définitivement toutes les données d'emprunt et de maintenance !
 * 
 * Exécute les opérations suivantes:
 * 1. Supprime tous les emprunts (checkouts)
 * 2. Supprime tous les bons de livraison (delivery_notes)
 * 3. Supprime toutes les maintenances (equipment_maintenance)
 * 4. Supprime toutes les instances d'équipement (equipment_instances)
 * 5. Remet tous les équipements en disponible (available_quantity = total_quantity, status = 'available')
 */

export interface ResetResults {
  deletedCheckouts: number;
  deletedDeliveryNotes: number;
  deletedMaintenances: number;
  deletedInstances: number;
  updatedEquipment: number;
  errors: string[];
}

export async function resetSystemForProduction(): Promise<ResetResults> {
  const results: ResetResults = {
    deletedCheckouts: 0,
    deletedDeliveryNotes: 0,
    deletedMaintenances: 0,
    deletedInstances: 0,
    updatedEquipment: 0,
    errors: []
  };

  // Vérifier que Supabase est configuré
  if (!supabase) {
    results.errors.push('Configuration Supabase invalide. Vérifiez vos variables d\'environnement.');
    return results;
  }

  try {
    console.log('🚀 Début de la remise à zéro du système...');

    // 1. Compter et supprimer tous les emprunts (checkouts)
    console.log('📝 Suppression des emprunts...');
    const { count: checkoutsCount } = await supabase
      .from('checkouts')
      .select('*', { count: 'exact', head: true });
    
    const { error: checkoutsError } = await supabase
      .from('checkouts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprime tout

    if (checkoutsError) {
      results.errors.push(`Erreur lors de la suppression des emprunts: ${checkoutsError.message}`);
    } else {
      results.deletedCheckouts = checkoutsCount || 0;
      console.log(`✅ ${results.deletedCheckouts} emprunts supprimés`);
    }

    // 2. Compter et supprimer tous les bons de livraison (delivery_notes)
    console.log('📦 Suppression des bons de livraison...');
    const { count: deliveryCount } = await supabase
      .from('delivery_notes')
      .select('*', { count: 'exact', head: true });
    
    const { error: deliveryError } = await supabase
      .from('delivery_notes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprime tout

    if (deliveryError) {
      results.errors.push(`Erreur lors de la suppression des bons: ${deliveryError.message}`);
    } else {
      results.deletedDeliveryNotes = deliveryCount || 0;
      console.log(`✅ ${results.deletedDeliveryNotes} bons de livraison supprimés`);
    }

    // 3. Compter et supprimer toutes les maintenances (equipment_maintenance)
    console.log('🔧 Suppression des maintenances...');
    const { count: maintenanceCount } = await supabase
      .from('equipment_maintenance')
      .select('*', { count: 'exact', head: true });
    
    const { error: maintenanceError } = await supabase
      .from('equipment_maintenance')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprime tout

    if (maintenanceError) {
      results.errors.push(`Erreur lors de la suppression des maintenances: ${maintenanceError.message}`);
    } else {
      results.deletedMaintenances = maintenanceCount || 0;
      console.log(`✅ ${results.deletedMaintenances} maintenances supprimées`);
    }

    // 4. Compter et supprimer toutes les instances d'équipement (equipment_instances)
    console.log('🏷️ Suppression des instances d\'équipement...');
    const { count: instancesCount } = await supabase
      .from('equipment_instances')
      .select('*', { count: 'exact', head: true });
    
    const { error: instancesError } = await supabase
      .from('equipment_instances')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprime tout

    if (instancesError) {
      results.errors.push(`Erreur lors de la suppression des instances: ${instancesError.message}`);
    } else {
      results.deletedInstances = instancesCount || 0;
      console.log(`✅ ${results.deletedInstances} instances d'équipement supprimées`);
    }

    // 5. Remettre tous les équipements en disponible
    console.log('📦 Remise en disponibilité de tout le matériel...');
    
    // D'abord, récupérer tous les équipements pour connaître le nombre
    const { data: allEquipment, error: countError } = await supabase
      .from('equipment')
      .select('id, total_quantity');

    if (countError) {
      results.errors.push(`Erreur lors de la lecture des équipements: ${countError.message}`);
    } else {
      // Mettre à jour chaque équipement individuellement pour éviter les problèmes SQL
      for (const equipment of allEquipment || []) {
        const { error: updateError } = await supabase
          .from('equipment')
          .update({
            status: 'available',
            available_quantity: equipment.total_quantity,
            last_maintenance: null
          })
          .eq('id', equipment.id);

        if (updateError) {
          results.errors.push(`Erreur lors de la mise à jour de l'équipement ${equipment.id}: ${updateError.message}`);
        }
      }
      
      results.updatedEquipment = allEquipment?.length || 0;
      console.log(`✅ ${results.updatedEquipment} équipements remis en disponible`);
    }

    // 6. Ajouter un marqueur de date de remise à zéro
    console.log('📅 Ajout du marqueur de remise à zéro...');
    const { error: settingError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'system_reset_date',
        value: new Date().toISOString(),
        description: 'Date de remise à zéro du système pour la production'
      });

    if (settingError) {
      results.errors.push(`Erreur lors de l'ajout du marqueur: ${settingError.message}`);
    } else {
      console.log('✅ Marqueur de remise à zéro ajouté');
    }

    console.log('🎉 Remise à zéro terminée !');
    
    return results;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur fatale lors de la remise à zéro:', error);
    results.errors.push(`Erreur fatale: ${errorMessage}`);
    return results;
  }
}

// Fonction utilitaire pour afficher un rapport détaillé
export function displayResetReport(results: ResetResults): void {
  console.log('\n========== RAPPORT DE REMISE À ZÉRO ==========');
  console.log(`Emprunts supprimés: ${results.deletedCheckouts}`);
  console.log(`Bons de livraison supprimés: ${results.deletedDeliveryNotes}`);
  console.log(`Maintenances supprimées: ${results.deletedMaintenances}`);
  console.log(`Instances d'équipement supprimées: ${results.deletedInstances}`);
  console.log(`Équipements remis en disponible: ${results.updatedEquipment}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️ ERREURS RENCONTRÉES:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ Aucune erreur - Remise à zéro réussie !');
  }
  console.log('=============================================\n');
} 