-- AlterTable
ALTER TABLE `credit` ADD COLUMN `cuotasPagadas` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `cuotasRestantes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `proximoVencimiento` DATETIME(3) NULL;
