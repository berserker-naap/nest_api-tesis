import { Audit } from 'src/common/entity/audit';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cuenta } from './cuenta.entity';
import { Usuario } from 'src/security/entities/usuario.entity';

@Entity('MONEDA')
export class Moneda extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 10, unique: true })
  codigo!: string;

  @Column({ type: 'nvarchar', length: 50 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 10 })
  simbolo!: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario | null;

  @OneToMany(() => Cuenta, (cuenta) => cuenta.moneda)
  cuentas!: Cuenta[];
}
