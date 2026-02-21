import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class WhatsappConversationSessionService implements OnModuleDestroy {
  private readonly pendingCloseByPhone = new Map<string, NodeJS.Timeout>();

  onModuleDestroy(): void {
    for (const timeout of this.pendingCloseByPhone.values()) {
      clearTimeout(timeout);
    }
    this.pendingCloseByPhone.clear();
  }

  consumePendingClose(phone: string): boolean {
    const current = this.pendingCloseByPhone.get(phone);
    if (!current) {
      return false;
    }
    clearTimeout(current);
    this.pendingCloseByPhone.delete(phone);
    return true;
  }

  schedulePendingClose(
    phone: string,
    inactivityMinutes: number,
    onTimeout: () => Promise<void>,
  ): void {
    this.consumePendingClose(phone);

    const timeoutMs = Math.max(1, inactivityMinutes) * 60 * 1000;
    const timeout = setTimeout(() => {
      this.executeOnTimeout(phone, timeout, onTimeout).catch((error) => {
        console.error('Error ejecutando cierre por inactividad de WhatsApp:', error);
      });
    }, timeoutMs);

    this.pendingCloseByPhone.set(phone, timeout);
  }

  private async executeOnTimeout(
    phone: string,
    expectedTimeout: NodeJS.Timeout,
    onTimeout: () => Promise<void>,
  ): Promise<void> {
    const current = this.pendingCloseByPhone.get(phone);
    if (!current || current !== expectedTimeout) {
      return;
    }

    this.pendingCloseByPhone.delete(phone);
    await onTimeout();
  }
}

