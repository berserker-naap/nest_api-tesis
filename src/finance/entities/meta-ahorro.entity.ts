import { Audit } from 'src/common/entity/audit';
import { Usuario } from 'src/security/entities/usuario.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cuenta } from './cuenta.entity';
import { Moneda } from './moneda.entity';

@Entity('META_AHORRO')
export class MetaAhorro extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @ManyToOne(() => Moneda, { nullable: false })
  @JoinColumn({ name: 'idMoneda' })
  moneda!: Moneda;

  @ManyToOne(() => Cuenta, { nullable: true })
  @JoinColumn({ name: 'idCuenta' })
  cuenta!: Cuenta | null;

  @Column({ type: 'nvarchar', length: 120 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  montoObjetivo!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  montoAhorrado!: number;

  @Column({ type: 'date' })
  fechaObjetivo!: Date;
}
