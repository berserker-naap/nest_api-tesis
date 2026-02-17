import { Audit } from 'src/common/entity/audit';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';
import { ReniecData } from './reniec-data.entity';
import { ProfileValidationStatus } from '../enums/profile-validation-status.enum';
import { ProfilePhone } from './profile-phone.entity';

@Entity('PROFILE')
export class Profile extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 100 })
  nombres!: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  apellidos!: string | null;

  @ManyToOne(() => Multitabla)
  @JoinColumn({ name: 'idTipoDocumentoIdentidad' })
  tipoDocumento!: Multitabla;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  documentoIdentidad!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  fotoPerfilUrl!: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  nombreFotoPerfil!: string | null;

  @Column({ type: 'datetime', nullable: true })
  fechaCargaFotoPerfil!: Date | null;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento!: Date  | null;

  @Column({ type: 'datetime', nullable: true })
  fechaVerificacion!: Date | null;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: ProfileValidationStatus.PENDING,
  })
  validacionEstado!: ProfileValidationStatus;

  @OneToOne(() => ReniecData, (reniecData) => reniecData.profile, { nullable: true })
  @JoinColumn({ name: 'idReniecData' })
  reniecData!: ReniecData | null;

  @OneToMany(() => ProfilePhone, (profilePhone) => profilePhone.profile)
  profilePhones!: ProfilePhone[];
}
