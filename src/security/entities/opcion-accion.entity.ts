import { Audit } from 'src/common/entity/audit';
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Opcion } from './opcion.entity';
import { Accion } from './accion.entity';

@Entity('OPCION_ACCION')
export class OpcionAccion extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Opcion)
  @JoinColumn({ name: 'idOpcion' })
  opcion: Opcion;

  @ManyToOne(() => Accion)
  @JoinColumn({ name: 'idAccion' })
  accion: Accion;
}