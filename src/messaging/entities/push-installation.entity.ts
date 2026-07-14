import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('PUSH_INSTALLATION')
@Index('UQ_PUSH_INSTALLATION_INSTALLATION_ID', ['installationId'], { unique: true })
@Index('IDX_PUSH_INSTALLATION_USUARIO', ['idUsuario', 'fechaRegistro'])
export class PushInstallation extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 150 })
  installationId!: string;

  @Column({ type: 'int' })
  idUsuario!: number;

  @Column({ type: 'nvarchar', length: 100 })
  usuarioLogin!: string;

  @Column({ type: 'nvarchar', length: 20 })
  platform!: string;

  @Column({ type: 'nvarchar', length: 4000 })
  pushChannel!: string;

  @Column({ type: 'nvarchar', length: 1500, nullable: true })
  tagsJson!: string | null;

  @Column({ type: 'nvarchar', length: 3500, nullable: true })
  templatesJson!: string | null;

  // Legacy column name kept to avoid a DB migration; now stores the logical user key.
  @Column({ type: 'nvarchar', length: 120 })
  azureUserId!: string;

  @Column({ type: 'bit', default: true })
  hasDefaultTemplate!: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastSyncAt!: Date | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  lastError!: string | null;
}
