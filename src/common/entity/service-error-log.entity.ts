import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Audit } from './audit';

@Entity('SERVICE_ERROR_LOG')
@Index('IDX_SERVICE_ERROR_LOG_FECHA', ['fechaRegistro'])
@Index('IDX_SERVICE_ERROR_LOG_SERVICIO', ['moduleName', 'serviceName', 'methodName'])
export class ServiceErrorLog extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 30 })
  sourceType!: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  moduleName!: string | null;

  @Column({ type: 'nvarchar', length: 120, nullable: true })
  serviceName!: string | null;

  @Column({ type: 'nvarchar', length: 120, nullable: true })
  methodName!: string | null;

  @Column({ type: 'nvarchar', length: 120, nullable: true })
  errorType!: string | null;

  @Column({ type: 'int', nullable: true })
  statusCode!: number | null;

  @Column({ type: 'nvarchar', length: 1500 })
  message!: string;

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  detail!: string | null;

  @Column({ type: 'nvarchar', length: 3500, nullable: true })
  stackTrace!: string | null;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  httpMethod!: string | null;

  @Column({ type: 'nvarchar', length: 350, nullable: true })
  route!: string | null;

  @Column({ type: 'int', nullable: true })
  idUsuario!: number | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  usuarioLogin!: string | null;

  @Column({ type: 'nvarchar', length: 3500, nullable: true })
  payloadJson!: string | null;
}
