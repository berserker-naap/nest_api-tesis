import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSign } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PushPlatform } from '../enums/push-platform.enum';

type FirebaseAccessToken = {
  value: string;
  expiresAt: number;
};

type FirebaseSendResult = {
  provider: string;
  providerMessageId: string | null;
  status: string;
  detail?: string | null;
  errorCode?: string | null;
};

type FirebaseMessagePayload = {
  token: string;
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority?: 'high' | 'normal';
    notification?: {
      sound?: string;
    };
  };
  apns?: {
    headers?: Record<string, string>;
    payload?: {
      aps: {
        sound?: string;
        badge?: number;
        alert?:
          | string
          | {
              title?: string;
              body?: string;
            };
      };
    };
  };
};

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

@Injectable()
export class FirebasePushService {
  private readonly providerName = 'FIREBASE_CLOUD_MESSAGING';
  private accessTokenCache: FirebaseAccessToken | null = null;
  private serviceAccountCache: FirebaseServiceAccount | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendToToken(
    token: string,
    platform: PushPlatform,
    payload: {
      title?: string | null;
      message: string;
      deepLink?: string | null;
      badge?: number;
      sound?: string | null;
      data?: Record<string, string>;
    },
  ): Promise<FirebaseSendResult> {
    const projectId = this.getProjectId();
    const accessToken = await this.getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
      projectId,
    )}/messages:send`;

    const message = this.buildMessage(token, platform, payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        message,
      }),
    });

    const raw = await response.text();
    const parsed = this.tryParseJson(raw);

    if (!response.ok) {
      return {
        provider: this.providerName,
        providerMessageId: null,
        status: 'FAILED',
        detail: this.extractFirebaseErrorMessage(parsed, raw),
        errorCode: this.extractFirebaseErrorCode(parsed),
      };
    }

    return {
      provider: this.providerName,
      providerMessageId: this.extractFirebaseMessageId(parsed),
      status: String(response.status),
      detail: null,
      errorCode: null,
    };
  }

  private buildMessage(
    token: string,
    platform: PushPlatform,
    payload: {
      title?: string | null;
      message: string;
      deepLink?: string | null;
      badge?: number;
      sound?: string | null;
      data?: Record<string, string>;
    },
  ): FirebaseMessagePayload {
    const notification = payload.title?.trim()
      ? {
          title: payload.title.trim(),
          body: payload.message.trim(),
        }
      : {
          body: payload.message.trim(),
        };

    const data = Object.entries({
      title: payload.title?.trim() ?? '',
      message: payload.message.trim(),
      deepLink: payload.deepLink?.trim() ?? '',
      ...(payload.data ?? {}),
    }).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value === undefined || value === null ? '' : String(value);
      return acc;
    }, {});

    const sound = payload.sound?.trim() || 'default';

    return {
      token,
      notification,
      data,
      android: {
        priority: 'high',
        notification: {
          sound,
        },
      },
      apns: {
        headers:
          platform === PushPlatform.APNS
            ? {
                'apns-priority': '10',
              }
            : undefined,
        payload: {
          aps: {
            sound,
            badge: payload.badge,
            alert: payload.title?.trim()
              ? {
                  title: payload.title.trim(),
                  body: payload.message.trim(),
                }
              : payload.message.trim(),
          },
        },
      },
    };
  }

  private async getAccessToken(): Promise<string> {
    if (
      this.accessTokenCache &&
      this.accessTokenCache.expiresAt > Date.now() + 60_000
    ) {
      return this.accessTokenCache.value;
    }

    const serviceAccount = this.getServiceAccount();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600;

    const header = this.toBase64Url(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    );
    const payload = this.toBase64Url(
      JSON.stringify({
        iss: serviceAccount.clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: expiresAt,
      }),
    );

    const unsignedToken = `${header}.${payload}`;
    const signature = createSign('RSA-SHA256')
      .update(unsignedToken)
      .sign(serviceAccount.privateKey, 'base64url');

    const assertion = `${unsignedToken}.${signature}`;

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `No se pudo obtener access token de Firebase (${response.status})`,
      );
    }

    const tokenResponse = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!tokenResponse.access_token) {
      throw new InternalServerErrorException(
        'Firebase no devolvio access token',
      );
    }

    this.accessTokenCache = {
      value: tokenResponse.access_token,
      expiresAt: Date.now() + Number(tokenResponse.expires_in ?? 3600) * 1000,
    };

    return tokenResponse.access_token;
  }

  private getProjectId(): string {
    return this.getServiceAccount().projectId;
  }

  private getServiceAccount(): FirebaseServiceAccount {
    if (this.serviceAccountCache) {
      return this.serviceAccountCache;
    }

    const serviceAccountPath =
      this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH')?.trim() ||
      '';

    if (serviceAccountPath) {
      this.serviceAccountCache =
        this.readServiceAccountFromFile(serviceAccountPath);
      return this.serviceAccountCache;
    }

    this.serviceAccountCache = {
      projectId: this.getRequiredConfig('FIREBASE_PROJECT_ID'),
      clientEmail: this.getRequiredConfig('FIREBASE_CLIENT_EMAIL'),
      privateKey: this.normalizePrivateKey(
        this.getRequiredConfig('FIREBASE_PRIVATE_KEY'),
      ),
    };

    return this.serviceAccountCache;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`Falta configuracion ${key}`);
    }
    return value;
  }

  private readServiceAccountFromFile(
    serviceAccountPath: string,
  ): FirebaseServiceAccount {
    const resolvedPath = resolve(process.cwd(), serviceAccountPath);
    if (!existsSync(resolvedPath)) {
      throw new InternalServerErrorException(
        `No existe FIREBASE_SERVICE_ACCOUNT_PATH en ${resolvedPath}`,
      );
    }

    let parsed: {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    } | null = null;

    try {
      parsed = JSON.parse(readFileSync(resolvedPath, 'utf8')) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
    } catch {
      throw new InternalServerErrorException(
        `No se pudo leer el JSON de Firebase en ${resolvedPath}`,
      );
    }

    const projectId = parsed?.project_id?.trim() || '';
    const clientEmail = parsed?.client_email?.trim() || '';
    const privateKey = this.normalizePrivateKey(parsed?.private_key ?? '');

    if (!projectId || !clientEmail || !privateKey) {
      throw new InternalServerErrorException(
        `El archivo ${resolvedPath} no contiene project_id, client_email o private_key validos`,
      );
    }

    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  private normalizePrivateKey(value: string): string {
    return String(value ?? '').replace(/\\n/g, '\n').trim();
  }

  private toBase64Url(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private extractFirebaseMessageId(payload: unknown): string | null {
    const result = payload as { name?: string };
    return result?.name?.trim() || null;
  }

  private extractFirebaseErrorMessage(
    payload: unknown,
    raw: string,
  ): string {
    const result = payload as {
      error?: {
        message?: string;
      };
    };

    return result?.error?.message?.trim() || raw || 'firebase_send_failed';
  }

  private extractFirebaseErrorCode(payload: unknown): string | null {
    const result = payload as {
      error?: {
        details?: Array<{
          errorCode?: string;
        }>;
        status?: string;
      };
    };

    return (
      result?.error?.details?.find((item) => item?.errorCode)?.errorCode ??
      result?.error?.status ??
      null
    );
  }
}
