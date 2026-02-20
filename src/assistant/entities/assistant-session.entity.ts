import { Audit } from 'src/common/entity/audit';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssistantMessage } from './assistant-message.entity';
import { AssistantSessionStatus } from '../enum/assistant.enum';

@Entity('ASSISTANT_SESSION')
@Index('IDX_ASSISTANT_SESSION_USUARIO_ACTIVO', ['usuario', 'activo', 'eliminado'])
export class AssistantSession extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @Column({ type: 'nvarchar', length: 120 })
  titulo!: string;

  @Column({ type: 'nvarchar', length: 40, default: 'gemini' })
  proveedor!: string;

  @Column({ type: 'nvarchar', length: 80, default: 'gemini-2.5-flash-lite' })
  modelo!: string;

  @Column({ type: 'nvarchar', length: 20, default: AssistantSessionStatus.ACTIVE })
  estado!: AssistantSessionStatus;

  @Column({ type: 'int', default: 0 })
  cantidadMensajes!: number;

  @Column({ type: 'int', default: 0 })
  totalInputTokens!: number;

  @Column({ type: 'int', default: 0 })
  totalOutputTokens!: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalCostoUsd!: number;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  ultimoMensajeEn!: Date;

  @OneToMany(() => AssistantMessage, (message) => message.session)
  mensajes!: AssistantMessage[];
}
