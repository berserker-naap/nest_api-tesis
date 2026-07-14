import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('MESSAGING_CAMPAIGN')
@Index('IDX_MESSAGING_CAMPAIGN_STATUS_SENT', ['status', 'sentAt'])
@Index('IDX_MESSAGING_CAMPAIGN_IN_APP', ['publishInApp', 'status', 'sentAt'])
export class MessagingCampaign extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 30, default: 'ALL_USERS' })
  scope!: string;

  @Column({ type: 'nvarchar', length: 120 })
  title!: string;

  @Column({ type: 'nvarchar', length: 500 })
  message!: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  deepLink!: string | null;

  @Column({ type: 'bit', default: true })
  sendPush!: boolean;

  @Column({ type: 'bit', default: true })
  publishInApp!: boolean;

  @Column({ type: 'nvarchar', length: 20, default: 'DRAFT' })
  status!: string;

  @Column({ type: 'datetime', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  pushStatus!: string | null;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  pushProviderMessageId!: string | null;

  @Column({ type: 'nvarchar', length: 3500, nullable: true })
  metadataJson!: string | null;
}
