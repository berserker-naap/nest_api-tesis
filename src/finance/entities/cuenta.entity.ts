import { Audit } from 'src/common/entity/audit';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Moneda } from './moneda.entity';
import { TipoCuenta } from './tipo-cuenta.entity';
import { EntidadFinanciera } from './entidad-financiera.entity';
import { Transaccion } from './transaccion.entity';

@Entity('CUENTA')
@Unique('UQ_CUENTA_USUARIO_ALIAS', ['usuario', 'alias'])
@Index('IDX_CUENTA_USUARIO_ACTIVO_ELIMINADO', ['usuario', 'activo', 'eliminado'])
export class Cuenta extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @ManyToOne(() => Moneda, { nullable: false })
  @JoinColumn({ name: 'idMoneda' })
  moneda!: Moneda;

  @ManyToOne(() => TipoCuenta, { nullable: false })
  @JoinColumn({ name: 'idTipoCuenta' })
  tipoCuenta!: TipoCuenta;

  @ManyToOne(() => EntidadFinanciera, { nullable: true })
  @JoinColumn({ name: 'idEntidadFinanciera' })
  entidadFinanciera!: EntidadFinanciera | null;

  @Column({ type: 'nvarchar', length: 100 })
  alias!: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  saldoActual!: number;

  @OneToMany(() => Transaccion, (transaccion) => transaccion.cuenta)
  transacciones!: Transaccion[];
}
