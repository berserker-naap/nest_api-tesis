import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('PUSH_NOTIFICATION_LOG')
@Index('IDX_PUSH_LOG_USUARIO_FECHA', ['idUsuario', 'fechaRegistro'])
@Index('UQ_PUSH_LOG_PROVIDER_MESSAGE', ['provider', 'providerMessageId'], {
  unique: true,
  where: '[providerMessageId] IS NOT NULL',
})
export class PushNotificationLog extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 30 })
  status!: string;

  @Column({ type: 'nvarchar', length: 60 })
  provider!: string;

  @Column({ type: 'nvarchar', length: 20 })
  platform!: string;

  @Column({ type: 'nvarchar', length: 30 })
  format!: string;

  @Column({ type: 'nvarchar', length: 500 })
  targetExpression!: string;

  @Column({ type: 'nvarchar', length: 120, nullable: true })
  title!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  messagePreview!: string | null;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  providerMessageId!: string | null;

  @Column({ type: 'int', nullable: true })
  idUsuario!: number | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  usuarioLogin!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  detail!: string | null;

  @Column({ type: 'nvarchar', length: 3500, nullable: true })
  payloadJson!: string | null;
}

