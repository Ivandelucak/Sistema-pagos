-- AlterTable
ALTER TABLE `client` ADD COLUMN `observacionTipo` ENUM('NORMAL', 'ALERTA') NOT NULL DEFAULT 'NORMAL';
