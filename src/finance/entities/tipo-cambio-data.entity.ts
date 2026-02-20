import { Audit } from 'src/common/entity/audit';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('TIPO_CAMBIO_DATA')
@Index('IDX_TIPO_CAMBIO_DATA_FECHA', ['fechaConsulta'])
export class TipoCambioData extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  fechaConsulta!: string;

  @Column({ type: 'nvarchar', length: 10, default: 'USD' })
  monedaOrigen!: string;

  @Column({ type: 'nvarchar', length: 10, default: 'PEN' })
  monedaDestino!: string;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  tasaOrigenADestino!: number;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  tasaDestinoAOrigen!: number;

  @Column({ type: 'nvarchar', length: 120 })
  fuente!: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  proveedorBase!: string | null;

  @Column({ type: 'date', nullable: true })
  fechaProveedor!: string | null;

  @Column({ type: 'datetime', nullable: true })
  fechaHoraProveedor!: Date | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  payloadProveedor!: string | null;
}
