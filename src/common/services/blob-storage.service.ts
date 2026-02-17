import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { extname } from 'path';

@Injectable()
export class BlobStorageService {
  constructor(private readonly configService: ConfigService) {}

  async uploadProfileImage(
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
    usuarioId: number,
    documentoIdentidad: string | null,
  ): Promise<{ blobName: string; url: string }> {
    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    const containerName =
      this.configService.get<string>('AZURE_STORAGE_CONTAINER_PROFILE') ??
      this.configService.get<string>('AZURE_STORAGE_CONTAINER');

    if (!connectionString || !containerName) {
      throw new InternalServerErrorException('Azure Blob Storage no está configurado');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobName = this.buildProfileBlobName(
      usuarioId,
      documentoIdentidad,
      originalName,
      mimeType,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
      },
    });

    return {
      blobName,
      url: blockBlobClient.url,
    };
  }

  async getProfileImageReadUrl(blobName: string): Promise<string> {
    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    const containerName =
      this.configService.get<string>('AZURE_STORAGE_CONTAINER_PROFILE') ??
      this.configService.get<string>('AZURE_STORAGE_CONTAINER');
    const expiresInMinutes = Number(
      this.configService.get<string>('AZURE_STORAGE_SAS_EXPIRES_MINUTES') ?? '60',
    );

    if (!connectionString || !containerName) {
      throw new InternalServerErrorException('Azure Blob Storage no está configurado');
    }

    const accountName = this.extractConnectionValue(connectionString, 'AccountName');
    const accountKey = this.extractConnectionValue(connectionString, 'AccountKey');

    if (!accountName || !accountKey) {
      throw new InternalServerErrorException(
        'No se pudo generar SAS: faltan credenciales de cuenta de storage',
      );
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const blobClient = blobServiceClient.getContainerClient(containerName).getBlockBlobClient(blobName);
    const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(Date.now() - 5 * 60 * 1000),
        expiresOn,
      },
      sharedKeyCredential,
    ).toString();

    return `${blobClient.url}?${sasToken}`;
  }

  private buildProfileBlobName(
    usuarioId: number,
    documentoIdentidad: string | null,
    originalName: string,
    mimeType: string,
  ): string {
    const extension = this.resolveExtension(originalName, mimeType);
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = Date.now();
    const documentoSegment = this.sanitizeSegment(documentoIdentidad ?? 'sin-documento');

    return `profiles/${usuarioId}/${documentoSegment}_${datePart}_${timestamp}${extension}`;
  }

  private resolveExtension(originalName: string, mimeType: string): string {
    const normalizedExtension = extname(originalName ?? '').toLowerCase();
    if (normalizedExtension) {
      return normalizedExtension;
    }

    if (mimeType === 'image/jpeg') return '.jpg';
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    if (mimeType === 'image/gif') return '.gif';

    return '';
  }

  private extractConnectionValue(connectionString: string, key: string): string | null {
    const pairs = connectionString.split(';').map((segment) => segment.trim());
    const prefix = `${key}=`;
    const value = pairs.find((segment) => segment.startsWith(prefix))?.slice(prefix.length);

    return value && value.length > 0 ? value : null;
  }

  private sanitizeSegment(value: string): string {
    const normalized = value.trim().toLowerCase();
    const safe = normalized.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    return safe.length > 0 ? safe : 'sin-documento';
  }
}
