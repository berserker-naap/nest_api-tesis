import { Audit } from 'src/common/entity/audit';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Accion } from './accion.entity';
import { Opcion } from './opcion.entity';
import { Rol } from './rol.entity';

@Entity('PERMISO')
export class Permiso extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'idRol' })
  rol!: Rol;

  @ManyToOne(() => Opcion)
  @JoinColumn({ name: 'idOpcion' })
  opcion!: Opcion;

  @ManyToOne(() => Accion)
  @JoinColumn({ name: 'idAccion' })
  accion!: Accion;

}
