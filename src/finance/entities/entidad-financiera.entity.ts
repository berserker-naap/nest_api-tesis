import { Audit } from 'src/common/entity/audit';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Cuenta } from './cuenta.entity';
import { Usuario } from 'src/security/entities/usuario.entity';
import { TipoEntidadFinanciera } from '../enum/entidad-financiera.enum';

@Entity('ENTIDAD_FINANCIERA')
export class EntidadFinanciera extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 120, unique: true })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 20 })
  tipo!: TipoEntidadFinanciera;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  iconoUrl!: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario | null;

  @OneToMany(() => Cuenta, (cuenta) => cuenta.entidadFinanciera)
  cuentas!: Cuenta[];
}

