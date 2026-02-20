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
import { SubcategoriaFinance } from './subcategoria-finance.entity';
import { Transaccion } from './transaccion.entity';
import { TipoCategoriaFinance } from '../enum/categoria-finance.enum';

@Entity('CATEGORIA_FINANCE')
export class CategoriaFinance extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 20 })
  tipo!: TipoCategoriaFinance;

  @Column({ type: 'nvarchar', length: 80 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 80, nullable: true })
  icono!: string | null;

  @Column({ type: 'nvarchar', length: 10, nullable: true })
  colorHex!: string | null;

  @Column({ type: 'int', nullable: true })
  orden!: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario | null;

  @OneToMany(() => SubcategoriaFinance, (subcategoria) => subcategoria.categoria)
  subcategorias!: SubcategoriaFinance[];

  @OneToMany(() => Transaccion, (transaccion) => transaccion.categoria)
  transacciones!: Transaccion[];
}
