-- CreateTable
CREATE TABLE `Drawing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `strokeId` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `opacity` INTEGER NOT NULL,
    `size` INTEGER NOT NULL,
    `beginPointX` DOUBLE NOT NULL,
    `beginPointY` DOUBLE NOT NULL,
    `ctrlPointX` DOUBLE NOT NULL,
    `ctrlPointY` DOUBLE NOT NULL,
    `endPointX` DOUBLE NOT NULL,
    `endPointY` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
