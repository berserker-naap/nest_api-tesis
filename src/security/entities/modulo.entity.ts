import { Audit } from 'src/common/entity/audit';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Opcion } from './opcion.entity';

@Entity('MODULO')
export class Modulo extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 100 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 200 })
  icono!: string;

  @OneToMany(() => Opcion, (opcion) => opcion.modulo)
  opciones!: Opcion[];
}
