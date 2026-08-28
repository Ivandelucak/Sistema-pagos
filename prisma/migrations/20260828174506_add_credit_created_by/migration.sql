-- AlterTable
ALTER TABLE `credit` ADD COLUMN `createdById` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `credit` ADD CONSTRAINT `credit_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
