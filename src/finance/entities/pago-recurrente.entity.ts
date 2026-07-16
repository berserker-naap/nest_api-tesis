import { Audit } from 'src/common/entity/audit';
import { Usuario } from 'src/security/entities/usuario.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CategoriaFinance } from './categoria-finance.entity';
import { Cuenta } from './cuenta.entity';

@Entity('PAGO_RECURRENTE')
export class PagoRecurrente extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;

  @ManyToOne(() => Cuenta, { nullable: false })
  @JoinColumn({ name: 'idCuenta' })
  cuenta!: Cuenta;

  @ManyToOne(() => CategoriaFinance, { nullable: false })
  @JoinColumn({ name: 'idCategoria' })
  categoria!: CategoriaFinance;

  @Column({ type: 'nvarchar', length: 160 })
  concepto!: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  monto!: number;

  @Column({ type: 'nvarchar', length: 15 })
  frecuencia!: 'SEMANAL' | 'MENSUAL' | 'ANUAL';

  @Column({ type: 'date' })
  proximaFecha!: Date;

  @Column({ type: 'tinyint', default: 3 })
  diasRecordatorio!: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  nota!: string | null;
}
