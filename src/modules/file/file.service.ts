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

import sharp from 'sharp';
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

    if (options.resize || options.convert) {
      await this.process(file, options);
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

  private async process(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<void> {
    let pipeline = sharp(file.path);

    if (options.resize) {
      pipeline = pipeline.resize(options.resize.width, options.resize.height, {
        fit: options.resize.fit ?? 'cover',
      });
    }

    if (options.convert) {
      const { format, quality } = options.convert;
      pipeline = pipeline[format]({ quality: quality ?? 80 });
    }

    const buffer = await pipeline.toBuffer();

    if (options.convert) {
      const oldPath = file.path;
      const newPath = oldPath.replace(/\.[^.]+$/, `.${options.convert.format}`);

      await fs.writeFile(newPath, buffer);
      file.path = newPath;

      try {
        await fs.unlink(oldPath);
      } catch (error) {
        this.logger.warn(`Failed to delete old file: ${oldPath}`);
      }
    } else {
      await fs.writeFile(file.path, buffer);
    }
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
