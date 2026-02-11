import { Audit } from 'src/common/entity/audit';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CategoriaFinance } from './categoria-finance.entity';
import { Transaccion } from './transaccion.entity';

@Entity('SUBCATEGORIA_FINANCE')
export class SubcategoriaFinance extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CategoriaFinance, { nullable: false })
  @JoinColumn({ name: 'idCategoria' })
  categoria!: CategoriaFinance;

  @Column({ type: 'nvarchar', length: 80 })
  nombre!: string;

  @Column({ type: 'int', nullable: true })
  orden!: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario | null;

  @OneToMany(() => Transaccion, (transaccion) => transaccion.subcategoria)
  transacciones!: Transaccion[];
}
