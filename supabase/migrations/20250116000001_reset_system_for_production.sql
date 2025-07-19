/*
  # Remise à zéro du système pour mise en production et modification du champ email

  1. Suppression complète des données transactionnelles
    - Tous les emprunts et historique (checkouts)
    - Tous les bons de livraison (delivery_notes) 
    - Toutes les maintenances (equipment_maintenance)
    - Toutes les instances d'équipement (equipment_instances)

  2. Remise en disponibilité de tout le matériel
    - available_quantity = total_quantity
    - status = 'available'
    - last_maintenance = NULL

  3. Conservation des données de référence
    - Utilisateurs, départements, catégories, fournisseurs
    - Équipements de base (nom, description, etc.)
    - Configurations système

a  4. Modification des champs email et department
    - Rendre les champs email et department nullables dans la table users
    - Permettre l'ajout de contacts sans email et sans département

  ⚠️ ATTENTION: Cette migration supprime définitivement toutes les données d'emprunt et de maintenance !
*/

-- 1. SUPPRESSION DES DONNÉES TRANSACTIONNELLES
-- Supprimer les données dans l'ordre pour respecter les contraintes de clés étrangères

-- Supprimer tous les emprunts (checkouts)
DELETE FROM checkouts;

-- Supprimer tous les bons de livraison (delivery_notes)
DELETE FROM delivery_notes;

-- Supprimer toutes les maintenances (equipment_maintenance)
DELETE FROM equipment_maintenance;

-- Supprimer toutes les instances d'équipement (equipment_instances)
DELETE FROM equipment_instances;

-- 2. REMISE EN DISPONIBILITÉ DE TOUT LE MATÉRIEL
-- Remettre tous les équipements disponibles
UPDATE equipment
SET 
  status = 'available',
  available_quantity = total_quantity,
  last_maintenance = NULL;

-- 3. RÉINITIALISATION DES COMPTEURS ET SEQUENCES
-- Réinitialiser les séquences si elles existent
DO $$
DECLARE
  seq_name TEXT;
BEGIN
  -- Réinitialiser la séquence des bons de livraison si elle existe
  FOR seq_name IN 
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_name LIKE '%delivery_note%' OR sequence_name LIKE '%bon%'
  LOOP
    EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
  END LOOP;
END $$;

-- 4. NETTOYAGE DU CACHE ET NOTIFICATIONS
-- Supprimer les notifications stockées dans system_settings si elles existent
DELETE FROM system_settings WHERE id LIKE '%notification%' OR id LIKE '%cache%';

-- Ajouter un paramètre pour marquer la date de remise à zéro
INSERT INTO system_settings (id, value, description)
VALUES ('system_reset_date', NOW()::text, 'Date de remise à zéro du système pour la production')
ON CONFLICT (id) DO UPDATE
SET 
  value = NOW()::text, 
  updated_at = NOW(),
  description = 'Date de remise à zéro du système pour la production';

-- 5. METTRE À JOUR LES STATISTIQUES
-- Mettre à jour les statistiques des tables pour optimiser les performances
ANALYZE equipment;
ANALYZE checkouts;
ANALYZE delivery_notes;
ANALYZE equipment_maintenance;
ANALYZE equipment_instances; 

-- 6. RENDRE LES CHAMPS EMAIL ET DEPARTMENT NULLABLES DANS LA TABLE USERS
-- Modification pour permettre l'ajout de contacts sans email et sans département
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN department DROP NOT NULL;

-- Mettre à jour les index si nécessaire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'users_email_idx'
  ) THEN
    DROP INDEX IF EXISTS users_email_idx;
    CREATE INDEX users_email_idx ON users (email) WHERE email IS NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'users_department_idx' OR indexname = 'idx_users_department'
  ) THEN
    DROP INDEX IF EXISTS users_department_idx;
    DROP INDEX IF EXISTS idx_users_department;
    CREATE INDEX users_department_idx ON users (department) WHERE department IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN users.email IS 'Adresse email du contact (optionnelle)';
COMMENT ON COLUMN users.department IS 'Département du contact (optionnel)'; 