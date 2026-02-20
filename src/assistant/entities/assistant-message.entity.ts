import { Audit } from 'src/common/entity/audit';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssistantMessageRole } from '../enum/assistant.enum';
import { AssistantSession } from './assistant-session.entity';

@Entity('ASSISTANT_MESSAGE')
@Index('IDX_ASSISTANT_MESSAGE_SESSION_FECHA', ['session', 'fechaRegistro'])
export class AssistantMessage extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AssistantSession, { nullable: false })
  @JoinColumn({ name: 'idSession' })
  session!: AssistantSession;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @Column({ type: 'nvarchar', length: 20 })
  rol!: AssistantMessageRole;

  @Column({ type: 'nvarchar', length: 'MAX' })
  contenido!: string;

  @Column({ type: 'bit', default: false })
  fueraDeDominio!: boolean;

  @Column({ type: 'nvarchar', length: 80, nullable: true })
  herramienta!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  herramientaPayload!: string | null;

  @Column({ type: 'int', nullable: true })
  inputTokens!: number | null;

  @Column({ type: 'int', nullable: true })
  outputTokens!: number | null;

  @Column({ type: 'int', nullable: true })
  totalTokens!: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  costoUsd!: number | null;

  @Column({ type: 'int', nullable: true })
  latenciaMs!: number | null;
}
