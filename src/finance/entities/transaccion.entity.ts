import { Audit } from 'src/common/entity/audit';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cuenta } from './cuenta.entity';
import { CategoriaFinance } from './categoria-finance.entity';
import { SubcategoriaFinance } from './subcategoria-finance.entity';

@Entity('TRANSACCION')
@Index('IDX_TRANSACCION_CUENTA_FECHA', ['cuenta', 'fecha'])
@Index('IDX_TRANSACCION_USUARIO_FECHA', ['usuario', 'fecha'])
@Index('UQ_TRANSACCION_USUARIO_EXTERNAL_MESSAGE', ['usuario', 'externalMessageId'], {
  unique: true,
  where: '[externalMessageId] IS NOT NULL',
})
export class Transaccion extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @ManyToOne(() => Cuenta, { nullable: false })
  @JoinColumn({ name: 'idCuenta' })
  cuenta!: Cuenta;

  @Column({ type: 'nvarchar', length: 20 })
  tipo!: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA' | 'AJUSTE';

  @ManyToOne(() => CategoriaFinance, { nullable: true })
  @JoinColumn({ name: 'idCategoria' })
  categoria!: CategoriaFinance | null;

  @ManyToOne(() => SubcategoriaFinance, { nullable: true })
  @JoinColumn({ name: 'idSubcategoria' })
  subcategoria!: SubcategoriaFinance | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  monto!: number;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  fecha!: Date;

  @Column({ type: 'nvarchar', length: 250 })
  concepto!: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  comprobanteUrl!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  nota!: string | null;

  @Column({ type: 'nvarchar', length: 120, nullable: true })
  externalMessageId!: string | null;

  @Column({ type: 'nvarchar', length: 20 })
  origen!: 'APERTURA' | 'MANUAL' | 'IMPORTACION';
}
