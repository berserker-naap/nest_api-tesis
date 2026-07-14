import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('MESSAGING_CAMPAIGN_READ')
@Index('UQ_MESSAGING_CAMPAIGN_READ_USER', ['idCampaign', 'idUsuario'], {
  unique: true,
})
@Index('IDX_MESSAGING_CAMPAIGN_READ_USER', ['idUsuario', 'readAt'])
export class MessagingCampaignRead extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  idCampaign!: number;

  @Column({ type: 'int' })
  idUsuario!: number;

  @Column({ type: 'nvarchar', length: 100 })
  usuarioLogin!: string;

  @Column({ type: 'datetime' })
  readAt!: Date;
}
