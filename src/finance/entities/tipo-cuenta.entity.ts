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
import { NaturalezaTipoCuenta } from '../enum/tipo-cuenta.enum';

@Entity('TIPO_CUENTA')
export class TipoCuenta extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 20 })
  naturaleza!: NaturalezaTipoCuenta;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario | null;

  @OneToMany(() => Cuenta, (cuenta) => cuenta.tipoCuenta)
  cuentas!: Cuenta[];
}
