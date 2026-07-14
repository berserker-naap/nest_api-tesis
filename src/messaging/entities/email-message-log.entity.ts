import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('EMAIL_MESSAGE_LOG')
@Index('IDX_EMAIL_LOG_USUARIO_FECHA', ['idUsuario', 'fechaRegistro'])
@Index('UQ_EMAIL_LOG_PROVIDER_MESSAGE', ['provider', 'providerMessageId'], {
  unique: true,
  where: '[providerMessageId] IS NOT NULL',
})
export class EmailMessageLog extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 30 })
  status!: string;

  @Column({ type: 'nvarchar', length: 60 })
  provider!: string;

  @Column({ type: 'nvarchar', length: 320 })
  senderAddress!: string;

  @Column({ type: 'nvarchar', length: 1500 })
  recipientsSummary!: string;

  @Column({ type: 'nvarchar', length: 255 })
  subject!: string;

  @Column({ type: 'nvarchar', length: 60, nullable: true })
  templateCode!: string | null;

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
