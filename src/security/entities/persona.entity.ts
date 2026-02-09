import { Audit } from 'src/common/entity/audit';
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';

@Entity('PERSONA')
export class Persona extends Audit{
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 100 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  apellido!: string | null;

  @ManyToOne(() => Multitabla)
  @JoinColumn({ name: 'idTipoDocumentoIdentidad' })
  tipoDocumento!: Multitabla;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  documentoIdentidad!: string | null;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento!: Date  | null;
}
