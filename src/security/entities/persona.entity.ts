import { Audit } from 'src/common/entity/audit';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('PERSONA')
export class Persona extends Audit{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 100 })
  nombre: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  apellido: string;

  @Column({ nullable: true })
  idTipoDocumentoIdentidad: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  documentoIdentidad: string;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: Date;
}
