-- Migration: Discord + vNERCAP Authentication
-- Adds discordId and rank fields, removes rating and isVisitor

ALTER TABLE `user` ADD COLUMN `discordId` varchar(32);
ALTER TABLE `user` ADD COLUMN `rank` text;
ALTER TABLE `user` DROP COLUMN `rating`;
ALTER TABLE `user` DROP COLUMN `isVisitor`;
