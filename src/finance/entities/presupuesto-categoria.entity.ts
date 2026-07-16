import { Audit } from 'src/common/entity/audit';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CategoriaFinance } from './categoria-finance.entity';
import { Moneda } from './moneda.entity';

@Entity('PRESUPUESTO_CATEGORIA')
@Unique('UQ_PRESUPUESTO_USUARIO_CATEGORIA_MONEDA_PERIODO', [
  'usuario',
  'categoria',
  'moneda',
  'periodo',
])
export class PresupuestoCategoria extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @ManyToOne(() => CategoriaFinance, { nullable: false })
  @JoinColumn({ name: 'idCategoria' })
  categoria!: CategoriaFinance;

  @ManyToOne(() => Moneda, { nullable: false })
  @JoinColumn({ name: 'idMoneda' })
  moneda!: Moneda;

  @Column({ type: 'char', length: 7 })
  periodo!: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  montoLimite!: number;
}
