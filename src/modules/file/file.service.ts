import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { UploadOptions } from 'utils/interfaces/upload-options.interface';

import sharp, { ResizeOptions } from 'sharp';
import * as fs from 'fs/promises';
import { join } from 'path';
import { AppLogger } from 'utils/common/logger/logger.service';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly logger: AppLogger,
  ) {}

  async upload(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<File> {
    this.validate(file, options);

    if (options.resize) {
      await this.resize(file, options.resize);
    }

    try {
      const entity = this.fileRepository.create({
        url: `/${file.path.replace(/\\/g, '/')}`,
      });
      return await this.fileRepository.save(entity);
    } catch {
      throw new InternalServerErrorException('Failed to save file metadata');
    }
  }

  async uploadMany(
    files: Express.Multer.File[],
    options: UploadOptions,
  ): Promise<File[]> {
    return Promise.all(files.map((file) => this.upload(file, options)));
  }

  private async resize(
    file: Express.Multer.File,
    options: ResizeOptions,
  ): Promise<void> {
    const buffer = await sharp(file.path)
      .resize(options.width, options.height, { fit: options.fit ?? 'cover' })
      .toBuffer();

    await fs.writeFile(file.path, buffer);
  }

  private validate(file: Express.Multer.File, options: UploadOptions): void {
    if (!options.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed: ${options.allowedMimes.join(', ')}`,
      );
    }
    if (file.size > options.maxSize) {
      throw new BadRequestException(
        `File too large. Max: ${options.maxSize / 1024 / 1024}MB`,
      );
    }
  }
  async delete(id: number): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id } });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    const filePath = join(process.cwd(), file.url);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.error(`Failed to delete physical file: ${filePath}`, error);
    }

    await this.fileRepository.remove(file);
  }
}
