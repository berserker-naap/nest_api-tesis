import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('WHATSAPP_MESSAGE_LOG')
@Index('IDX_WA_LOG_PHONE_FECHA', ['phone', 'fechaRegistro'])
@Index('IDX_WA_LOG_USUARIO_FECHA', ['idUsuario', 'fechaRegistro'])
@Index('UQ_WA_LOG_DIRECTION_PROVIDER', ['direction', 'providerMessageId'], {
  unique: true,
  where: '[providerMessageId] IS NOT NULL',
})
export class WhatsappMessageLog extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 3 })
  direction!: 'IN' | 'OUT';

  @Column({ type: 'nvarchar', length: 30 })
  status!: string;

  @Column({ type: 'nvarchar', length: 25 })
  phone!: string;

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  providerMessageId!: string | null;

  @Column({ type: 'int', nullable: true })
  idUsuario!: number | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  usuarioLogin!: string | null;

  @Column({ type: 'int', nullable: true })
  idTransaccion!: number | null;

  @Column({ type: 'nvarchar', length: 1400, nullable: true })
  text!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  detail!: string | null;

  @Column({ type: 'nvarchar', length: 3500, nullable: true })
  payloadJson!: string | null;
}

